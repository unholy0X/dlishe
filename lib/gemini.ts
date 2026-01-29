// Gemini AI Client Setup
import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";

if (!API_KEY) {
  console.warn("Gemini API key not found. Set EXPO_PUBLIC_GEMINI_API_KEY in .env");
}

const genAI = new GoogleGenerativeAI(API_KEY);

// Use gemini-2.0-flash for fast, capable extraction
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

// Recipe extraction schema for structured output
export const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The name of the recipe",
    },
    description: {
      type: "string",
      description: "A brief description of the dish",
    },
    prepTime: {
      type: "integer",
      description: "Preparation time in minutes",
    },
    cookTime: {
      type: "integer",
      description: "Cooking time in minutes",
    },
    servings: {
      type: "integer",
      description: "Number of servings",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "Difficulty level of the recipe",
    },
    cuisine: {
      type: "string",
      description: "Type of cuisine (e.g., Italian, Mexican, Asian)",
    },
    ingredients: {
      type: "array",
      description: "List of ingredients with amounts",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the ingredient",
          },
          amount: {
            type: "number",
            description: "Quantity needed",
          },
          unit: {
            type: "string",
            description: "Unit of measurement (cups, tbsp, oz, etc.)",
          },
        },
        required: ["name"],
      },
    },
    instructions: {
      type: "array",
      description: "Step-by-step cooking instructions",
      items: {
        type: "object",
        properties: {
          stepNumber: {
            type: "integer",
            description: "Order of the step",
          },
          text: {
            type: "string",
            description: "Instruction text",
          },
        },
        required: ["stepNumber", "text"],
      },
    },
    tags: {
      type: "array",
      description: "Relevant tags (e.g., vegetarian, quick, comfort food)",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "ingredients", "instructions"],
};

export const EXTRACTION_PROMPT = `You are a recipe extraction expert. Analyze the provided content and extract a complete recipe.

Extract the following information:
- Title: The name of the dish
- Description: A brief appetizing description
- Prep time and cook time in minutes
- Number of servings
- Difficulty level (easy, medium, or hard)
- Cuisine type
- Complete ingredient list with amounts and units
- Step-by-step instructions
- Relevant tags

If any information is not explicitly stated, make reasonable estimates based on the recipe type.
For ingredients without specific amounts, estimate reasonable quantities.
Number the instructions in logical cooking order.

Return ONLY valid JSON matching the schema. Do not include any other text.`;

// Enhanced schema for video recipe extraction with richer fields
export const VIDEO_RECIPE_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The name of the recipe",
    },
    description: {
      type: "string",
      description: "A brief description of the dish",
    },
    prepTime: {
      type: "integer",
      description: "Preparation time in minutes",
    },
    cookTime: {
      type: "integer",
      description: "Cooking time in minutes",
    },
    servings: {
      type: "integer",
      description: "Number of servings",
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"],
      description: "Difficulty level of the recipe",
    },
    cuisine: {
      type: "string",
      description: "Type of cuisine (e.g., Italian, Mexican, Asian)",
    },
    notes: {
      type: "string",
      description: "General recipe notes, chef commentary, or tips mentioned in the video",
    },
    ingredients: {
      type: "array",
      description: "List of ingredients with amounts and categories",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the ingredient",
          },
          amount: {
            type: "number",
            description: "Quantity needed",
          },
          unit: {
            type: "string",
            description: "Unit of measurement (cups, tbsp, oz, etc.)",
          },
          category: {
            type: "string",
            enum: [
              "produce",
              "proteins",
              "dairy",
              "bakery",
              "frozen",
              "pantry",
              "spices",
              "condiments",
              "beverages",
              "snacks",
              "household",
              "other",
            ],
            description: "Grocery category for this ingredient",
          },
          notes: {
            type: "string",
            description: "Preparation notes (e.g., 'finely diced', 'room temperature')",
          },
          substitutes: {
            type: "array",
            items: { type: "string" },
            description: "Alternative ingredients mentioned by the chef (e.g., 'you can also use X')",
          },
        },
        required: ["name"],
      },
    },
    instructions: {
      type: "array",
      description: "Step-by-step cooking instructions",
      items: {
        type: "object",
        properties: {
          stepNumber: {
            type: "integer",
            description: "Order of the step",
          },
          text: {
            type: "string",
            description: "Instruction text",
          },
          duration: {
            type: "integer",
            description: "Duration of this step in minutes",
          },
          timestamp: {
            type: "string",
            description: "Video timestamp where this step occurs (e.g., '2:30')",
          },
          technique: {
            type: "string",
            description: "Cooking technique used (e.g., 'saute', 'fold', 'braise', 'blanch')",
          },
          tip: {
            type: "string",
            description: "Chef tip or advice observed during this step",
          },
        },
        required: ["stepNumber", "text"],
      },
    },
    tags: {
      type: "array",
      description: "Relevant tags (e.g., vegetarian, quick, comfort food)",
      items: {
        type: "string",
      },
    },
  },
  required: ["title", "ingredients", "instructions"],
};

export const VIDEO_EXTRACTION_PROMPT = `You are a culinary expert analyzing a cooking video. Extract a complete, detailed recipe by carefully watching the video.

Pay close attention to:
- VISUAL: Ingredients shown on screen, cooking techniques demonstrated, plating
- AUDIO: Spoken ingredient amounts, timing cues, tips, and substitution suggestions
- ON-SCREEN TEXT: Recipe cards, ingredient lists, or captions displayed in the video

Extract the following:
- Title: The exact recipe name
- Description: A brief appetizing description
- Prep time and cook time in minutes
- Number of servings
- Difficulty level (easy, medium, or hard)
- Cuisine type
- Complete ingredient list with:
  - Precise amounts and units
  - Category (produce, proteins, dairy, bakery, frozen, pantry, spices, condiments, beverages, snacks, household, other)
  - Preparation notes (e.g., "finely diced", "room temperature")
  - Any substitutes the chef mentions
- Step-by-step instructions with:
  - Video timestamps for each major step
  - Cooking techniques used (e.g., saute, fold, braise, blanch, roast)
  - Chef tips or advice for each step
  - Duration for time-sensitive steps
- General notes: Any overall tips, storage advice, or variations mentioned
- Relevant tags

If any information is not explicitly stated, make reasonable estimates based on what you observe.
Return ONLY valid JSON matching the schema.`;

// Structured schema for pantry scanner (replaces fragile JSON parsing)
export const PANTRY_SCAN_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Common product name (e.g., 'Eggs', 'Milk (2%)', 'Olive Oil')",
      },
      quantity: {
        type: "number",
        description: "Estimated amount (number only)",
      },
      unit: {
        type: "string",
        description: "Appropriate unit (pcs, L, mL, g, kg, bottle, can, bag, box)",
      },
      category: {
        type: "string",
        enum: [
          "produce",
          "proteins",
          "dairy",
          "bakery",
          "pantry",
          "spices",
          "condiments",
          "beverages",
          "snacks",
          "frozen",
          "household",
          "other",
        ],
        description: "Product category",
      },
      confidence: {
        type: "number",
        description: "Confidence level from 0.0 to 1.0",
      },
    },
    required: ["name", "quantity", "unit", "category", "confidence"],
  },
};

export { genAI };
