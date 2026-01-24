// Recipe Extraction Logic
import { geminiModel, RECIPE_SCHEMA, EXTRACTION_PROMPT } from "./gemini";
import type { Recipe, Ingredient, Instruction } from "@/types";
import { generateId } from "./database";

export type UrlType = "youtube" | "tiktok" | "instagram" | "website" | "unknown" | "manual";

export interface ExtractionResult {
  success: boolean;
  recipe?: Partial<Recipe>;
  error?: string;
  sourceType: UrlType;
}

interface ExtractedRecipeData {
  title: string;
  description?: string;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: "easy" | "medium" | "hard";
  cuisine?: string;
  ingredients: Array<{
    name: string;
    amount?: number;
    unit?: string;
  }>;
  instructions: Array<{
    stepNumber: number;
    text: string;
  }>;
  tags?: string[];
}

/**
 * Detect the type of URL
 */
export function detectUrlType(url: string): UrlType {
  const normalizedUrl = url.toLowerCase().trim();

  if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) {
    return "youtube";
  }
  if (normalizedUrl.includes("tiktok.com")) {
    return "tiktok";
  }
  if (normalizedUrl.includes("instagram.com") || normalizedUrl.includes("instagr.am")) {
    return "instagram";
  }
  if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")) {
    return "website";
  }
  return "unknown";
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract recipe from YouTube video
 */
async function extractFromYouTube(url: string): Promise<ExtractedRecipeData> {
  const prompt = `${EXTRACTION_PROMPT}

Analyze this YouTube cooking video and extract the complete recipe. Pay attention to:
- What the chef says about ingredients and amounts
- The cooking steps shown in the video
- Any tips or techniques mentioned

YouTube URL: ${url}`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from website URL
 */
async function extractFromWebsite(url: string): Promise<ExtractedRecipeData> {
  const prompt = `${EXTRACTION_PROMPT}

Extract the recipe from this webpage. Look for:
- Recipe title and description
- Ingredient lists with measurements
- Cooking instructions
- Prep time, cook time, and servings

Website URL: ${url}

Fetch the content from this URL and extract the recipe data.`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from pasted text (for TikTok/Instagram descriptions)
 */
export async function extractFromText(text: string): Promise<ExtractedRecipeData> {
  const prompt = `${EXTRACTION_PROMPT}

Extract the recipe from this text content (likely from a social media post or video description):

"""
${text}
"""

Even if the format is informal or uses shorthand, extract all recipe information you can find.`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const responseText = response.text();
  return JSON.parse(responseText);
}

/**
 * Convert extracted data to Recipe format
 */
function convertToRecipe(
  data: ExtractedRecipeData,
  sourceUrl: string,
  sourceType: UrlType
): Partial<Recipe> {
  const ingredients: Ingredient[] = data.ingredients.map((ing, idx) => ({
    id: generateId(),
    name: ing.name,
    amount: ing.amount,
    unit: ing.unit,
    category: "other",
  }));

  const instructions: Instruction[] = data.instructions.map((inst, idx) => ({
    id: generateId(),
    stepNumber: inst.stepNumber || idx + 1,
    text: inst.text,
  }));

  return {
    title: data.title,
    description: data.description,
    sourceUrl,
    sourceType: sourceType === "unknown" ? "manual" : sourceType,
    prepTime: data.prepTime,
    cookTime: data.cookTime,
    servings: data.servings,
    difficulty: data.difficulty,
    cuisine: data.cuisine,
    tags: data.tags,
    ingredients,
    instructions,
    isFavorite: false,
  };
}

/**
 * Main extraction function
 */
export async function extractRecipeFromUrl(url: string): Promise<ExtractionResult> {
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: "Invalid URL format",
      sourceType: "unknown",
    };
  }

  const urlType = detectUrlType(url);

  try {
    let extractedData: ExtractedRecipeData;

    switch (urlType) {
      case "youtube":
        extractedData = await extractFromYouTube(url);
        break;

      case "website":
        extractedData = await extractFromWebsite(url);
        break;

      case "tiktok":
      case "instagram":
        return {
          success: false,
          error: "TikTok and Instagram links require manual paste. Please copy the video description and use 'Paste Description' option.",
          sourceType: urlType,
        };

      default:
        return {
          success: false,
          error: "Unsupported URL type",
          sourceType: urlType,
        };
    }

    // Validate extracted data
    if (!extractedData.title || !extractedData.ingredients?.length) {
      return {
        success: false,
        error: "Could not extract a valid recipe from this URL. Please try a different link or add manually.",
        sourceType: urlType,
      };
    }

    const recipe = convertToRecipe(extractedData, url, urlType);

    return {
      success: true,
      recipe,
      sourceType: urlType,
    };
  } catch (error) {
    console.error("Recipe extraction error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Handle specific error cases
    if (errorMessage.includes("API key")) {
      return {
        success: false,
        error: "API key issue. Please check your Gemini API configuration.",
        sourceType: urlType,
      };
    }

    if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
      return {
        success: false,
        error: "API limit reached. Please try again later.",
        sourceType: urlType,
      };
    }

    return {
      success: false,
      error: `Failed to extract recipe: ${errorMessage}`,
      sourceType: urlType,
    };
  }
}

/**
 * Extract recipe from manually pasted text
 */
export async function extractRecipeFromText(
  text: string,
  sourceUrl?: string
): Promise<ExtractionResult> {
  if (!text.trim()) {
    return {
      success: false,
      error: "Please paste some text content",
      sourceType: "unknown",
    };
  }

  try {
    const extractedData = await extractFromText(text);

    if (!extractedData.title || !extractedData.ingredients?.length) {
      return {
        success: false,
        error: "Could not find a recipe in the pasted text. Please include ingredients and instructions.",
        sourceType: "unknown",
      };
    }

    const sourceType = sourceUrl ? detectUrlType(sourceUrl) : "manual";
    const recipe = convertToRecipe(
      extractedData,
      sourceUrl || "",
      sourceType === "unknown" ? "manual" : sourceType
    );

    return {
      success: true,
      recipe,
      sourceType: sourceType === "unknown" ? "manual" : sourceType,
    };
  } catch (error) {
    console.error("Text extraction error:", error);
    return {
      success: false,
      error: "Failed to extract recipe from text. Please try again.",
      sourceType: "unknown",
    };
  }
}
