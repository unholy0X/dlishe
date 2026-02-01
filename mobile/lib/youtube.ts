// YouTube Metadata Fetcher
// Fetches video metadata (description, timestamps) by parsing YouTube page HTML

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  description: string;
  channelName: string;
  timestamps: Array<{ time: string; label: string }>;
}

/**
 * Extract video ID from various YouTube URL formats
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    // Standard watch URL: youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    // Short URL: youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    // Shorts URL: youtube.com/shorts/VIDEO_ID
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
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
 * Parse timestamps from description text
 * Matches formats like: "2:30 - Making sauce", "02:30 Making sauce", "(2:30) Sauce"
 */
export function parseTimestamps(
  description: string
): Array<{ time: string; label: string }> {
  const timestamps: Array<{ time: string; label: string }> = [];

  // Match timestamps in various formats
  // Captures: optional parenthesis, time (MM:SS or HH:MM:SS), optional separator, label
  const timestampRegex =
    /(?:\()?(\d{1,2}:\d{2}(?::\d{2})?)(?:\))?\s*[-–—:]?\s*([^\n\r]+?)(?=\n|\r|$|\d{1,2}:\d{2})/g;

  let match;
  while ((match = timestampRegex.exec(description)) !== null) {
    const time = match[1].trim();
    const label = match[2].trim();

    // Skip if label is too short or looks like just another timestamp
    if (label.length > 2 && !/^\d{1,2}:\d{2}/.test(label)) {
      timestamps.push({ time, label });
    }
  }

  return timestamps;
}

/**
 * Fetch and parse YouTube page for metadata
 * Returns null on failure (doesn't throw) to allow graceful fallback
 */
export async function fetchYouTubeMetadata(
  url: string
): Promise<YouTubeMetadata | null> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    return null;
  }

  try {
    // Use standard watch URL for consistent page structure
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Fetch with 5-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(watchUrl, {
      signal: controller.signal,
      headers: {
        // Mimic a browser to get full page content
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Try to extract metadata from ytInitialPlayerResponse JSON
    const metadata = parseYouTubeHtml(html, videoId);

    return metadata;
  } catch {
    return null;
  }
}

/**
 * Parse YouTube page HTML to extract metadata
 */
function parseYouTubeHtml(html: string, videoId: string): YouTubeMetadata | null {
  let title = "";
  let description = "";
  let channelName = "";

  // Primary: Extract from ytInitialPlayerResponse JSON
  // This contains the full, untruncated description
  const playerResponseMatch = html.match(
    /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\});/
  );

  if (playerResponseMatch && playerResponseMatch[1]) {
    try {
      // Find the JSON object more carefully - it ends at the first }; that completes the object
      const jsonStr = extractJsonObject(playerResponseMatch[1]);
      if (jsonStr) {
        const playerResponse = JSON.parse(jsonStr);

        if (playerResponse.videoDetails) {
          title = playerResponse.videoDetails.title || "";
          description = playerResponse.videoDetails.shortDescription || "";
          channelName = playerResponse.videoDetails.author || "";
        }
      }
    } catch (e) {
      console.warn("Failed to parse ytInitialPlayerResponse:", e);
    }
  }

  // Fallback: Try ytInitialData for additional info
  if (!description) {
    const initialDataMatch = html.match(
      /var\s+ytInitialData\s*=\s*(\{[\s\S]+?\});/
    );

    if (initialDataMatch && initialDataMatch[1]) {
      try {
        const jsonStr = extractJsonObject(initialDataMatch[1]);
        if (jsonStr) {
          const initialData = JSON.parse(jsonStr);

          // Navigate the complex structure to find description
          const contents =
            initialData?.contents?.twoColumnWatchNextResults?.results?.results
              ?.contents;
          if (Array.isArray(contents)) {
            for (const content of contents) {
              const videoSecondaryInfo =
                content?.videoSecondaryInfoRenderer;
              if (videoSecondaryInfo?.attributedDescription?.content) {
                description = videoSecondaryInfo.attributedDescription.content;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse ytInitialData:", e);
      }
    }
  }

  // Last resort fallback: Meta description tag (truncated but reliable)
  if (!title) {
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/);
    if (titleMatch) {
      title = decodeHtmlEntities(titleMatch[1]);
    }
  }

  if (!description) {
    const metaMatch = html.match(
      /<meta\s+name="description"\s+content="([^"]+)"/
    );
    if (metaMatch) {
      description = decodeHtmlEntities(metaMatch[1]);
    }
  }

  // If we still don't have a description, return null
  if (!description) {
    console.warn("Could not extract description from YouTube page");
    return null;
  }

  // Truncate very long descriptions to stay within token limits
  const maxDescLength = 8000;
  if (description.length > maxDescLength) {
    description = description.substring(0, maxDescLength) + "...";
  }

  // Parse timestamps from description
  const timestamps = parseTimestamps(description);

  return {
    videoId,
    title,
    description,
    channelName,
    timestamps,
  };
}

/**
 * Extract a complete JSON object from a string that may have trailing content
 */
function extractJsonObject(str: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          return str.substring(0, i + 1);
        }
      }
    }
  }

  return null;
}

/**
 * Decode HTML entities in a string
 */
function decodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&#x27;": "'",
    "&#x2F;": "/",
    "&#47;": "/",
  };

  return str.replace(
    /&(?:amp|lt|gt|quot|apos|#39|#x27|#x2F|#47);/g,
    (match) => entities[match] || match
  );
}
