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

export { genAI };
