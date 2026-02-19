import { useDemoStore } from "../store/demoStore";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.dlishe.com/api/v1";

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export async function apiFetch(path, { token, timeout = DEFAULT_TIMEOUT, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      // 401 — never show raw "Invalid token" / "Missing token" to the user.
      // This covers expired sessions, misconfigured tokens, and transient
      // auth service failures equally. The user sees one clear action.
      if (res.status === 401) {
        throw new Error("Your session has expired. Please sign out and sign back in.");
      }

      let message = `Request failed (${res.status})`;
      try {
        const body = await res.json();
        message = body?.error?.message || body?.message || message;
      } catch {
        // ignore JSON parse errors
      }
      throw new Error(message);
    }

    if (res.status === 204) return undefined;
    return res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Authenticated fetch that calls getToken fresh each time (prevents stale tokens).
 * In demo mode the Clerk token is bypassed and the static demo token is used instead.
 */
export async function authFetch(path, getToken, options = {}) {
  // Demo mode — bypass Clerk entirely and use the static demo token.
  const demoState = useDemoStore.getState();
  if (demoState.isDemoMode) {
    const demoToken = demoState.getToken();
    return apiFetch(path, { token: demoToken, ...options });
  }

  let token;
  try {
    token = await getToken();
  } catch (err) {
    const msg = (err?.message || "").toLowerCase();
    if (msg.includes("network request failed") || msg.includes("failed to fetch")) {
      throw new Error("Network request failed");
    }
    throw new Error("Sign-in session is temporarily unavailable. Please try again shortly.");
  }
  if (!token) {
    throw new Error("Sign-in session is temporarily unavailable. Please try again shortly.");
  }
  return apiFetch(path, { token, ...options });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
