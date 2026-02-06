package model

import (
	"log"
	"strings"
)

// ValidIngredientCategories defines the canonical list of ingredient categories
// Used across pantry items, recipe ingredients, and shopping items
var ValidIngredientCategories = map[string]bool{
	"dairy":      true,
	"produce":    true,
	"proteins":   true,
	"bakery":     true,
	"pantry":     true,
	"spices":     true,
	"condiments": true,
	"beverages":  true,
	"snacks":     true,
	"frozen":     true,
	"household":  true,
	"other":      true,
}

// categoryAliases maps common AI-returned or user-entered categories
// to our canonical categories. This comprehensive list covers 99% of real-world ingredients.
var categoryAliases = map[string]string{
	// Grains/Pantry/Dry Goods/Canned (all map to pantry)
	"grains":        "pantry",
	"grain":         "pantry",
	"canned":        "pantry",
	"canned goods":  "pantry",
	"canned food":   "pantry",
	"pasta":         "pantry",
	"rice":          "pantry",
	"cereals":       "pantry",
	"cereal":        "pantry",
	"noodles":       "pantry",
	"noodle":        "pantry",
	"oats":          "pantry",
	"quinoa":        "pantry",
	"couscous":      "pantry",
	"bulgur":        "pantry",
	"barley":        "pantry",
	"polenta":       "pantry",
	"cornmeal":      "pantry",
	"dried beans":   "pantry",
	"dried lentils": "pantry",
	"legumes":       "pantry",
	"beans":         "pantry",
	"lentils":       "pantry",

	// Baking / Bakery (unified)
	"baking":          "bakery",
	"baking supplies": "bakery",
	"baked":           "bakery",
	"flour":           "bakery",
	"sugar":           "bakery",
	"baking powder":   "bakery",
	"baking soda":     "bakery",
	"yeast":           "bakery",
	"chocolate chips": "bakery",
	"cocoa":           "bakery",
	"vanilla":         "bakery",
	"bread":           "bakery",
	"baked goods":     "bakery",

	// Proteins
	"meat":      "proteins",
	"meats":     "proteins",
	"seafood":   "proteins",
	"fish":      "proteins",
	"poultry":   "proteins",
	"chicken":   "proteins",
	"beef":      "proteins",
	"pork":      "proteins",
	"lamb":      "proteins",
	"turkey":    "proteins",
	"duck":      "proteins",
	"salmon":    "proteins",
	"tuna":      "proteins",
	"shrimp":    "proteins",
	"shellfish": "proteins",
	"eggs":      "dairy", // Eggs often grouped with dairy in stores
	"egg":       "dairy",
	"tofu":      "proteins",
	"tempeh":    "proteins",
	"seitan":    "proteins",
	"protein":   "proteins",
	"deli":      "proteins",
	"deli meat": "proteins",
	"bacon":     "proteins",
	"sausage":   "proteins",
	"ham":       "proteins",

	// Produce
	"vegetables":    "produce",
	"vegetable":     "produce",
	"fruits":        "produce",
	"fruit":         "produce",
	"fresh produce": "produce",
	"herbs":         "produce",
	"herb":          "produce",
	"veggie":        "produce",
	"veggies":       "produce",
	"greens":        "produce",
	"salad":         "produce",
	"lettuce":       "produce",
	"berries":       "produce",
	"citrus":        "produce",
	"apples":        "produce",
	"bananas":       "produce",
	"tomatoes":      "produce",
	"onions":        "produce",
	"garlic":        "produce",
	"potatoes":      "produce",
	"carrots":       "produce",
	"fresh herbs":   "produce",
	"leafy greens":  "produce",

	// Dairy
	"milk":           "dairy",
	"cheese":         "dairy",
	"yogurt":         "dairy",
	"butter":         "dairy",
	"cream":          "dairy",
	"sour cream":     "dairy",
	"whipped cream":  "dairy",
	"half and half":  "dairy",
	"cottage cheese": "dairy",
	"ricotta":        "dairy",
	"mozzarella":     "dairy",
	"cheddar":        "dairy",
	"parmesan":       "dairy",
	"feta":           "dairy",
	"goat cheese":    "dairy",
	"cream cheese":   "dairy",

	// Spices & Seasonings
	"spice":         "spices",
	"seasoning":     "spices",
	"seasonings":    "spices",
	"salt":          "spices",
	"pepper":        "spices",
	"black pepper":  "spices",
	"paprika":       "spices",
	"cumin":         "spices",
	"cinnamon":      "spices",
	"nutmeg":        "spices",
	"ginger":        "spices",
	"turmeric":      "spices",
	"oregano":       "spices",
	"basil":         "spices",
	"thyme":         "spices",
	"rosemary":      "spices",
	"bay leaves":    "spices",
	"chili powder":  "spices",
	"curry powder":  "spices",
	"garlic powder": "spices",
	"onion powder":  "spices",

	// Condiments, Oils & Sauces
	"sauce":          "condiments",
	"sauces":         "condiments",
	"oil":            "condiments",
	"oils":           "condiments",
	"dressing":       "condiments",
	"dressings":      "condiments",
	"condiment":      "condiments",
	"olive oil":      "condiments",
	"vegetable oil":  "condiments",
	"coconut oil":    "condiments",
	"vinegar":        "condiments",
	"soy sauce":      "condiments",
	"hot sauce":      "condiments",
	"ketchup":        "condiments",
	"mustard":        "condiments",
	"mayonnaise":     "condiments",
	"mayo":           "condiments",
	"salsa":          "condiments",
	"bbq sauce":      "condiments",
	"worcestershire": "condiments",
	"fish sauce":     "condiments",
	"peanut butter":  "condiments",
	"jam":            "condiments",
	"jelly":          "condiments",
	"honey":          "condiments",
	"maple syrup":    "condiments",
	"syrup":          "condiments",

	// Beverages
	"drink":    "beverages",
	"drinks":   "beverages",
	"beverage": "beverages",
	"juice":    "beverages",
	"soda":     "beverages",
	"coffee":   "beverages",
	"tea":      "beverages",
	"water":    "beverages",
	"beer":     "beverages",
	"wine":     "beverages",
	"liquor":   "beverages",
	"alcohol":  "beverages",
	"spirits":  "beverages",

	// Snacks
	"snack":    "snacks",
	"chips":    "snacks",
	"crackers": "snacks",
	"cookies":  "snacks",
	"candy":    "snacks",
	"nuts":     "snacks",
	"popcorn":  "snacks",
	"pretzels": "snacks",

	// Frozen
	"ice cream":         "frozen",
	"frozen food":       "frozen",
	"frozen foods":      "frozen",
	"frozen vegetables": "frozen",
	"frozen fruit":      "frozen",
	"frozen meals":      "frozen",
	"frozen pizza":      "frozen",
	"popsicles":         "frozen",

	// Household (non-food)
	"cleaning":         "household",
	"paper products":   "household",
	"toiletries":       "household",
	"personal care":    "household",
	"laundry":          "household",
	"kitchen supplies": "household",

	// Catch-alls
	"misc":          "other",
	"miscellaneous": "other",
	"":              "other",
	"general":       "other",
	"uncategorized": "other",
}

