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

// SwaggerRecipeNutritionInfo represents nutritional information per serving
// @Description Nutritional information per serving (AI-estimated)
type SwaggerRecipeNutritionInfo struct {
	Calories   int      `json:"calories" example:"450"`
	Protein    int      `json:"protein" example:"25"`
	Carbs      int      `json:"carbs" example:"30"`
	Fat        int      `json:"fat" example:"20"`
	Fiber      int      `json:"fiber,omitempty" example:"5"`
	Sugar      int      `json:"sugar,omitempty" example:"8"`
	Sodium     int      `json:"sodium,omitempty" example:"600"`
	Tags       []string `json:"tags,omitempty" example:"high-protein,moderate-carb"`
	Confidence float64  `json:"confidence,omitempty" example:"0.75"`
}

// SwaggerRecipeDietaryInfo represents dietary information for filtering
// @Description Dietary flags and allergen information for filtering recipes
type SwaggerRecipeDietaryInfo struct {
	IsVegetarian bool     `json:"isVegetarian,omitempty" example:"true"`
	IsVegan      bool     `json:"isVegan,omitempty" example:"false"`
	IsGlutenFree bool     `json:"isGlutenFree,omitempty" example:"true"`
	IsDairyFree  bool     `json:"isDairyFree,omitempty" example:"false"`
	IsNutFree    bool     `json:"isNutFree,omitempty" example:"true"`
	IsKeto       bool     `json:"isKeto,omitempty" example:"false"`
	IsHalal      bool     `json:"isHalal,omitempty" example:"false"`
	IsKosher     bool     `json:"isKosher,omitempty" example:"false"`
	Allergens    []string `json:"allergens,omitempty" example:"dairy,eggs,gluten"`
	MealTypes    []string `json:"mealTypes,omitempty" example:"lunch,dinner,snack"`
}

