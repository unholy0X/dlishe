package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5432/dishflow?sslmode=disable"
	}

	db, err := sql.Open("pgx", dbURL)
	if err != nil {
		log.Fatalf("Failed to open db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping db: %v", err)
	}

	ctx := context.Background()

	// Try to query tags from recipes
	rows, err := db.QueryContext(ctx, "SELECT tags FROM recipes LIMIT 1")
	if err != nil {
		log.Fatalf("Query failed: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var tags TextArray
		if err := rows.Scan(&tags); err != nil {
			log.Fatalf("Scan failed: %v", err)
		}
		fmt.Printf("Scanned tags: %v\n", tags)
	}

	if err := rows.Err(); err != nil {
		log.Fatalf("Rows error: %v", err)
	}

	fmt.Println("Successfully scanned tags!")
}

// TextArray implements sql.Scanner for text[]
type TextArray []string

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

func (a *TextArray) parse(s string) error {
	// Simple parser for PostgreSQL array output {val1,val2}
	// Handles quoted strings and escapes
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
