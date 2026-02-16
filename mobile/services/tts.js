import * as FileSystem from "expo-file-system";
import { getApiBaseUrl } from "./api";

const TTS_CACHE_DIR = FileSystem.cacheDirectory + "tts/";

/**
 * Simple hash of a string to create deterministic filenames.
 */
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Ensure the TTS cache directory exists.
 */
async function ensureCacheDir() {
  const info = await FileSystem.getInfoAsync(TTS_CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(TTS_CACHE_DIR, { intermediates: true });
  }
}

/**
 * Synthesize speech for a given text and cache the resulting MP3 file.
 * Returns the local file URI.
 */
export async function synthesizeSpeech({ getToken, text, voice = "nova" }) {
  await ensureCacheDir();

  const filename = hashText(text) + ".mp3";
  const fileUri = TTS_CACHE_DIR + filename;

  // Return cached file if it exists
  const info = await FileSystem.getInfoAsync(fileUri);
  if (info.exists && info.size > 0) {
    return fileUri;
  }

  const token = await getToken();
  if (!token) throw new Error("Not authenticated");

  const baseUrl = getApiBaseUrl();
  const resp = await fetch(`${baseUrl}/tts/synthesize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!resp.ok) {
    throw new Error(`TTS request failed (${resp.status})`);
  }

  // Read the response as a blob, convert to base64 and write to file
  const blob = await resp.blob();
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // data:audio/mpeg;base64,XXXX — strip the prefix
      const result = reader.result;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return fileUri;
}

/**
 * Pre-generate audio for all cooking steps in parallel.
 * Returns a Map<stepIndex, fileUri>.
 */
export async function generateStepAudio({ getToken, steps }) {
  const results = new Map();

  const promises = steps.map(async (step, index) => {
    try {
      const uri = await synthesizeSpeech({
        getToken,
        text: step.instruction || "",
      });
      results.set(index, uri);
    } catch {
      // Silently skip failed steps — voice is best-effort
    }
  });

  await Promise.allSettled(promises);
  return results;
}

/**
 * Clear all cached TTS audio files.
 */
export async function clearTTSCache() {
  try {
    const info = await FileSystem.getInfoAsync(TTS_CACHE_DIR);
    if (info.exists) {
      await FileSystem.deleteAsync(TTS_CACHE_DIR, { idempotent: true });
    }
  } catch {
    // ignore cleanup errors
  }
}