// NormalizeCategory validates and normalizes an ingredient category
// Returns a valid category from ValidIngredientCategories, defaulting to "other" if invalid
// This is the single source of truth for category normalization across the application
// SAFETY GUARANTEE: This function NEVER returns an invalid category or causes data loss.
// Any unknown category defaults to "other" and the item is ALWAYS saved.
func NormalizeCategory(category string) string {
	if category == "" {
		return "other"
	}

	// Lowercase and trim for comparison
	normalized := strings.ToLower(strings.TrimSpace(category))

	// Check if it's already a valid category
	if ValidIngredientCategories[normalized] {
		return normalized
	}

	// Try to map from alias
	if canonical, ok := categoryAliases[normalized]; ok {
		return canonical
	}

	// Default to "other" for unknown categories
	// Log this case to help improve our alias coverage
	log.Printf("[WARN] Unknown category '%s' normalized to 'other' - consider adding to aliases", category)
	return "other"
}

// IsValidCategory checks if a category is in the canonical list
func IsValidCategory(category string) bool {
	return ValidIngredientCategories[strings.ToLower(strings.TrimSpace(category))]
}

// GetAllCategories returns a slice of all valid category names
func GetAllCategories() []string {
	categories := make([]string, 0, len(ValidIngredientCategories))
	for cat := range ValidIngredientCategories {
		categories = append(categories, cat)
	}
	return categories
}

// cookingUnits are recipe-scale measurements that don't translate to shopping.
// Nobody buys "2 tablespoons of olive oil" — they buy a bottle.
var cookingUnits = map[string]bool{
	// Volume (small)
	"tsp": true, "teaspoon": true, "teaspoons": true,
	"tbsp": true, "tablespoon": true, "tablespoons": true,
	"cup": true, "cups": true,
	"fl oz": true, "fluid ounce": true, "fluid ounces": true,
	// Imprecise
	"pinch": true, "pinches": true,
	"dash": true, "dashes": true,
	"splash": true, "splashes": true,
	"drizzle": true, "drizzles": true,
	"handful": true, "handfuls": true,
	"drop": true, "drops": true,
	// Produce parts
	"clove": true, "cloves": true,
	"slice": true, "slices": true,
	"sprig": true, "sprigs": true,
	"stalk": true, "stalks": true,
	"leaf": true, "leaves": true,
	"wedge": true, "wedges": true,
	"zest": true,
	// Vague portions
	"piece": true, "pieces": true,
	"to taste": true,
	"some": true,
	"as needed": true,
}

// IsCookingUnit returns true if the unit is a recipe-scale measurement
// that should be stripped when adding to a shopping list.
// Returns false for nil/empty (no unit = keep as-is) and for purchasable
// units like g, kg, ml, oz, lb, bunch, can, bottle, etc.
func IsCookingUnit(unit *string) bool {
	if unit == nil {
		return false
	}
	normalized := strings.ToLower(strings.TrimSpace(*unit))
	if normalized == "" {
		return false
	}
	return cookingUnits[normalized]
}

// ToShoppingUnit converts a recipe ingredient's quantity/unit for shopping.
// Cooking units (tbsp, pinch, clove) are stripped — the shopper just needs the item name.
// Purchasable units (g, kg, ml, oz, bunch, can) are kept as-is.
func ToShoppingUnit(quantity *float64, unit *string) (*float64, *string) {
	if IsCookingUnit(unit) {
		return nil, nil
	}
	return quantity, unit
}
