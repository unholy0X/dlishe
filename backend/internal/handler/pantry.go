package handler

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/dishflow/backend/internal/middleware"
	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/pkg/response"
	"github.com/dishflow/backend/internal/service/ai"
)

// PantryHandler handles pantry-related HTTP requests
type PantryHandler struct {
	repo    PantryRepository
	scanner ai.PantryScanner
}

// NewPantryHandler creates a new pantry handler
func NewPantryHandler(repo PantryRepository, scanner ai.PantryScanner) *PantryHandler {
	return &PantryHandler{
		repo:    repo,
		scanner: scanner,
	}
}

// List handles GET /api/v1/pantry
// @Summary List pantry items
// @Description Get paginated list of user's pantry items with optional category filter
// @Tags Pantry
// @Produce json
// @Security BearerAuth
// @Param category query string false "Filter by category" Enums(dairy, produce, proteins, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other)
// @Param limit query int false "Items per page (max 200)" default(100)
// @Param offset query int false "Pagination offset" default(0)
// @Success 200 {object} SwaggerPantryListResponse "List of pantry items"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /pantry [get]
func (h *PantryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Optional category filter - normalize if provided
	category := r.URL.Query().Get("category")
	var categoryPtr *string
	if category != "" {
		normalized := model.NormalizeCategory(category)
		categoryPtr = &normalized
	}

	// Pagination with SQL (no more in-memory slicing)
	limit := 100
	offset := 0

	if l := r.URL.Query().Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil && val > 0 && val <= 200 {
			limit = val
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if val, err := strconv.Atoi(o); err == nil && val >= 0 {
			offset = val
		}
	}

	// SQL-based pagination - efficient for large datasets
	items, total, err := h.repo.List(ctx, user.ID, categoryPtr, limit, offset)
	if err != nil {
		response.InternalError(w)
		return
	}

	// Group items by category (DB already orders by category ASC, name ASC)
	type categoryGroup struct {
		Category string              `json:"category"`
		Items    []*model.PantryItem `json:"items"`
		Count    int                 `json:"count"`
	}

	groupMap := make(map[string]*categoryGroup)
	var groupOrder []string

	for _, item := range items {
		cat := item.Category
		if g, ok := groupMap[cat]; ok {
			g.Items = append(g.Items, item)
			g.Count++
		} else {
			groupMap[cat] = &categoryGroup{
				Category: cat,
				Items:    []*model.PantryItem{item},
				Count:    1,
			}
			groupOrder = append(groupOrder, cat)
		}
	}

	groups := make([]categoryGroup, 0, len(groupOrder))
	for _, cat := range groupOrder {
		groups = append(groups, *groupMap[cat])
	}

	response.OK(w, map[string]interface{}{
		"groups": groups,
		"total":  total,
		"count":  len(items),
		"limit":  limit,
		"offset": offset,
	})
}

// Get handles GET /api/v1/pantry/{id}
// @Summary Get pantry item by ID
// @Description Get a single pantry item's details
// @Tags Pantry
// @Produce json
// @Security BearerAuth
// @Param id path string true "Pantry item UUID"
// @Success 200 {object} SwaggerPantryItem "Pantry item details"
// @Failure 400 {object} SwaggerErrorResponse "Invalid item ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Pantry item not found"
// @Router /pantry/{id} [get]
func (h *PantryHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	item, err := h.repo.Get(ctx, id, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// Create handles POST /api/v1/pantry
// @Summary Create a pantry item
// @Description Add a new item to the user's pantry inventory
// @Tags Pantry
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body SwaggerPantryItemInput true "Pantry item data"
// @Success 201 {object} SwaggerPantryItem "Pantry item created"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 500 {object} SwaggerErrorResponse "Internal server error"
// @Router /pantry [post]
func (h *PantryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	var input model.PantryItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.LogAndBadRequest(w, "Invalid pantry item data", err)
		return
	}

	// Normalize category before saving (maps aliases to canonical categories)
	input.NormalizeInput()

	item, err := h.repo.Create(ctx, user.ID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, item)
}

// Update handles PUT /api/v1/pantry/{id}
// @Summary Update a pantry item
// @Description Update an existing pantry item's details
// @Tags Pantry
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Pantry item UUID"
// @Param request body SwaggerPantryItemInput true "Updated pantry item data"
// @Success 200 {object} SwaggerPantryItem "Pantry item updated"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request body"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Pantry item not found"
// @Router /pantry/{id} [put]
func (h *PantryHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	var input model.PantryItemInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Invalid request body")
		return
	}

	if err := input.Validate(); err != nil {
		if valErr, ok := err.(model.ErrValidation); ok {
			response.ValidationFailed(w, valErr.Field, valErr.Reason)
			return
		}
		response.LogAndBadRequest(w, "Invalid pantry item data", err)
		return
	}

	// Normalize category before saving (maps aliases to canonical categories)
	input.NormalizeInput()

	item, err := h.repo.Update(ctx, id, user.ID, &input)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, item)
}

