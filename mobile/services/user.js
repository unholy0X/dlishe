import { authFetch } from "./api";

export async function getMe({ getToken }) {
  return authFetch("/users/me", getToken);
}

export async function updatePreferences({ preferredUnitSystem, getToken }) {
  return authFetch("/users/me/preferences", getToken, {
    method: "PATCH",
    body: JSON.stringify({ preferredUnitSystem }),
  });
}
