import { authFetch } from "./api";

export async function getSubscription({ getToken }) {
  return authFetch("/subscription", getToken);
}

export async function refreshSubscription({ getToken }) {
  return authFetch("/subscription/refresh", getToken, { method: "POST" });
}
