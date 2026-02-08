const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://api.dlishe.com/api/v1";

export async function apiFetch(path, { token, ...options } = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
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
}

/**
 * Authenticated fetch that calls getToken fresh each time (prevents stale tokens).
 */
export async function authFetch(path, getToken, options = {}) {
  const token = await getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }
  return apiFetch(path, { token, ...options });
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