// Delete handles DELETE /api/v1/pantry/{id}
// @Summary Delete a pantry item
// @Description Remove an item from the user's pantry
// @Tags Pantry
// @Security BearerAuth
// @Param id path string true "Pantry item UUID"
// @Success 204 "Pantry item deleted"
// @Failure 400 {object} SwaggerErrorResponse "Invalid item ID"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 404 {object} SwaggerErrorResponse "Pantry item not found"
// @Router /pantry/{id} [delete]
func (h *PantryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	err = h.repo.Delete(ctx, id, user.ID)
	if err == model.ErrNotFound {
		response.NotFound(w, "Pantry item")
		return
	}
	if err != nil {
		response.InternalError(w)
		return
	}

	response.NoContent(w)
}

// ScanRequest represents the request body for JSON-based scan
type ScanRequest struct {
	ImageBase64 string `json:"imageBase64"`
	MimeType    string `json:"mimeType,omitempty"`
	AutoAdd     bool   `json:"autoAdd,omitempty"` // Auto-add detected items to pantry
}

// ScanResponse represents the response from pantry scan
type ScanResponse struct {
	Items      []ScannedItemResponse `json:"items"`
	AddedCount int                   `json:"addedCount,omitempty"` // Number of items added if autoAdd
	AddedIDs   []string              `json:"addedIds,omitempty"`   // IDs of added items
	Confidence float64               `json:"confidence"`
	Notes      string                `json:"notes"`
}

// ScannedItemResponse represents a detected item
type ScannedItemResponse struct {
	Name       string   `json:"name"`
	Category   string   `json:"category"`
	Quantity   *float64 `json:"quantity,omitempty"`
	Unit       *string  `json:"unit,omitempty"`
	Confidence float64  `json:"confidence"`
	Added      bool     `json:"added,omitempty"` // Whether it was added to pantry
	AddedID    *string  `json:"addedId,omitempty"`
}

