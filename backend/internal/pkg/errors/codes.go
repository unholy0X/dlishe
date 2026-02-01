package errors

// Error codes for API responses
const (
	// General
	ErrCodeValidation   = "VALIDATION_ERROR"
	ErrCodeNotFound     = "NOT_FOUND"
	ErrCodeUnauthorized = "UNAUTHORIZED"
	ErrCodeForbidden    = "FORBIDDEN"
	ErrCodeConflict     = "CONFLICT"
	ErrCodeInternal     = "INTERNAL_ERROR"

	// Recipe/Extraction
	ErrCodeDuplicateRecipe  = "DUPLICATE_RECIPE"
	ErrCodeExtractionFailed = "EXTRACTION_FAILED"
	ErrCodeNoRecipeFound    = "NO_RECIPE_FOUND"

	// Shopping/Pantry
	ErrCodeDuplicateItem   = "DUPLICATE_ITEM"
	ErrCodeInvalidQuantity = "INVALID_QUANTITY"
	ErrCodePartialSuccess  = "PARTIAL_SUCCESS"

	// Service
	ErrCodeServiceUnavailable = "SERVICE_UNAVAILABLE"
	ErrCodeQuotaExceeded      = "QUOTA_EXCEEDED"
)
