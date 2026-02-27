package cookidoo

// ThermomixRecipe is the flat PATCH body for the Cookidoo Created Recipes API.
// Confirmed from HAR capture of the official Cookidoo web app.
// All fields are at the top level — NO recipeContent wrapper.
type ThermomixRecipe struct {
	Name         string       `json:"name,omitempty"`
	Ingredients  []RecipeItem `json:"ingredients,omitempty"`
	Instructions []RecipeItem `json:"instructions,omitempty"`
	Tools        []string     `json:"tools,omitempty"`
	Yield        *RecipeYield `json:"yield,omitempty"`
	TotalTime    int          `json:"totalTime,omitempty"`
	PrepTime     int          `json:"prepTime,omitempty"`
	WorkStatus   string       `json:"workStatus,omitempty"`
	// ThumbnailURL is a dlishe thumbnail URL to upload to Cookidoo after creation.
	// It is NOT serialised to the Cookidoo API — used internally by CreateRecipe.
	ThumbnailURL string `json:"-"`
}

// RecipeItem is a single ingredient or instruction entry.
// Type is "INGREDIENT" for ingredients, "STEP" for instructions.
// Annotations attach structured Thermomix parameters (TTS) to a substring of Text.
type RecipeItem struct {
	Type        string           `json:"type"`
	Text        string           `json:"text"`
	Annotations []StepAnnotation `json:"annotations,omitempty"`
}

// StepAnnotation marks a substring of a step's Text with structured machine parameters.
// Type "TTS" carries Thermomix speed/time/temperature data.
type StepAnnotation struct {
	Type     string             `json:"type"`
	Data     AnnotationData     `json:"data"`
	Position AnnotationPosition `json:"position"`
}

// AnnotationData holds the structured values for a TTS or INGREDIENT annotation.
type AnnotationData struct {
	// TTS fields
	Speed       string          `json:"speed,omitempty"`
	Time        int             `json:"time,omitempty"`
	Temperature *AnnotationTemp `json:"temperature,omitempty"`
	// INGREDIENT field
	Description string `json:"description,omitempty"`
}

// AnnotationTemp holds the temperature value and unit for a TTS annotation.
type AnnotationTemp struct {
	Value string `json:"value"`
	Unit  string `json:"unit"` // always "C"
}

// AnnotationPosition is the character offset and length of the annotated substring.
type AnnotationPosition struct {
	Offset int `json:"offset"`
	Length int `json:"length"`
}

// RecipeYield describes how many portions the recipe makes.
type RecipeYield struct {
	Value    int    `json:"value"`
	UnitText string `json:"unitText"`
}

// createRecipeRequest is the POST body — uses "recipeName" (different from PATCH "name").
type createRecipeRequest struct {
	RecipeName string `json:"recipeName"`
}

// createRecipeResponse is the response from POST /created-recipes/{locale}.
type createRecipeResponse struct {
	RecipeID string `json:"recipeId"`
}

// tokenResponse is the OAuth2 token endpoint response.
type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}
