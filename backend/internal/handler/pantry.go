package handler

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

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
func (h *PantryHandler) List(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Optional category filter
	category := r.URL.Query().Get("category")
	var categoryPtr *string
	if category != "" {
		categoryPtr = &category
	}

	items, err := h.repo.List(ctx, claims.UserID, categoryPtr)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": items,
		"count": len(items),
	})
}

// Get handles GET /api/v1/pantry/{id}
func (h *PantryHandler) Get(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	item, err := h.repo.Get(ctx, id, claims.UserID)
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
func (h *PantryHandler) Create(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
		response.BadRequest(w, err.Error())
		return
	}

	item, err := h.repo.Create(ctx, claims.UserID, &input)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.Created(w, item)
}

// Update handles PUT /api/v1/pantry/{id}
func (h *PantryHandler) Update(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
		response.BadRequest(w, err.Error())
		return
	}

	item, err := h.repo.Update(ctx, id, claims.UserID, &input)
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
func (h *PantryHandler) Delete(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		response.BadRequest(w, "Invalid item ID")
		return
	}

	err = h.repo.Delete(ctx, id, claims.UserID)
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

// GetExpiring handles GET /api/v1/pantry/expiring
func (h *PantryHandler) GetExpiring(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
		response.Unauthorized(w, "Authentication required")
		return
	}

	// Default to 7 days
	days := 7
	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 && d <= 365 {
			days = d
		}
	}

	items, err := h.repo.GetExpiring(ctx, claims.UserID, days)
	if err != nil {
		response.InternalError(w)
		return
	}

	response.OK(w, map[string]interface{}{
		"items": items,
		"count": len(items),
		"days":  days,
	})
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
	Name           string   `json:"name"`
	Category       string   `json:"category"`
	Quantity       *float64 `json:"quantity,omitempty"`
	Unit           *string  `json:"unit,omitempty"`
	ExpirationDate *string  `json:"expirationDate,omitempty"` // ISO date if calculated
	Confidence     float64  `json:"confidence"`
	Added          bool     `json:"added,omitempty"` // Whether it was added to pantry
	AddedID        *string  `json:"addedId,omitempty"`
}

// Scan handles POST /api/v1/pantry/scan
// Scans an image to detect pantry items using AI
func (h *PantryHandler) Scan(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.GetClaims(ctx)
	if claims == nil {
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
			response.BadRequest(w, "Failed to parse multipart form: "+err.Error())
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
		response.ErrorJSON(w, http.StatusUnprocessableEntity, "SCAN_FAILED",
			"Failed to scan image: "+err.Error(), nil)
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

		// Calculate expiration date if provided
		if item.ExpirationDays != nil && *item.ExpirationDays > 0 {
			expDate := time.Now().AddDate(0, 0, *item.ExpirationDays).Format("2006-01-02")
			scannedItem.ExpirationDate = &expDate
		}

		// Auto-add to pantry if requested and confidence is high enough
		if autoAdd && item.Confidence >= 0.7 {
			// Validate category
			if !isValidPantryCategory(item.Category) {
				item.Category = "other"
			}

			var expTime *time.Time
			if item.ExpirationDays != nil && *item.ExpirationDays > 0 {
				t := time.Now().AddDate(0, 0, *item.ExpirationDays)
				expTime = &t
			}

			input := &model.PantryItemInput{
				Name:           item.Name,
				Category:       item.Category,
				Quantity:       item.Quantity,
				Unit:           item.Unit,
				ExpirationDate: expTime,
			}

			added, err := h.repo.Create(ctx, claims.UserID, input)
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

// isValidPantryCategory checks if a category is valid for pantry items
func isValidPantryCategory(category string) bool {
	validCategories := map[string]bool{
		"produce": true, "proteins": true, "dairy": true, "grains": true,
		"pantry": true, "spices": true, "condiments": true, "beverages": true,
		"frozen": true, "canned": true, "baking": true, "other": true,
	}
	return validCategories[category]
}
