import { authFetch } from "./api";

export async function getMe({ getToken }) {
  return authFetch("/users/me", getToken);
}

export async function updatePreferences({ preferredUnitSystem, preferredLanguage, getToken }) {
  const body = {};
  if (preferredUnitSystem !== undefined) body.preferredUnitSystem = preferredUnitSystem;
  if (preferredLanguage !== undefined) body.preferredLanguage = preferredLanguage;
  return authFetch("/users/me/preferences", getToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteAccount({ getToken }) {
  return authFetch("/users/me", getToken, { method: "DELETE" });
}
