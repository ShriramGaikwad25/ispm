import { COOKIE_NAMES, getCookie } from "@/lib/auth";

let fetchPatched = false;

/**
 * Ensures that the global fetch function attaches the JWT bearer token (when available)
 * to every outbound request from the browser. Safe to call multiple times.
 */
export function ensureAuthFetchPatched(): void {
  if (fetchPatched) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);

    if (!jwtToken) {
      return originalFetch(input, init);
    }

    const headers = new Headers(init?.headers ?? {});
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${jwtToken}`);
    }

    const nextInit: RequestInit = {
      ...init,
      headers,
    };

    return originalFetch(input, nextInit);
  }) as typeof window.fetch;

  fetchPatched = true;
}

