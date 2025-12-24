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
    try {
      const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);

      if (!jwtToken) {
        return originalFetch(input, init);
      }

      // Handle headers properly - convert to Headers object if needed
      let headers: Headers;
      if (init?.headers instanceof Headers) {
        headers = new Headers(init.headers);
      } else if (Array.isArray(init?.headers)) {
        headers = new Headers(init.headers);
      } else if (init?.headers && typeof init.headers === 'object') {
        headers = new Headers(init.headers as Record<string, string>);
      } else {
        headers = new Headers();
      }

      // Only add Authorization header if it doesn't already exist
      if (!headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${jwtToken}`);
      }

      const nextInit: RequestInit = {
        ...init,
        headers,
      };

      return originalFetch(input, nextInit);
    } catch (error) {
      // If there's an error in the patch logic, fall back to original fetch
      console.error("Error in auth fetch patch:", error);
      return originalFetch(input, init);
    }
  }) as typeof window.fetch;

  fetchPatched = true;
}

