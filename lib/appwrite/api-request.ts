import { CSRF_HEADER_NAME, CSRF_TOKEN_NAME } from "../constants";
import { getCookie } from "../utils";

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const csrfToken = getCookie(CSRF_TOKEN_NAME);
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (csrfToken && !headers.has(CSRF_HEADER_NAME)) {
    headers.set(CSRF_HEADER_NAME, csrfToken);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    // Plan limit responses carry a machine code in `error` and the readable reason in `message`.
    const message = error.error === "PLAN_LIMIT" && error.message ? error.message : error.error;
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json();
}
