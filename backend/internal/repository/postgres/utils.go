package postgres

import (
	"database/sql/driver"
	"fmt"
	"strings"
)

// TextArray implements sql.Scanner for text[]
// This is necessary because standard database/sql with pgx stdlib
// returns arrays as strings (e.g. "{a,b}") which don't auto-scan into []string
type TextArray []string

// Scan implements the sql.Scanner interface
func (a *TextArray) Scan(src interface{}) error {
	switch v := src.(type) {
	case []byte:
		return a.parse(string(v))
	case string:
		return a.parse(v)
	case nil:
		*a = nil
		return nil
	}
	return fmt.Errorf("cannot scan %T into TextArray", src)
}

// Value implements the driver.Valuer interface
func (a TextArray) Value() (driver.Value, error) {
	if a == nil {
		return nil, nil
	}
	if len(a) == 0 {
		return "{}", nil
	}

	// Construct postgres array string manually or rely on driver
	// For input, standard driver usually works with []string.
	// But if we use TextArray as input, we should format it.
	// Simple formatting for now.
	var sb strings.Builder
	sb.WriteByte('{')
	for i, s := range a {
		if i > 0 {
			sb.WriteByte(',')
		}
		// logic to escape quotes/backslashes if needed
		// For simple tags, usually safe. For robustness, we should quote.
		sb.WriteByte('"')
		sb.WriteString(strings.ReplaceAll(strings.ReplaceAll(s, "\\", "\\\\"), "\"", "\\\""))
		sb.WriteByte('"')
	}
	sb.WriteByte('}')
	return sb.String(), nil
}

func (a *TextArray) parse(s string) error {
	s = strings.TrimSpace(s)
	if len(s) < 2 || s[0] != '{' || s[len(s)-1] != '}' {
		return fmt.Errorf("invalid array format: %s", s)
	}
	s = s[1 : len(s)-1]
	if len(s) == 0 {
		*a = []string{}
		return nil
	}

	var result []string
	var current strings.Builder
	inQuote := false
	escaped := false

	for i := 0; i < len(s); i++ {
		char := s[i]

		if escaped {
			current.WriteByte(char)
			escaped = false
			continue
		}

		if char == '\\' {
			escaped = true
			continue
		}

		if char == '"' {
			inQuote = !inQuote
			continue
		}

		if char == ',' && !inQuote {
			result = append(result, current.String())
			current.Reset()
			continue
		}

		current.WriteByte(char)
	}
	result = append(result, current.String())
	*a = TextArray(result)
	return nil
}
