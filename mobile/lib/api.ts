const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.dlishe.com/api/v1";

export type GetTokenFn = () => Promise<string | null>;

/**
 * Make an authenticated API request
 */
export async function authFetch<T>(
  path: string,
  getToken: GetTokenFn,
  options?: RequestInit
): Promise<T> {
  const token = await getToken();

  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

/**
 * Make an unauthenticated API request
 */
export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? `Request failed (${res.status})`);
  }

  return res.json();
}
