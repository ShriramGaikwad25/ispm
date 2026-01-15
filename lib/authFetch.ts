import { COOKIE_NAMES, getCookie } from "@/lib/auth";

let fetchPatched = false;
let originalFetch: typeof window.fetch | null = null;

/**
 * Gets the original fetch function before it was patched
 * This is useful for requests that need to bypass the JWT token patch
 * Captures the original fetch on first call (before patching) or returns stored original
 */
export function getOriginalFetch(): typeof window.fetch {
  if (typeof window === "undefined") {
    throw new Error("getOriginalFetch can only be called in browser environment");
  }
  // If we already have the original fetch stored, return it
  if (originalFetch) {
    return originalFetch;
  }
  // Capture the original fetch now (before any patching happens)
  // This ensures we always get the true original, even if called before ensureAuthFetchPatched
  originalFetch = window.fetch.bind(window);
  return originalFetch;
}

/**
 * Ensures that the global fetch function attaches the JWT bearer token (when available)
 * to every outbound request from the browser. Safe to call multiple times.
 */
export function ensureAuthFetchPatched(): void {
  if (fetchPatched) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);

      if (!jwtToken) {
        return originalFetch!(input, init);
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

      return originalFetch!(input, nextInit);
    } catch (error) {
      // If there's an error in the patch logic, fall back to original fetch
      console.error("Error in auth fetch patch:", error);
      return originalFetch!(input, init);
    }
  }) as typeof window.fetch;

  fetchPatched = true;
}

