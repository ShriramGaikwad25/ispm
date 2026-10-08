import { COOKIE_NAMES, getCookie, refreshJWTToken, forceLogout } from "@/lib/auth";
import { getActiveTenantId } from "@/lib/tenant";
import { isAssuranceApiUrl } from "@/lib/assurance-api";

let fetchPatched = false;
let originalFetch: typeof window.fetch | null = null;

/** True when the current request is our own retry after token refresh (avoids infinite loop) */
const RETRY_HEADER = "X-Internal-Token-Retry";

function requestUrl(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
}

function isKeyforgeRequest(input: RequestInfo | URL): boolean {
  const url = requestUrl(input);
  return typeof url === "string" && url.includes("keyforge.ai");
}

/** Continuous Assurance service calls (Assurance Events pages) — kept separate, never touched here. */
function isAssuranceRequest(input: RequestInfo | URL): boolean {
  const url = requestUrl(input);
  return typeof url === "string" && isAssuranceApiUrl(url);
}

/** Same-origin calls to our Next.js API routes, which proxy to Keyforge server-side. */
function isOwnApiRequest(input: RequestInfo | URL): boolean {
  const url = requestUrl(input);
  if (typeof url !== "string" || isAssuranceApiUrl(url)) return false;
  if (url.startsWith("/api/")) return true;
  return typeof window !== "undefined" && url.startsWith(`${window.location.origin}/api/`);
}

function needsTenantHeader(input: RequestInfo | URL): boolean {
  return isKeyforgeRequest(input) || isOwnApiRequest(input);
}

/** Builds a Headers object from any RequestInit["headers"] shape. */
function toHeaders(headers: HeadersInit | undefined): Headers {
  if (headers instanceof Headers) return new Headers(headers);
  if (Array.isArray(headers)) return new Headers(headers);
  if (headers && typeof headers === "object") return new Headers(headers as Record<string, string>);
  return new Headers();
}

/** Adds X-Tenant-Id (from the active tenant) to every Keyforge / own-API request that doesn't already set it. */
function withTenantHeader(input: RequestInfo | URL, init: RequestInit | undefined): RequestInit | undefined {
  if (!needsTenantHeader(input)) return init;
  const tenantId = getActiveTenantId();
  if (!tenantId) return init;

  const headers = toHeaders(init?.headers);
  if (!headers.has("X-Tenant-Id")) {
    headers.set("X-Tenant-Id", tenantId);
  }
  return { ...init, headers };
}

function isTokenExpiredBody(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  const status = String(o.status ?? o.Status ?? "").toLowerCase();
  const msg = String(o.errorMessage ?? o.error_message ?? o.ErrorMessage ?? "").trim().toLowerCase();
  return status === "error" && msg === "token expired";
}

/**
 * Gets the original fetch function before it was patched
 * This is useful for requests that need to bypass the JWT token patch
 * Captures the original fetch on first call (before patching) or returns stored original
 */
export function getOriginalFetch(): typeof window.fetch {
  if (typeof window === "undefined") {
    throw new Error("getOriginalFetch can only be called in browser environment");
  }
  if (!originalFetch) {
    originalFetch = window.fetch.bind(window);
  }
  const rawFetch = originalFetch;
  // Still "original" w.r.t. the 401-retry/refresh logic below — but every caller of
  // getOriginalFetch() deliberately bypasses that logic while still needing X-Tenant-Id.
  return ((input: RequestInfo | URL, init?: RequestInit) =>
    rawFetch(input, withTenantHeader(input, init))) as typeof window.fetch;
}

/**
 * Ensures that the global fetch function:
 * - Attaches the JWT bearer token when available
 * - On 401/403 or response body "Token Expired": refresh JWT using access token, retry once
 * - On refresh failure (access token expired): call logout
 * Safe to call multiple times.
 */
export function ensureAuthFetchPatched(): void {
  if (fetchPatched) return;
  if (typeof window === "undefined" || typeof window.fetch !== "function") return;

  originalFetch = window.fetch.bind(window);

  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const isRetry = (init?.headers instanceof Headers && (init.headers as Headers).get(RETRY_HEADER) === "1") ||
      (typeof init?.headers === "object" && !Array.isArray(init?.headers) && (init.headers as Record<string, string>)[RETRY_HEADER] === "1");

    if (isAssuranceRequest(input)) {
      return originalFetch!(input, init);
    }

    try {
      const jwtToken = getCookie(COOKIE_NAMES.JWT_TOKEN);

      if (!jwtToken && !isRetry) {
        return originalFetch!(input, withTenantHeader(input, init));
      }

      const headers = toHeaders(init?.headers);
      headers.delete(RETRY_HEADER);

      if (!headers.has("Authorization") && jwtToken) {
        headers.set("Authorization", `Bearer ${jwtToken}`);
      }

      if (needsTenantHeader(input) && !headers.has("X-Tenant-Id")) {
        const tenantId = getActiveTenantId();
        if (tenantId) headers.set("X-Tenant-Id", tenantId);
      }

      const nextInit: RequestInit = { ...init, headers };

      const promise = originalFetch!(input, nextInit);

      if (isRetry || !isKeyforgeRequest(input)) {
        return promise;
      }

      return promise.then(async (response) => {
        const doRefreshAndRetry = async (): Promise<Response> => {
          const ok = await refreshJWTToken();
          if (!ok) {
            forceLogout("Token refresh failed - access token expired");
            return response;
          }
          const newJwt = getCookie(COOKIE_NAMES.JWT_TOKEN);
          const newHeaders = new Headers(nextInit.headers as Headers);
          newHeaders.set("Authorization", `Bearer ${newJwt}`);
          newHeaders.set(RETRY_HEADER, "1");
          return originalFetch!(input, { ...nextInit, headers: newHeaders });
        };

        if (response.status === 401 || response.status === 403) {
          return doRefreshAndRetry();
        }

        const cloned = response.clone();
        let text: string;
        try {
          text = await cloned.text();
        } catch {
          return response;
        }
        try {
          const data = JSON.parse(text) as unknown;
          if (isTokenExpiredBody(data)) {
            return doRefreshAndRetry();
          }
        } catch {
          // not JSON or other parse error
        }
        return new Response(text, { status: response.status, statusText: response.statusText, headers: response.headers });
      });
    } catch (error) {
      console.error("Error in auth fetch patch:", error);
      return originalFetch!(input, init);
    }
  }) as typeof window.fetch;

  fetchPatched = true;
}

