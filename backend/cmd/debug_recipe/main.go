package main

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/lib/pq"
)

const (
	RecipeID = "6208f2bf-1e56-4fbb-b183-81b564feaf4a"
	DBURL    = "postgres://dishflow:dishflow@localhost:5432/dishflow?sslmode=disable"
)

var validCategories = map[string]bool{
	"produce":    true,
	"proteins":   true,
	"dairy":      true,
	"grains":     true,
	"pantry":     true,
	"spices":     true,
	"condiments": true,
	"beverages":  true,
	"frozen":     true,
	"canned":     true,
	"baking":     true,
	"other":      true,
}

func isValidCategory(category string) bool {
	return validCategories[category]
}

func main() {
	db, err := sql.Open("postgres", DBURL)
	if err != nil {
		log.Fatalf("Failed to connect to DB: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping DB: %v", err)
	}

	fmt.Printf("Connected to DB. Inspecting recipe %s\n", RecipeID)

	rows, err := db.Query(`
		SELECT name, category 
		FROM recipe_ingredients 
		WHERE recipe_id = $1
	`, RecipeID)
	if err != nil {
		log.Fatalf("Failed to query ingredients: %v", err)
	}
	defer rows.Close()

	count := 0
	for rows.Next() {
		var name, category string
		if err := rows.Scan(&name, &category); err != nil {
			log.Printf("Scan error: %v", err)
			continue
		}
		count++

		fmt.Printf("Ingredient: '%s'\n", name)
		fmt.Printf("  Category (Raw):     '%s'\n", category)

		normalizedCat := strings.ToLower(category)
		fmt.Printf("  Category (Lower):   '%s'\n", normalizedCat)

		isValidRaw := isValidCategory(category)
		isValidLower := isValidCategory(normalizedCat)

		fmt.Printf("  Valid (Raw)?        %v\n", isValidRaw)
		fmt.Printf("  Valid (Lower)?      %v\n", isValidLower)

		if !isValidLower {
			fmt.Printf("  [WARNING] Even lowercase category '%s' is INVALID!\n", normalizedCat)
		} else {
			fmt.Printf("  [OK] Lowercase category is valid.\n")
		}
		fmt.Println("---")
	}

	if count == 0 {
		fmt.Println("No ingredients found for this recipe ID!")
	}
}
