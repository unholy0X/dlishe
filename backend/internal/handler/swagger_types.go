package handler

import "time"

// This file contains types used for Swagger documentation.
// These types provide explicit examples and descriptions for API documentation.
// Actual handler implementations may use inline structs or model types.

// ============================================================================
// Common Response Types
// ============================================================================

// SwaggerErrorResponse represents a standard API error response
// @Description Standard error response format
type SwaggerErrorResponse struct {
	Error SwaggerError `json:"error"`
}

// SwaggerError contains error details
type SwaggerError struct {
	Code      string                 `json:"code" example:"VALIDATION_FAILED"`
	Message   string                 `json:"message" example:"Validation failed"`
	Details   map[string]interface{} `json:"details,omitempty"`
	RequestID string                 `json:"requestId,omitempty" example:"req-abc123"`
	Timestamp string                 `json:"timestamp,omitempty" example:"2024-02-01T10:30:00Z"`
}

// SwaggerPaginatedResponse represents a paginated list response wrapper
// @Description Paginated list response wrapper
type SwaggerPaginatedResponse struct {
	Items  interface{} `json:"items"`
	Total  int         `json:"total" example:"100"`
	Count  int         `json:"count" example:"20"`
	Limit  int         `json:"limit" example:"20"`
	Offset int         `json:"offset" example:"0"`
}

// ============================================================================
// Auth Types
// ============================================================================

// SwaggerRegisterRequest represents user registration input
// @Description User registration request
type SwaggerRegisterRequest struct {
	Email    string `json:"email" example:"user@example.com" binding:"required"`
	Password string `json:"password" example:"securepassword123" binding:"required,min=8"`
	Name     string `json:"name,omitempty" example:"John Doe"`
}

// SwaggerLoginRequest represents user login input
// @Description User login request
type SwaggerLoginRequest struct {
	Email    string `json:"email" example:"user@example.com" binding:"required"`
	Password string `json:"password" example:"securepassword123" binding:"required"`
}

// SwaggerAnonymousRequest represents anonymous auth request
// @Description Anonymous authentication request
type SwaggerAnonymousRequest struct {
	DeviceID string `json:"deviceId,omitempty" example:"device-abc123"`
}

// SwaggerRefreshRequest represents token refresh request
// @Description Token refresh request
type SwaggerRefreshRequest struct {
	RefreshToken string `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIs..." binding:"required"`
}

// SwaggerLogoutRequest represents logout request
// @Description Logout request
type SwaggerLogoutRequest struct {
	RefreshToken string `json:"refreshToken,omitempty" example:"eyJhbGciOiJIUzI1NiIs..."`
	RevokeAll    bool   `json:"revokeAll,omitempty" example:"false"`
}