// Scan handles POST /api/v1/pantry/scan
// @Summary AI-powered pantry scan
// @Description Scan image to detect and optionally add pantry items using AI
// @Tags Pantry
// @Accept multipart/form-data,application/json
// @Produce json
// @Security BearerAuth
// @Param image formData file false "Image file (multipart)"
// @Param autoAdd formData bool false "Auto-add detected items" default(false)
// @Param request body SwaggerPantryScanRequest false "JSON with base64 image"
// @Success 200 {object} SwaggerScanResponse "Scan results"
// @Failure 400 {object} SwaggerErrorResponse "Invalid request"
// @Failure 401 {object} SwaggerErrorResponse "Unauthorized"
// @Failure 422 {object} SwaggerErrorResponse "Scan failed"
// @Failure 429 {object} SwaggerErrorResponse "Rate limit exceeded"
// @Failure 503 {object} SwaggerErrorResponse "Service unavailable"
// @Router /pantry/scan [post]
func (h *PantryHandler) Scan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := middleware.GetUserFromContext(ctx)
	if user == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Check if scanner is available
	if h.scanner == nil {
		response.ErrorJSON(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE",
			"Pantry scanning service is not available", nil)
		return
	}

	var imageData []byte
	var mimeType string
	var autoAdd bool

	// Check content type to determine how image is sent
	contentType := r.Header.Get("Content-Type")

	if strings.HasPrefix(contentType, "multipart/form-data") {
		// Handle multipart form upload
		if err := r.ParseMultipartForm(10 << 20); err != nil { // 10MB max
			response.LogAndBadRequest(w, "Failed to parse image upload", err)
			return
		}
		defer r.MultipartForm.RemoveAll() // Cleanup temp files

		file, header, err := r.FormFile("image")
		if err != nil {
			response.ValidationFailed(w, "image", "Image file is required")
			return
		}
		defer file.Close()

		imageData, err = io.ReadAll(file)
		if err != nil {
			response.BadRequest(w, "Failed to read image file")
			return
		}

		mimeType = header.Header.Get("Content-Type")
		if mimeType == "" {
			mimeType = detectMimeType(imageData)
		}

		autoAdd = r.FormValue("autoAdd") == "true"

	} else if strings.HasPrefix(contentType, "application/json") {
		// Handle JSON with base64 image
		var req ScanRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			response.BadRequest(w, "Invalid request body")
			return
		}

		if req.ImageBase64 == "" {
			response.ValidationFailed(w, "imageBase64", "Image data is required")
			return
		}

		var err error
		imageData, err = base64.StdEncoding.DecodeString(req.ImageBase64)
		if err != nil {
			response.ValidationFailed(w, "imageBase64", "Invalid base64 encoding")
			return
		}

		mimeType = req.MimeType
		if mimeType == "" {
			mimeType = detectMimeType(imageData)
		}
		autoAdd = req.AutoAdd
	} else {
		response.BadRequest(w, "Content-Type must be multipart/form-data or application/json")
		return
	}

	// Validate image data
	if len(imageData) == 0 {
		response.ValidationFailed(w, "image", "Image data is empty")
		return
	}

	if len(imageData) > 10*1024*1024 {
		response.ValidationFailed(w, "image", "Image size exceeds 10MB limit")
		return
	}

	// Validate mime type
	validTypes := map[string]bool{
		"image/jpeg": true,
		"image/png":  true,
		"image/webp": true,
		"image/gif":  true,
	}
	if !validTypes[mimeType] {
		response.ValidationFailed(w, "mimeType", "Unsupported image type. Use JPEG, PNG, WebP, or GIF")
		return
	}

	// Call AI to scan the image
	result, err := h.scanner.ScanPantry(ctx, imageData, mimeType)
	if err != nil {
		response.LogAndServiceError(w, "SCAN_FAILED", "Failed to scan pantry image", err)
		return
	}

	// Build response
	resp := ScanResponse{
		Items:      make([]ScannedItemResponse, 0, len(result.Items)),
		Confidence: result.Confidence,
		Notes:      result.Notes,
	}

	var addedIDs []string

	for _, item := range result.Items {
		scannedItem := ScannedItemResponse{
			Name:       item.Name,
			Category:   item.Category,
			Quantity:   item.Quantity,
			Unit:       item.Unit,
			Confidence: item.Confidence,
		}

		// Auto-add to pantry if requested and confidence is high enough
		if autoAdd && item.Confidence >= 0.7 {
			// Validate and normalize category
			item.Category = model.NormalizeCategory(item.Category)

			input := &model.PantryItemInput{
				Name:     item.Name,
				Category: item.Category,
				Quantity: item.Quantity,
				Unit:     item.Unit,
			}

			added, err := h.repo.Create(ctx, user.ID, input)
			if err == nil {
				scannedItem.Added = true
				idStr := added.ID.String()
				scannedItem.AddedID = &idStr
				addedIDs = append(addedIDs, idStr)
			}
		}

		resp.Items = append(resp.Items, scannedItem)
	}

	if autoAdd {
		resp.AddedCount = len(addedIDs)
		resp.AddedIDs = addedIDs
	}

	response.OK(w, resp)
}
