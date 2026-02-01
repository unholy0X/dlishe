package model

import "fmt"

// Common errors
var (
	ErrNotFound = fmt.Errorf("resource not found")
)

// ErrValidation represents a validation error
type ErrValidation struct {
	Field  string
	Reason string
}

func (e ErrValidation) Error() string {
	return fmt.Sprintf("validation failed for field '%s': %s", e.Field, e.Reason)
}