// SwaggerUserResponse represents user data in responses
// @Description User data
type SwaggerUserResponse struct {
	ID          string  `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Email       *string `json:"email,omitempty" example:"user@example.com"`
	Name        *string `json:"name,omitempty" example:"John Doe"`
	IsAnonymous bool    `json:"isAnonymous" example:"false"`
	CreatedAt   string  `json:"createdAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerAuthResponse represents successful authentication response
// @Description Authentication response with tokens
type SwaggerAuthResponse struct {
	User         SwaggerUserResponse `json:"user"`
	AccessToken  string              `json:"accessToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string              `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	ExpiresAt    string              `json:"expiresAt" example:"2024-02-01T10:45:00Z"`
	TokenType    string              `json:"tokenType" example:"Bearer"`
}

// SwaggerAnonymousResponse represents anonymous auth response
// @Description Anonymous authentication response
type SwaggerAnonymousResponse struct {
	User         SwaggerUserResponse `json:"user"`
	AccessToken  string              `json:"accessToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string              `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	ExpiresAt    string              `json:"expiresAt" example:"2024-02-01T10:45:00Z"`
	TokenType    string              `json:"tokenType" example:"Bearer"`
	IsNewUser    bool                `json:"isNewUser" example:"true"`
}

// SwaggerRefreshResponse represents token refresh response
// @Description Token refresh response
type SwaggerRefreshResponse struct {
	AccessToken  string `json:"accessToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	RefreshToken string `json:"refreshToken" example:"eyJhbGciOiJIUzI1NiIs..."`
	ExpiresAt    string `json:"expiresAt" example:"2024-02-01T10:45:00Z"`
	TokenType    string `json:"tokenType" example:"Bearer"`
}

// SwaggerMeResponse represents current user response
// @Description Current user with subscription info
type SwaggerMeResponse struct {
	User         SwaggerUserResponse         `json:"user"`
	Subscription SwaggerSubscriptionResponse `json:"subscription"`
}

// SwaggerSubscriptionResponse represents subscription info
// @Description User subscription details
type SwaggerSubscriptionResponse struct {
	Entitlement string  `json:"entitlement" example:"free"`
	ExpiresAt   *string `json:"expiresAt,omitempty" example:"2025-02-01T10:30:00Z"`
}

// ============================================================================
// Recipe Types
// ============================================================================

// SwaggerRecipeIngredient represents a recipe ingredient
// @Description Recipe ingredient
type SwaggerRecipeIngredient struct {
	ID             string   `json:"id" example:"550e8400-e29b-41d4-a716-446655440001"`
	RecipeID       string   `json:"recipeId" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name           string   `json:"name" example:"Olive oil"`
	Quantity       *float64 `json:"quantity,omitempty" example:"2"`
	Unit           *string  `json:"unit,omitempty" example:"tablespoons"`
	Category       string   `json:"category" example:"condiments" enums:"dairy,produce,proteins,bakery,pantry,spices,condiments,beverages,snacks,frozen,household,other"`
	IsOptional     bool     `json:"isOptional" example:"false"`
	Notes          *string  `json:"notes,omitempty" example:"extra virgin preferred"`
	VideoTimestamp *int     `json:"videoTimestamp,omitempty" example:"120"`
	SortOrder      int      `json:"sortOrder" example:"0"`
	CreatedAt      string   `json:"createdAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerRecipeStep represents a recipe step
// @Description Recipe step
type SwaggerRecipeStep struct {
	ID                  string  `json:"id" example:"550e8400-e29b-41d4-a716-446655440002"`
	RecipeID            string  `json:"recipeId" example:"550e8400-e29b-41d4-a716-446655440000"`
	StepNumber          int     `json:"stepNumber" example:"1"`
	Instruction         string  `json:"instruction" example:"Heat olive oil in a large pan over medium heat"`
	DurationSeconds     *int    `json:"durationSeconds,omitempty" example:"120"`
	Technique           *string `json:"technique,omitempty" example:"sauteing"`
	Temperature         *string `json:"temperature,omitempty" example:"350F"`
	VideoTimestampStart *int    `json:"videoTimestampStart,omitempty" example:"60"`
	VideoTimestampEnd   *int    `json:"videoTimestampEnd,omitempty" example:"180"`
	CreatedAt           string  `json:"createdAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerRecipe represents a full recipe
// @Description Full recipe with ingredients and steps
type SwaggerRecipe struct {
	ID             string                    `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID         string                    `json:"userId" example:"550e8400-e29b-41d4-a716-446655440099"`
	Title          string                    `json:"title" example:"Spaghetti Carbonara"`
	Description    *string                   `json:"description,omitempty" example:"Classic Italian pasta dish"`
	Servings       *int                      `json:"servings,omitempty" example:"4"`
	PrepTime       *int                      `json:"prepTime,omitempty" example:"15"`
	CookTime       *int                      `json:"cookTime,omitempty" example:"20"`
	Difficulty     *string                   `json:"difficulty,omitempty" example:"medium" enums:"easy,medium,hard"`
	Cuisine        *string                   `json:"cuisine,omitempty" example:"Italian"`
	ThumbnailURL   *string                   `json:"thumbnailUrl,omitempty" example:"https://example.com/thumb.jpg"`
	SourceType     string                    `json:"sourceType" example:"manual" enums:"manual,video,ai,photo,webpage,image"`
	SourceURL      *string                   `json:"sourceUrl,omitempty" example:"https://youtube.com/watch?v=xyz"`
	Tags           []string                  `json:"tags,omitempty" example:"italian,pasta,quick"`
	IsFavorite     bool                      `json:"isFavorite" example:"false"`
	SyncVersion    int                       `json:"syncVersion" example:"1"`
	CreatedAt      string                    `json:"createdAt" example:"2024-02-01T10:30:00Z"`
	UpdatedAt      string                    `json:"updatedAt" example:"2024-02-01T10:30:00Z"`
	Ingredients    []SwaggerRecipeIngredient `json:"ingredients,omitempty"`
	Steps          []SwaggerRecipeStep       `json:"steps,omitempty"`
}

// SwaggerRecipeListResponse represents paginated recipe list
// @Description Paginated list of recipes
type SwaggerRecipeListResponse struct {
	Items  []SwaggerRecipe `json:"items"`
	Total  int             `json:"total" example:"25"`
	Limit  int             `json:"limit" example:"20"`
	Offset int             `json:"offset" example:"0"`
}

// SwaggerFavoriteRequest represents toggle favorite request
// @Description Toggle favorite request
type SwaggerFavoriteRequest struct {
	IsFavorite bool `json:"isFavorite" example:"true"`
}

// SwaggerFavoriteResponse represents toggle favorite response
// @Description Toggle favorite response
type SwaggerFavoriteResponse struct {
	Success    bool `json:"success" example:"true"`
	IsFavorite bool `json:"isFavorite" example:"true"`
}

// ============================================================================
// Extraction Types
// ============================================================================

// SwaggerExtractURLRequest represents URL extraction request
// @Description Extract recipe from URL request
type SwaggerExtractURLRequest struct {
	URL      string `json:"url" example:"https://example.com/recipe/carbonara" binding:"required"`
	SaveAuto bool   `json:"saveAuto,omitempty" example:"true"`
}

// SwaggerExtractImageRequest represents image extraction request (JSON)
// @Description Extract recipe from image request
type SwaggerExtractImageRequest struct {
	ImageBase64 string `json:"imageBase64" example:"/9j/4AAQSkZJRgABAQ..." binding:"required"`
	MimeType    string `json:"mimeType,omitempty" example:"image/jpeg"`
	SaveAuto    bool   `json:"saveAuto,omitempty" example:"true"`
}

// SwaggerExtractedIngredient represents an extracted ingredient
// @Description AI-extracted ingredient
type SwaggerExtractedIngredient struct {
	Name           string  `json:"name" example:"Spaghetti"`
	Quantity       string  `json:"quantity" example:"400"`
	Unit           string  `json:"unit" example:"g"`
	Category       string  `json:"category" example:"pantry"`
	IsOptional     bool    `json:"isOptional" example:"false"`
	Notes          string  `json:"notes,omitempty" example:"dried pasta"`
	VideoTimestamp float64 `json:"videoTimestamp,omitempty" example:"1.5"`
}

// SwaggerExtractedStep represents an extracted recipe step
// @Description AI-extracted recipe step
type SwaggerExtractedStep struct {
	StepNumber          int     `json:"stepNumber" example:"1"`
	Instruction         string  `json:"instruction" example:"Boil pasta according to package directions"`
	DurationSeconds     int     `json:"durationSeconds,omitempty" example:"600"`
	Technique           string  `json:"technique,omitempty" example:"boiling"`
	Temperature         string  `json:"temperature,omitempty" example:""`
	VideoTimestampStart float64 `json:"videoTimestampStart,omitempty" example:"0.5"`
	VideoTimestampEnd   float64 `json:"videoTimestampEnd,omitempty" example:"2.0"`
}

// SwaggerExtractionResult represents AI extraction result
// @Description AI-extracted recipe data
type SwaggerExtractionResult struct {
	Title        string                       `json:"title" example:"Spaghetti Carbonara"`
	Description  string                       `json:"description" example:"Classic Roman pasta dish"`
	Servings     int                          `json:"servings" example:"4"`
	PrepTime     int                          `json:"prepTime" example:"10"`
	CookTime     int                          `json:"cookTime" example:"20"`
	Difficulty   string                       `json:"difficulty" example:"medium"`
	Cuisine      string                       `json:"cuisine" example:"Italian"`
	Tags         []string                     `json:"tags" example:"pasta,italian,quick"`
	Ingredients  []SwaggerExtractedIngredient `json:"ingredients"`
	Steps        []SwaggerExtractedStep       `json:"steps"`
	ThumbnailURL string                       `json:"thumbnailUrl,omitempty" example:"https://example.com/thumb.jpg"`
}

// SwaggerExtractURLResponse represents URL extraction response
// @Description URL extraction response
type SwaggerExtractURLResponse struct {
	Recipe        *SwaggerExtractionResult `json:"recipe"`
	SavedID       *string                  `json:"savedId,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	AlreadyExists bool                     `json:"alreadyExists" example:"false"`
	Source        string                   `json:"source" example:"webpage"`
}

// SwaggerExtractImageResponse represents image extraction response
// @Description Image extraction response
type SwaggerExtractImageResponse struct {
	Recipe  *SwaggerExtractionResult `json:"recipe"`
	SavedID *string                  `json:"savedId,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
	Source  string                   `json:"source" example:"image"`
}

// ============================================================================
// Video/Job Types
// ============================================================================

// SwaggerVideoExtractRequest represents video extraction request
// @Description Video extraction request
type SwaggerVideoExtractRequest struct {
	VideoURL    string `json:"videoUrl" example:"https://youtube.com/watch?v=abc123" binding:"required"`
	Language    string `json:"language,omitempty" example:"en" enums:"en,fr,es,auto"`
	DetailLevel string `json:"detailLevel,omitempty" example:"detailed" enums:"quick,detailed"`
}

// SwaggerJobError represents job error details
// @Description Job error information
type SwaggerJobError struct {
	Code      string `json:"code" example:"DOWNLOAD_FAILED"`
	Message   string `json:"message" example:"Failed to download video"`
	Retryable bool   `json:"retryable" example:"true"`
}

// SwaggerJobResponse represents job status response
// @Description Video extraction job status
type SwaggerJobResponse struct {
	JobID            string           `json:"jobId" example:"550e8400-e29b-41d4-a716-446655440000"`
	Status           string           `json:"status" example:"processing" enums:"pending,downloading,processing,extracting,completed,failed,cancelled"`
	Progress         int              `json:"progress" example:"45"`
	Message          string           `json:"message,omitempty" example:"Downloading video..."`
	StatusURL        string           `json:"statusUrl,omitempty" example:"/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000"`
	StreamURL        string           `json:"streamUrl,omitempty" example:"/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/stream"`
	EstimatedSeconds int              `json:"estimatedSeconds,omitempty" example:"45"`
	Recipe           *SwaggerRecipe   `json:"recipe,omitempty"`
	Error            *SwaggerJobError `json:"error,omitempty"`
	CreatedAt        string           `json:"createdAt" example:"2024-02-01T10:30:00Z"`
	CompletedAt      *string          `json:"completedAt,omitempty" example:"2024-02-01T10:31:30Z"`
}

// SwaggerJobListResponse represents list of jobs
// @Description List of video extraction jobs
type SwaggerJobListResponse []SwaggerJobResponse

// ============================================================================
// Pantry Types
// ============================================================================

// SwaggerPantryItem represents a pantry item
// @Description Pantry inventory item
type SwaggerPantryItem struct {
	ID             string     `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID         string     `json:"userId" example:"550e8400-e29b-41d4-a716-446655440099"`
	Name           string     `json:"name" example:"Olive Oil"`
	Category       string     `json:"category" example:"condiments" enums:"dairy,produce,proteins,bakery,pantry,spices,condiments,beverages,snacks,frozen,household,other"`
	Quantity       *float64   `json:"quantity,omitempty" example:"500"`
	Unit           *string    `json:"unit,omitempty" example:"ml"`
	ExpirationDate *time.Time `json:"expirationDate,omitempty" example:"2024-06-01T00:00:00Z"`
	SyncVersion    int        `json:"syncVersion" example:"1"`
	CreatedAt      string     `json:"createdAt" example:"2024-02-01T10:30:00Z"`
	UpdatedAt      string     `json:"updatedAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerPantryItemInput represents pantry item create/update input
// @Description Pantry item input for create/update
type SwaggerPantryItemInput struct {
	Name           string     `json:"name" example:"Olive Oil" binding:"required"`
	Category       string     `json:"category" example:"condiments" binding:"required" enums:"dairy,produce,proteins,bakery,pantry,spices,condiments,beverages,snacks,frozen,household,other"`
	Quantity       *float64   `json:"quantity,omitempty" example:"500"`
	Unit           *string    `json:"unit,omitempty" example:"ml"`
	ExpirationDate *time.Time `json:"expirationDate,omitempty" example:"2024-06-01T00:00:00Z"`
}

// SwaggerPantryListResponse represents paginated pantry list
// @Description Paginated list of pantry items
type SwaggerPantryListResponse struct {
	Items  []SwaggerPantryItem `json:"items"`
	Total  int                 `json:"total" example:"50"`
	Count  int                 `json:"count" example:"20"`
	Limit  int                 `json:"limit" example:"100"`
	Offset int                 `json:"offset" example:"0"`
}

// SwaggerPantryExpiringResponse represents expiring items response
// @Description List of expiring pantry items
type SwaggerPantryExpiringResponse struct {
	Items []SwaggerPantryItem `json:"items"`
	Count int                 `json:"count" example:"5"`
	Days  int                 `json:"days" example:"7"`
}

// SwaggerPantryScanRequest represents pantry scan request (JSON)
// @Description AI pantry scan request
type SwaggerPantryScanRequest struct {
	ImageBase64 string `json:"imageBase64" example:"/9j/4AAQSkZJRgABAQ..." binding:"required"`
	MimeType    string `json:"mimeType,omitempty" example:"image/jpeg"`
	AutoAdd     bool   `json:"autoAdd,omitempty" example:"false"`
}

// SwaggerScannedItem represents an AI-detected pantry item
// @Description AI-detected pantry item from scan
type SwaggerScannedItem struct {
	Name           string   `json:"name" example:"Milk"`
	Category       string   `json:"category" example:"dairy"`
	Quantity       *float64 `json:"quantity,omitempty" example:"1"`
	Unit           *string  `json:"unit,omitempty" example:"gallon"`
	ExpirationDate *string  `json:"expirationDate,omitempty" example:"2024-02-15"`
	Confidence     float64  `json:"confidence" example:"0.95"`
	Added          bool     `json:"added,omitempty" example:"true"`
	AddedID        *string  `json:"addedId,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
}

// SwaggerScanResponse represents pantry scan response
// @Description AI pantry scan results
type SwaggerScanResponse struct {
	Items      []SwaggerScannedItem `json:"items"`
	AddedCount int                  `json:"addedCount,omitempty" example:"3"`
	AddedIDs   []string             `json:"addedIds,omitempty" example:"id1,id2,id3"`
	Confidence float64              `json:"confidence" example:"0.89"`
	Notes      string               `json:"notes" example:"Detected items from refrigerator shelf"`
}

// ============================================================================
// Shopping Types
// ============================================================================

// SwaggerShoppingList represents a shopping list
// @Description Shopping list
type SwaggerShoppingList struct {
	ID          string  `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID      string  `json:"userId" example:"550e8400-e29b-41d4-a716-446655440099"`
	Name        string  `json:"name" example:"Weekly Groceries"`
	Description *string `json:"description,omitempty" example:"Shopping for the week"`
	Icon        *string `json:"icon,omitempty" example:"cart"`
	IsTemplate  bool    `json:"isTemplate" example:"false"`
	IsArchived  bool    `json:"isArchived" example:"false"`
	SyncVersion int     `json:"syncVersion" example:"1"`
	CreatedAt   string  `json:"createdAt" example:"2024-02-01T10:30:00Z"`
	UpdatedAt   string  `json:"updatedAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerShoppingItem represents a shopping list item
// @Description Shopping list item
type SwaggerShoppingItem struct {
	ID          string   `json:"id" example:"550e8400-e29b-41d4-a716-446655440001"`
	ListID      string   `json:"listId" example:"550e8400-e29b-41d4-a716-446655440000"`
	Name        string   `json:"name" example:"Milk"`
	Quantity    *float64 `json:"quantity,omitempty" example:"2"`
	Unit        *string  `json:"unit,omitempty" example:"gallons"`
	Category    *string  `json:"category,omitempty" example:"dairy"`
	IsChecked   bool     `json:"isChecked" example:"false"`
	RecipeName  *string  `json:"recipeName,omitempty" example:"Pancakes"`
	SyncVersion int      `json:"syncVersion" example:"1"`
	CreatedAt   string   `json:"createdAt" example:"2024-02-01T10:30:00Z"`
	UpdatedAt   string   `json:"updatedAt" example:"2024-02-01T10:30:00Z"`
}

// SwaggerShoppingListWithItems represents a list with its items
// @Description Shopping list with items
type SwaggerShoppingListWithItems struct {
	SwaggerShoppingList
	Items []SwaggerShoppingItem `json:"items"`
}

// SwaggerShoppingListInput represents list create/update input
// @Description Shopping list input for create/update
type SwaggerShoppingListInput struct {
	Name        string  `json:"name" example:"Weekly Groceries" binding:"required"`
	Description *string `json:"description,omitempty" example:"Shopping for the week"`
	Icon        *string `json:"icon,omitempty" example:"cart"`
	IsTemplate  bool    `json:"isTemplate" example:"false"`
}

// SwaggerShoppingItemInput represents item create/update input
// @Description Shopping item input for create/update
type SwaggerShoppingItemInput struct {
	Name       string   `json:"name" example:"Milk" binding:"required"`
	Quantity   *float64 `json:"quantity,omitempty" example:"2"`
	Unit       *string  `json:"unit,omitempty" example:"gallons"`
	Category   *string  `json:"category,omitempty" example:"dairy"`
	RecipeName *string  `json:"recipeName,omitempty" example:"Pancakes"`
}

// SwaggerShoppingListsResponse represents list of shopping lists
// @Description List of shopping lists
type SwaggerShoppingListsResponse struct {
	Lists []SwaggerShoppingList `json:"lists"`
	Count int                   `json:"count" example:"3"`
}

// SwaggerShoppingItemsResponse represents list of items
// @Description List of shopping items
type SwaggerShoppingItemsResponse struct {
	Items []SwaggerShoppingItem `json:"items"`
	Count int                   `json:"count" example:"15"`
}

// SwaggerAddFromRecipeRequest represents add from recipe request
// @Description Add ingredients from recipe to shopping list
type SwaggerAddFromRecipeRequest struct {
	RecipeID    string   `json:"recipeId" example:"550e8400-e29b-41d4-a716-446655440000" binding:"required"`
	Ingredients []string `json:"ingredients,omitempty" example:"flour,sugar,eggs"`
}

// SwaggerAddFromRecipeResponse represents add from recipe response
// @Description Added items from recipe
type SwaggerAddFromRecipeResponse struct {
	Items []SwaggerShoppingItem `json:"items"`
	Count int                   `json:"count" example:"8"`
}

// SwaggerAnalyzeRequest represents analyze list request
// @Description Analyze shopping list with AI
type SwaggerAnalyzeRequest struct {
	RecipeID string `json:"recipeId,omitempty" example:"550e8400-e29b-41d4-a716-446655440000"`
}

// SwaggerAnalyzeResponse represents AI analysis response
// @Description AI shopping list analysis
type SwaggerAnalyzeResponse struct {
	Suggestions     []string                `json:"suggestions" example:"Consider adding bread,You might need more eggs"`
	CategoryGroups  map[string][]string     `json:"categoryGroups"`
	EstimatedTotal  *float64                `json:"estimatedTotal,omitempty" example:"45.99"`
	DuplicateItems  []string                `json:"duplicateItems,omitempty" example:"milk"`
	MissingStaples  []string                `json:"missingStaples,omitempty" example:"salt,pepper"`
}

// ============================================================================
// Sync Types
// ============================================================================

// SwaggerSyncRequest represents sync request
// @Description Multi-device sync request
type SwaggerSyncRequest struct {
	LastSyncTimestamp string                `json:"lastSyncTimestamp" example:"2024-02-01T10:30:00Z" binding:"required"`
	Recipes           []SwaggerRecipe       `json:"recipes,omitempty"`
	PantryItems       []SwaggerPantryItem   `json:"pantryItems,omitempty"`
	ShoppingLists     []SwaggerShoppingList `json:"shoppingLists,omitempty"`
	ShoppingItems     []SwaggerShoppingItem `json:"shoppingItems,omitempty"`
}

// SwaggerConflict represents a sync conflict
// @Description Sync conflict details
type SwaggerConflict struct {
	ResourceType string `json:"resourceType" example:"recipe" enums:"recipe,pantry_item,shopping_list,shopping_item"`
	ResourceID   string `json:"resourceId" example:"550e8400-e29b-41d4-a716-446655440000"`
	Resolution   string `json:"resolution" example:"server_wins" enums:"server_wins,client_wins,merged"`
	Reason       string `json:"reason" example:"Server version is newer"`
}

// SwaggerSyncResponse represents sync response
// @Description Multi-device sync response
type SwaggerSyncResponse struct {
	ServerTimestamp string                `json:"serverTimestamp" example:"2024-02-01T10:35:00Z"`
	Recipes         []SwaggerRecipe       `json:"recipes,omitempty"`
	PantryItems     []SwaggerPantryItem   `json:"pantryItems,omitempty"`
	ShoppingLists   []SwaggerShoppingList `json:"shoppingLists,omitempty"`
	ShoppingItems   []SwaggerShoppingItem `json:"shoppingItems,omitempty"`
	Conflicts       []SwaggerConflict     `json:"conflicts,omitempty"`
}

// ============================================================================
// Health Types
// ============================================================================

// SwaggerHealthResponse represents health check response
// @Description Health check response
type SwaggerHealthResponse struct {
	Status    string `json:"status" example:"ok"`
	Timestamp string `json:"timestamp" example:"2024-02-01T10:30:00Z"`
}

// SwaggerReadyResponse represents readiness check response
// @Description Readiness check response with service status
type SwaggerReadyResponse struct {
	Status    string            `json:"status" example:"ready" enums:"ready,not_ready"`
	Checks    map[string]string `json:"checks" example:"postgres:ok,redis:ok,gemini:ok"`
	Timestamp string            `json:"timestamp" example:"2024-02-01T10:30:00Z"`
}

// SwaggerInfoResponse represents API info response
// @Description API information response
type SwaggerInfoResponse struct {
	Name        string          `json:"name" example:"DishFlow API"`
	Version     string          `json:"version" example:"1.0.0"`
	Environment string          `json:"environment" example:"development"`
	Features    map[string]bool `json:"features" example:"video_extraction:true,ai_generation:true,sync:true"`
}
