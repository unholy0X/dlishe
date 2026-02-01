// TikTok Metadata Fetcher
// Fetches video metadata using TikTok's public oEmbed API

export interface TikTokMetadata {
  videoId: string;
  title: string; // Contains the caption/description
  authorName: string;
  authorUrl: string;
  thumbnailUrl: string;
}

/**
 * Extract video ID from TikTok URL
 * Supports: tiktok.com/@user/video/ID, vm.tiktok.com/ID
 */
export function extractTikTokVideoId(url: string): string | null {
  const patterns = [
    // Standard URL: tiktok.com/@user/video/VIDEO_ID
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
    // Short URL: vm.tiktok.com/CODE (we'll use the full URL for oEmbed)
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Normalize TikTok URL for oEmbed API
 * Handles various URL formats
 */
function normalizeTikTokUrl(url: string): string {
  // Remove query parameters and trailing slashes
  const cleanUrl = url.split("?")[0].replace(/\/$/, "");
  return cleanUrl;
}

/**
 * Fetch TikTok video metadata using oEmbed API
 * Returns null on failure to allow graceful fallback
 */
export async function fetchTikTokMetadata(
  url: string
): Promise<TikTokMetadata | null> {
  try {
    const normalizedUrl = normalizeTikTokUrl(url);
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(normalizedUrl)}`;

    // Fetch with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("TikTok oEmbed failed with status:", response.status);
      return null;
    }

    const data = await response.json();

    // Validate required fields
    if (!data.title) {
      console.warn("TikTok oEmbed response missing title");
      return null;
    }

    // Extract video ID from the URL if not directly available
    const videoId = extractTikTokVideoId(url) || "unknown";

    return {
      videoId,
      title: data.title, // This contains the caption
      authorName: data.author_name || "",
      authorUrl: data.author_url || "",
      thumbnailUrl: data.thumbnail_url || "",
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("TikTok oEmbed fetch timed out");
    } else {
      console.warn("TikTok oEmbed fetch error:", error);
    }
    return null;
  }
}
