// End-to-end smoke test: converts a mock Dlishe recipe → Gemini → Cookidoo.
// Usage: COOKIDOO_ACCOUNTS="email:pass" GEMINI_API_KEY="key" go run ./cmd/cookidoo_test/
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"github.com/dishflow/backend/internal/model"
	"github.com/dishflow/backend/internal/service/ai"
	"github.com/dishflow/backend/internal/service/cookidoo"
	"github.com/google/uuid"
)

func main() {
	geminiKey := os.Getenv("GEMINI_API_KEY")
	cookidooAccounts := os.Getenv("COOKIDOO_ACCOUNTS")

	if geminiKey == "" || cookidooAccounts == "" {
		fmt.Fprintln(os.Stderr, "set GEMINI_API_KEY and COOKIDOO_ACCOUNTS=email:password")
		os.Exit(1)
	}

	ctx := context.Background()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))

	// Init Gemini
	gemini, err := ai.NewGeminiClient(ctx, geminiKey)
	if err != nil {
		fmt.Fprintf(os.Stderr, "gemini init: %v\n", err)
		os.Exit(1)
	}

	// Parse credentials
	var email, password string
	for i, c := range cookidooAccounts {
		if c == ':' {
			email = cookidooAccounts[:i]
			password = cookidooAccounts[i+1:]
			break
		}
	}

	// Init Cookidoo pool
	pool, err := cookidoo.NewPool(ctx,
		[]cookidoo.AccountCredentials{{Email: email, Password: password}},
		"fr-FR", "fr", logger,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "cookidoo pool: %v\n", err)
		os.Exit(1)
	}

	// Build a mock recipe (simulates a Dlishe recipe from a YouTube scan)
	qty1, qty2, qty3, qty4, qty5, qty6 := 200.0, 500.0, 3.0, 80.0, 50.0, 1.0
	unitG, unitMl, unitPcs := "g", "ml", "pcs"
	prep, cook, servings := 15, 30, 4
	dur1, dur2, dur3, dur4, dur5 := 30, 300, 600, 60, 20
	temp90, temp100 := "90°C", "100°C"

	recipe := &model.Recipe{
		ID:              uuid.New(),
		UserID:          uuid.New(),
		Title:           "Risotto aux champignons",
		ContentLanguage: "fr",
		PrepTime:        &prep,
		CookTime:        &cook,
		Servings:        &servings,
		Ingredients: []model.RecipeIngredient{
			{ID: uuid.New(), Name: "riz arborio", Quantity: &qty1, Unit: &unitG, SortOrder: 1},
			{ID: uuid.New(), Name: "bouillon de légumes chaud", Quantity: &qty2, Unit: &unitMl, SortOrder: 2},
			{ID: uuid.New(), Name: "champignons de Paris", Quantity: &qty3, Unit: &unitPcs, SortOrder: 3},
			{ID: uuid.New(), Name: "parmesan râpé", Quantity: &qty4, Unit: &unitG, SortOrder: 4},
			{ID: uuid.New(), Name: "beurre", Quantity: &qty5, Unit: &unitG, SortOrder: 5},
			{ID: uuid.New(), Name: "oignon", Quantity: &qty6, Unit: &unitPcs, SortOrder: 6},
		},
		Steps: []model.RecipeStep{
			{ID: uuid.New(), StepNumber: 1, Instruction: "Émincer les champignons et réserver.", DurationSeconds: &dur1},
			{ID: uuid.New(), StepNumber: 2, Instruction: "Faire revenir l'oignon haché avec le beurre.", DurationSeconds: &dur2, Temperature: &temp90},
			{ID: uuid.New(), StepNumber: 3, Instruction: "Ajouter le riz et nacrer 2 minutes, puis verser le bouillon progressivement et cuire en remuant.", DurationSeconds: &dur3, Temperature: &temp100},
			{ID: uuid.New(), StepNumber: 4, Instruction: "Incorporer les champignons et continuer la cuisson.", DurationSeconds: &dur4, Temperature: &temp90},
			{ID: uuid.New(), StepNumber: 5, Instruction: "Hors du feu, mantecarer avec le parmesan. Servir aussitôt.", DurationSeconds: &dur5},
		},
	}

	fmt.Println("Step 1: Converting recipe with Gemini...")
	converted, err := gemini.ConvertToThermomix(ctx, recipe)
	if err != nil {
		fmt.Fprintf(os.Stderr, "convert: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\nConverted ingredients:")
	for _, ing := range converted.Ingredients {
		fmt.Printf("  - %s\n", ing)
	}
	fmt.Println("\nConverted steps:")
	for i, s := range converted.Steps {
		fmt.Printf("  %d. %s", i+1, s.Text)
		if s.Speed != "" {
			fmt.Printf(" [speed=%s time=%ds temp=%s]", s.Speed, s.TimeSeconds, s.TempCelsius)
		}
		fmt.Println()
	}
	fmt.Printf("\nRequired models: %v\n", converted.RequiredModels)

	fmt.Println("\nStep 2: Creating recipe on Cookidoo...")
	ings := make([]cookidoo.RecipeItem, len(converted.Ingredients))
	for i, s := range converted.Ingredients {
		ings[i] = cookidoo.RecipeItem{Type: "INGREDIENT", Text: s}
	}
	// Build steps with TTS + INGREDIENT annotations.
	steps := make([]cookidoo.RecipeItem, len(converted.Steps))
	for i, s := range converted.Steps {
		steps[i] = cookidoo.NewStepItem(s.Text, s.Speed, s.TimeSeconds, s.TempCelsius, recipe.ContentLanguage, s.IngredientRefs)
	}

	tmRecipe := cookidoo.ThermomixRecipe{
		Name:         recipe.Title,
		Ingredients:  ings,
		Instructions: steps,
		Tools:        converted.RequiredModels,
		TotalTime:    (prep + cook) * 60,
		PrepTime:     prep * 60,
		Yield:        &cookidoo.RecipeYield{Value: servings, UnitText: "portion"},
	}

	url, err := pool.CreateRecipe(ctx, tmRecipe)
	if err != nil {
		fmt.Fprintf(os.Stderr, "create cookidoo recipe: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("\n✓ End-to-end success!")
	fmt.Println("Cookidoo URL:", url)
}