// SwaggerRecipe represents a full recipe
// @Description Full recipe with ingredients, steps, nutrition, and dietary information
type SwaggerRecipe struct {
	ID              string                      `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	UserID          string                      `json:"userId" example:"550e8400-e29b-41d4-a716-446655440099"`
	Title           string                      `json:"title" example:"Indian Samosa Latkes"`
	Description     *string                     `json:"description,omitempty" example:"A creative twist on the traditional latke by incorporating the flavors of an Indian samosa"`
	Servings        *int                        `json:"servings,omitempty" example:"4"`
	PrepTime        *int                        `json:"prepTime,omitempty" example:"20"`
	CookTime        *int                        `json:"cookTime,omitempty" example:"25"`
	Difficulty      *string                     `json:"difficulty,omitempty" example:"Medium" enums:"Easy,Medium,Hard"`
	Cuisine         *string                     `json:"cuisine,omitempty" example:"Indian/Jewish Fusion"`
	ThumbnailURL    *string                     `json:"thumbnailUrl,omitempty" example:"https://example.com/thumb.jpg"`
	SourceType      string                      `json:"sourceType" example:"video" enums:"manual,video,ai,photo,webpage,image,cloned"`
	SourceURL       *string                     `json:"sourceUrl,omitempty" example:"https://www.tiktok.com/@eitan/video/7582674293838908703"`
	SourceRecipeID  *string                     `json:"sourceRecipeId,omitempty" example:"550e8400-e29b-41d4-a716-446655440001"`
	Tags            []string                    `json:"tags,omitempty" example:"latkes,samosa,Indian,Hanukkah,fusion,potato,fried"`
	IsPublic        bool                        `json:"isPublic" example:"false"`
	IsFavorite      bool                        `json:"isFavorite" example:"false"`
	Nutrition       *SwaggerRecipeNutritionInfo `json:"nutrition,omitempty"`
	DietaryInfo     *SwaggerRecipeDietaryInfo   `json:"dietaryInfo,omitempty"`
	SyncVersion     int                         `json:"syncVersion" example:"0"`
	CreatedAt       string                      `json:"createdAt" example:"2026-02-02T19:30:10.803252Z"`
	UpdatedAt       string                      `json:"updatedAt" example:"2026-02-02T19:30:10.803252Z"`
	IngredientCount int                         `json:"ingredientCount,omitempty" example:"14"`
	StepCount       int                         `json:"stepCount,omitempty" example:"9"`
	Ingredients     []SwaggerRecipeIngredient   `json:"ingredients,omitempty"`
	Steps           []SwaggerRecipeStep         `json:"steps,omitempty"`
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

// SwaggerCloneResponse represents clone recipe response
// @Description Cloned recipe response
type SwaggerCloneResponse struct {
	SwaggerRecipe
	SourceRecipeID string `json:"sourceRecipeId" example:"550e8400-e29b-41d4-a716-446655440001"`
}

// ============================================================================
// Extraction Types
// ============================================================================

// SwaggerUnifiedExtractRequest represents unified extraction request
// @Description Unified recipe extraction request (url, image, or video)
type SwaggerUnifiedExtractRequest struct {
	Type        string `json:"type" example:"url" binding:"required" enums:"url,image,video"`
	URL         string `json:"url,omitempty" example:"https://example.com/recipe/carbonara"`
	ImageBase64 string `json:"imageBase64,omitempty" example:"/9j/4AAQSkZJRgABAQ..."`
	MimeType    string `json:"mimeType,omitempty" example:"image/jpeg"`
	Language    string `json:"language,omitempty" example:"en" enums:"en,fr,es,auto"`
	DetailLevel string `json:"detailLevel,omitempty" example:"detailed" enums:"quick,detailed"`
	SaveAuto    bool   `json:"saveAuto,omitempty" example:"true"`
}

// SwaggerExtractURLRequest represents URL extraction request (deprecated - use unified)
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
// @Description Recipe extraction job status
type SwaggerJobResponse struct {
	JobID            string           `json:"jobId" example:"550e8400-e29b-41d4-a716-446655440000"`
	JobType          string           `json:"jobType" example:"url" enums:"url,image,video"`
	Status           string           `json:"status" example:"processing" enums:"pending,downloading,processing,extracting,completed,failed,cancelled"`
	Progress         int              `json:"progress" example:"45"`
	Message          string           `json:"message,omitempty" example:"Extracting recipe..."`
	SourceURL        string           `json:"sourceUrl,omitempty" example:"https://example.com/recipe"`
	StatusURL        string           `json:"statusUrl,omitempty" example:"/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000"`
	StreamURL        string           `json:"streamUrl,omitempty" example:"/api/v1/jobs/550e8400-e29b-41d4-a716-446655440000/stream"`
	EstimatedSeconds int              `json:"estimatedSeconds,omitempty" example:"15"`
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
// Recommendation Types
// ============================================================================

// SwaggerRecommendationRequest represents recommendation filter parameters
// @Description Recipe recommendation filter parameters
type SwaggerRecommendationRequest struct {
	MealType    string   `json:"mealType,omitempty" example:"dinner" enums:"breakfast,lunch,dinner,snack,dessert"`
	MaxTime     int      `json:"maxTime,omitempty" example:"30"`
	Cuisine     string   `json:"cuisine,omitempty" example:"italian"`
	Mood        string   `json:"mood,omitempty" example:"quick" enums:"quick,comfort,healthy,indulgent"`
	Exclude     []string `json:"exclude,omitempty" example:"gluten,dairy"`
	Diet        string   `json:"diet,omitempty" example:"vegetarian" enums:"vegetarian,vegan,keto,halal,kosher,pescatarian,paleo"`
	MaxCalories int      `json:"maxCalories,omitempty" example:"500"`
	MinProtein  int      `json:"minProtein,omitempty" example:"20"`
	MaxCarbs    int      `json:"maxCarbs,omitempty" example:"50"`
	MaxFat      int      `json:"maxFat,omitempty" example:"25"`
	MinMatch    int      `json:"minMatch,omitempty" example:"50"`
	Limit       int      `json:"limit,omitempty" example:"10"`
}

// SwaggerIngredientMatch represents a matched ingredient between pantry and recipe
// @Description Matched ingredient with substitution info
type SwaggerIngredientMatch struct {
	RecipeIngredient string `json:"recipeIngredient" example:"butter"`
	PantryItem       string `json:"pantryItem" example:"Margarine"`
	IsSubstitute     bool   `json:"isSubstitute,omitempty" example:"true"`
	SubstituteRatio  string `json:"substituteRatio,omitempty" example:"1:1"`
}

// SwaggerSubstituteSuggestion represents a substitute suggestion
// @Description Suggested substitute for an ingredient
type SwaggerSubstituteSuggestion struct {
	Source string `json:"source" example:"pantry" enums:"pantry,common"`
	Item   string `json:"item" example:"Greek Yogurt"`
	Ratio  string `json:"ratio,omitempty" example:"1:1"`
	Notes  string `json:"notes,omitempty" example:"Works well in baking"`
}

// SwaggerMissingIngredient represents a missing ingredient
// @Description Missing ingredient with substitution options
type SwaggerMissingIngredient struct {
	Ingredient  string                        `json:"ingredient" example:"heavy cream"`
	Substitutes []SwaggerSubstituteSuggestion `json:"substitutes,omitempty"`
	CanSkip     bool                          `json:"canSkip" example:"false"`
	Category    string                        `json:"category,omitempty" example:"dairy"`
}

// SwaggerRecipeNutrition represents nutritional info per serving
// @Description Nutritional information per serving
type SwaggerRecipeNutrition struct {
	Calories   int      `json:"calories" example:"450"`
	Protein    int      `json:"protein" example:"25"`
	Carbs      int      `json:"carbs" example:"30"`
	Fat        int      `json:"fat" example:"20"`
	Fiber      int      `json:"fiber,omitempty" example:"5"`
	Sugar      int      `json:"sugar,omitempty" example:"8"`
	Sodium     int      `json:"sodium,omitempty" example:"600"`
	Tags       []string `json:"tags,omitempty" example:"high-protein,low-carb"`
	Confidence float64  `json:"confidence,omitempty" example:"0.85"`
}

// SwaggerRecipeRecommendation represents a single recipe recommendation
// @Description Recipe recommendation with matching details and filter metadata
type SwaggerRecipeRecommendation struct {
	Recipe              *SwaggerRecipe             `json:"recipe"`
	MatchScore          int                        `json:"matchScore" example:"95"`
	MatchedIngredients  []SwaggerIngredientMatch   `json:"matchedIngredients"`
	MissingIngredients  []SwaggerMissingIngredient `json:"missingIngredients"`
	ShoppingListItems   []string                   `json:"shoppingListItems,omitempty" example:"heavy cream,fresh thyme"`
	Reason              string                     `json:"reason,omitempty" example:"You have all the ingredients • Perfect for lunch • 450 cal/serving"`
	NutritionPerServing *SwaggerRecipeNutrition    `json:"nutritionPerServing,omitempty"`
	FiltersMatched      []string                   `json:"filtersMatched,omitempty" example:"mealType,maxCalories"`
	FiltersUnknown      []string                   `json:"filtersUnknown,omitempty" example:"minProtein"`
	FiltersNotMatched   []string                   `json:"filtersNotMatched,omitempty" example:"cuisine"`
}

// SwaggerRecipeQuickInfo represents minimal recipe info for summary
// @Description Minimal recipe info for summary statistics
type SwaggerRecipeQuickInfo struct {
	ID        string `json:"id" example:"550e8400-e29b-41d4-a716-446655440000"`
	Title     string `json:"title" example:"Quick Stir Fry"`
	Value     int    `json:"value" example:"15"`
	ValueUnit string `json:"valueUnit,omitempty" example:"min"`
}

// SwaggerRecommendationSummary contains summary statistics
// @Description Summary statistics for recommendations
type SwaggerRecommendationSummary struct {
	TotalRecipes          int                     `json:"totalRecipes" example:"15"`
	AvgCaloriesPerServing int                     `json:"avgCaloriesPerServing,omitempty" example:"380"`
	QuickestRecipe        *SwaggerRecipeQuickInfo `json:"quickestRecipe,omitempty"`
	HighestProtein        *SwaggerRecipeQuickInfo `json:"highestProtein,omitempty"`
	BestMatch             *SwaggerRecipeQuickInfo `json:"bestMatch,omitempty"`
}

// SwaggerNutritionFilters shows applied nutrition constraints
// @Description Applied nutrition filter constraints
type SwaggerNutritionFilters struct {
	MaxCalories int `json:"maxCalories,omitempty" example:"500"`
	MinProtein  int `json:"minProtein,omitempty" example:"20"`
	MaxCarbs    int `json:"maxCarbs,omitempty" example:"50"`
	MaxFat      int `json:"maxFat,omitempty" example:"25"`
}

// SwaggerAppliedFilters shows what filters were requested by user
// @Description Applied filter information (shows what user requested, not exclusion counts)
type SwaggerAppliedFilters struct {
	AppliedMealType   string                   `json:"appliedMealType,omitempty" example:"lunch"`
	AppliedCuisine    string                   `json:"appliedCuisine,omitempty" example:"italian"`
	AppliedMood       string                   `json:"appliedMood,omitempty" example:"quick"`
	AppliedMaxTime    int                      `json:"appliedMaxTime,omitempty" example:"30"`
	AppliedDiet       string                   `json:"appliedDiet,omitempty" example:"vegetarian"`
	AppliedExclusions []string                 `json:"appliedExclusions,omitempty" example:"gluten,dairy"`
	NutritionFilters  *SwaggerNutritionFilters `json:"nutritionFilters,omitempty"`
}

// SwaggerRecommendationResponse represents the full recommendation response
// @Description Recipe recommendations categorized by match percentage
type SwaggerRecommendationResponse struct {
	ReadyToCook   []SwaggerRecipeRecommendation `json:"readyToCook"`
	AlmostReady   []SwaggerRecipeRecommendation `json:"almostReady"`
	NeedsShopping []SwaggerRecipeRecommendation `json:"needsShopping"`
	Summary       SwaggerRecommendationSummary  `json:"summary"`
	Filters       SwaggerAppliedFilters         `json:"filters"`
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
