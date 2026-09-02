export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Authenticated fetch wrapper.
 * Automatically reads the JWT from localStorage and injects the
 * Authorization header on every request to the backend.
 */
export function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;

  const headers: HeadersInit = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
