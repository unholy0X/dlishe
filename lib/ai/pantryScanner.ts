// AI-Powered Pantry Scanner
// Uses Gemini to analyze images and identify pantry items

import { geminiModel } from '@/lib/gemini';
import * as FileSystem from 'expo-file-system/legacy';
import type { IngredientCategory, CommonItem } from '@/types';

// Types for scanned items
export interface ScannedItem {
  name: string;
  quantity: number;
  unit: string;
  category: IngredientCategory;
  confidence: number;
  matchedCommonItem?: CommonItem;
  isSelected: boolean;
}

export interface ScanResult {
  items: ScannedItem[];
  processingTime: number;
  imageCount: number;
  error?: string;
}

// Prompt for pantry image analysis
const PANTRY_SCAN_PROMPT = `Analyze this kitchen/pantry image and identify all visible food items and household products.

For each item you can clearly identify, provide:
1. name: Common product name (e.g., "Eggs", "Milk (2%)", "Olive Oil")
2. quantity: Estimated amount (number only)
3. unit: Appropriate unit (pcs, L, mL, g, kg, bottle, can, bag, box)
4. category: One of these exact values: produce, proteins, dairy, bakery, pantry, spices, condiments, beverages, snacks, frozen, household, other
5. confidence: Your confidence level from 0.0 to 1.0

Response format - return ONLY a valid JSON array, no other text:
[
  {"name": "Eggs (Large)", "quantity": 12, "unit": "pcs", "category": "dairy", "confidence": 0.95},
  {"name": "Milk (2%)", "quantity": 1, "unit": "L", "category": "dairy", "confidence": 0.9}
]

Important rules:
- Use metric units (g, kg, mL, L) for weights/volumes
- Use "pcs" for countable items
- Be specific with variants (e.g., "Onions (Red)" not just "Onions")
- Only include items you can clearly identify
- Set lower confidence for partially visible items
- If no items are found, return an empty array: []
- Return ONLY the JSON array, no markdown formatting or explanation`;

// Convert image URI to base64
async function imageToBase64(uri: string): Promise<string> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
    return base64;
  } catch (error) {
    console.error('Error reading image:', error);
    throw new Error('Failed to read image file');
  }
}

// Get MIME type from URI
function getMimeType(uri: string): string {
  const extension = uri.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

// Parse AI response into structured items
function parseAIResponse(responseText: string): Omit<ScannedItem, 'matchedCommonItem' | 'isSelected'>[] {
  try {
    // Clean up response - remove markdown formatting if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    if (!Array.isArray(parsed)) {
      console.warn('AI response is not an array');
      return [];
    }

    // Validate and normalize each item
    return parsed.map((item: any) => ({
      name: String(item.name || 'Unknown Item'),
      quantity: Number(item.quantity) || 1,
      unit: String(item.unit || 'pcs'),
      category: validateCategory(item.category),
      confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.5)),
    }));
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Response text:', responseText);
    return [];
  }
}

// Validate category is one of our valid categories
function validateCategory(category: string): IngredientCategory {
  const validCategories: IngredientCategory[] = [
    'produce', 'proteins', 'dairy', 'bakery', 'pantry', 'spices',
    'condiments', 'beverages', 'snacks', 'frozen', 'household', 'other'
  ];

  if (validCategories.includes(category as IngredientCategory)) {
    return category as IngredientCategory;
  }
  return 'other';
}

// Fuzzy match score between two strings (0-1)
function fuzzyMatchScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Check word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2)));

  if (commonWords.length > 0) {
    return 0.6 + (commonWords.length / Math.max(words1.length, words2.length)) * 0.3;
  }

  return 0;
}

// Match scanned items to common items catalog
export function matchToCommonItems(
  scannedItems: Omit<ScannedItem, 'matchedCommonItem' | 'isSelected'>[],
  commonItems: CommonItem[]
): ScannedItem[] {
  return scannedItems.map((item) => {
    // Find best match in common items
    let bestMatch: CommonItem | undefined;
    let bestScore = 0;

    for (const commonItem of commonItems) {
      // Check name match
      const nameScore = fuzzyMatchScore(item.name, commonItem.name);

      // Check keyword match
      const keywordScore = commonItem.keywords?.some(keyword =>
        item.name.toLowerCase().includes(keyword.toLowerCase())
      ) ? 0.7 : 0;

      // Category bonus
      const categoryBonus = item.category === commonItem.category ? 0.1 : 0;

      const totalScore = Math.max(nameScore, keywordScore) + categoryBonus;

      if (totalScore > bestScore && totalScore >= 0.6) {
        bestScore = totalScore;
        bestMatch = commonItem;
      }
    }

    // Build final scanned item
    const finalItem: ScannedItem = {
      name: bestMatch?.name || item.name, // Use catalog name if matched
      quantity: item.quantity,
      unit: bestMatch?.defaultUnit || item.unit, // Use catalog unit if matched
      category: bestMatch?.category || item.category,
      confidence: bestMatch
        ? Math.min(1, item.confidence + 0.1) // Boost confidence if matched
        : item.confidence,
      matchedCommonItem: bestMatch,
      isSelected: item.confidence >= 0.5, // Auto-select confident items
    };

    return finalItem;
  });
}

// Main function to scan pantry images
export async function scanPantryImages(
  imageUris: string[],
  commonItems: CommonItem[]
): Promise<ScanResult> {
  const startTime = Date.now();

  try {
    if (imageUris.length === 0) {
      return {
        items: [],
        processingTime: 0,
        imageCount: 0,
        error: 'No images provided',
      };
    }

    // Convert images to base64 for Gemini
    const imageParts = await Promise.all(
      imageUris.map(async (uri) => ({
        inlineData: {
          data: await imageToBase64(uri),
          mimeType: getMimeType(uri),
        },
      }))
    );

    // Call Gemini with images
    const result = await geminiModel.generateContent([
      PANTRY_SCAN_PROMPT,
      ...imageParts,
    ]);

    const response = await result.response;
    const responseText = response.text();

    // Parse the response
    const rawItems = parseAIResponse(responseText);

    // Match to common items catalog
    const matchedItems = matchToCommonItems(rawItems, commonItems);

    return {
      items: matchedItems,
      processingTime: Date.now() - startTime,
      imageCount: imageUris.length,
    };
  } catch (error) {
    console.error('Pantry scan error:', error);
    return {
      items: [],
      processingTime: Date.now() - startTime,
      imageCount: imageUris.length,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Export types for use in components
export type { CommonItem };
