// Recipe Extraction Logic
import {
  geminiModel,
  RECIPE_SCHEMA,
  EXTRACTION_PROMPT,
  VIDEO_RECIPE_SCHEMA,
  VIDEO_EXTRACTION_PROMPT,
  buildVideoExtractionPrompt,
} from "./gemini";
import { fetchYouTubeMetadata, type YouTubeMetadata } from "./youtube";
import { fetchTikTokMetadata, type TikTokMetadata } from "./tiktok";
import type { Recipe, Ingredient, Instruction, IngredientCategory } from "@/types";
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
  notes?: string;
  ingredients: Array<{
    name: string;
    amount?: number;
    unit?: string;
    category?: IngredientCategory;
    notes?: string;
    substitutes?: string[];
  }>;
  instructions: Array<{
    stepNumber: number;
    text: string;
    duration?: number;
    timestamp?: string;
    technique?: string;
    tip?: string;
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
 * Extract recipe from YouTube video using native Gemini video analysis (video-only)
 */
async function extractFromYouTubeVideo(url: string): Promise<ExtractedRecipeData> {
  const result = await geminiModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { fileData: { mimeType: "video/*", fileUri: url } },
        { text: VIDEO_EXTRACTION_PROMPT },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIDEO_RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from YouTube video with description cross-reference (primary path)
 */
async function extractFromYouTubeVideoWithDescription(
  url: string,
  metadata: YouTubeMetadata
): Promise<ExtractedRecipeData> {
  const prompt = buildVideoExtractionPrompt(metadata.description, metadata.timestamps);

  const result = await geminiModel.generateContent({
    contents: [{
      role: "user",
      parts: [
        { fileData: { mimeType: "video/*", fileUri: url } },
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIDEO_RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from YouTube description only (fallback when video analysis fails)
 */
async function extractFromYouTubeDescription(
  metadata: YouTubeMetadata
): Promise<ExtractedRecipeData> {
  const timestampSection =
    metadata.timestamps.length > 0
      ? `\nTIMESTAMPS:\n${metadata.timestamps.map((t) => `${t.time} - ${t.label}`).join("\n")}`
      : "";

  const prompt = `Extract a complete recipe from this YouTube video description.

VIDEO TITLE: ${metadata.title}
CHANNEL: ${metadata.channelName}

DESCRIPTION:
"""
${metadata.description}
"""
${timestampSection}

Extract all recipe information including ingredients with amounts, step-by-step instructions, cooking times, and any tips mentioned.
Return ONLY valid JSON matching the schema.`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIDEO_RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from YouTube video with strict quality fallback chain:
 * 1. Video + Description (richest extraction)
 * 2. Description-only (if video analysis fails but description available)
 * 3. Video-only (if no description available)
 * 4. Error (no URL-text guessing)
 */
async function extractFromYouTube(url: string): Promise<ExtractedRecipeData> {
  // Step 1: Fetch YouTube metadata (description, timestamps)
  const metadata = await fetchYouTubeMetadata(url);

  // Step 2: Try video + description (richest extraction)
  if (metadata?.description) {
    try {
      return await extractFromYouTubeVideoWithDescription(url, metadata);
    } catch (videoError) {
      console.warn("Video+description analysis failed:", videoError);

      // Step 3: Fallback to description-only (still quality data)
      try {
        return await extractFromYouTubeDescription(metadata);
      } catch (descError) {
        console.warn("Description-only analysis failed:", descError);
      }
    }
  }

  // Step 4: Try video-only if no description available
  try {
    return await extractFromYouTubeVideo(url);
  } catch (videoOnlyError) {
    console.warn("Video-only analysis failed:", videoOnlyError);
  }

  // NO URL-text fallback — fail gracefully instead of guessing
  throw new Error("Unable to extract recipe from this video. Please try again later.");
}

/**
 * Extract recipe from TikTok video caption using oEmbed API
 * Since we can't analyze TikTok video content directly, we extract from the caption
 */
async function extractFromTikTok(url: string): Promise<ExtractedRecipeData> {
  // Step 1: Fetch TikTok metadata via oEmbed
  const metadata = await fetchTikTokMetadata(url);

  if (!metadata?.title) {
    throw new Error("Unable to fetch TikTok video information. Please try pasting the caption manually.");
  }

  // Step 2: Extract recipe from the caption (title contains the full caption)
  const prompt = `Extract a complete recipe from this TikTok video caption.

CREATOR: ${metadata.authorName}

CAPTION:
"""
${metadata.title}
"""

This is from a cooking video on TikTok. Extract all recipe information you can find including:
- Recipe title (infer from the caption content)
- Ingredients with amounts (look for ingredient lists, quantities mentioned)
- Step-by-step instructions (infer logical cooking order from ingredients/context)
- Any tips or notes mentioned

If exact amounts aren't specified, make reasonable estimates based on the recipe type.
Return ONLY valid JSON matching the schema.`;

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIDEO_RECIPE_SCHEMA as any,
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Detailed prompt for website recipe extraction
 * Preserves ingredient/instruction groups and all details
 */
const WEBSITE_EXTRACTION_PROMPT = `You are a recipe extraction expert. Extract the COMPLETE recipe from this webpage with FULL details.

CRITICAL: Extract EVERYTHING exactly as shown on the page. Do not summarize or shorten.

For INGREDIENTS:
- Extract ALL ingredients with EXACT measurements (e.g., "1 1/2 cups", "2 tablespoons")
- If ingredients are grouped (e.g., "For the Dough:", "For the Sauce:"), add the group name as a separate ingredient with "---" prefix like "--- For the Dough ---"
- Include ALL preparation notes (e.g., "finely diced", "room temperature", "divided")
- Count the ingredients - recipes typically have 10-30 ingredients

For INSTRUCTIONS:
- Extract ALL steps with COMPLETE text - do not summarize
- If instructions are grouped (e.g., "For the Dough:", "Make the Sauce:"), add the group name as a step with "**" markers like "**For the Dough**"
- Include all timing details (e.g., "cook for 15-20 minutes until golden")
- Include all technique details (e.g., "fold gently", "whisk until emulsified")
- Count the steps - recipes typically have 5-15 detailed steps

IMPORTANT:
- Every ingredient on the page must be in your output
- Every instruction step on the page must be in your output
- Do not combine or summarize steps
- Preserve the exact wording from the recipe

Website URL: {URL}

Return ONLY valid JSON matching the schema.`;

/**
 * Extract recipe from website URL using Gemini AI
 */
async function extractFromWebsiteWithGemini(url: string): Promise<ExtractedRecipeData> {
  const prompt = WEBSITE_EXTRACTION_PROMPT.replace("{URL}", url);

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: VIDEO_RECIPE_SCHEMA as any, // Use richer schema
    },
  });

  const response = result.response;
  const text = response.text();
  return JSON.parse(text);
}

/**
 * Extract recipe from website URL
 * Uses Gemini AI for accurate, complete extraction
 */
async function extractFromWebsite(url: string): Promise<ExtractedRecipeData> {
  // Use Gemini directly for consistent, accurate extraction
  // Gemini can read any webpage structure and extract complete recipe data
  console.log("Extracting recipe from website with Gemini AI");
  return await extractFromWebsiteWithGemini(url);
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
    notes: ing.notes,
    category: ing.category || "other",
    substitutes: ing.substitutes,
  }));

  const instructions: Instruction[] = data.instructions.map((inst, idx) => ({
    id: generateId(),
    stepNumber: inst.stepNumber || idx + 1,
    text: inst.text,
    duration: inst.duration,
    timestamp: inst.timestamp,
    technique: inst.technique,
    tip: inst.tip,
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
    notes: data.notes,
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
        extractedData = await extractFromTikTok(url);
        break;

      case "instagram":
        return {
          success: false,
          error: "Instagram links require manual paste. Please copy the video description and use 'Paste Description' option.",
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
