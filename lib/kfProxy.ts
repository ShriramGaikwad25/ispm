// =====================================================================
// Server-side token proxy: session tokens are HttpOnly cookies.
//
// accessToken / jwtToken are HttpOnly cookies (set by our /api/auth routes, or
// by KeyForge after an external SSO sign-in): the browser holds them but our JS
// never sees them, so an XSS cannot steal them. Code that attaches
// `Authorization` itself gets a placeholder from getCookie() instead of the
// token; calls to KeyForge services are rerouted through /api/kf/...
// (app/api/kf), which swaps the placeholder for the token from the cookie on
// the server and forwards to the original service.
// =====================================================================

import { getBackendOrigin } from "@/lib/backendOrigin";

/** Which cookie the proxy authorizes with: the master access token or the short-lived JWT. */
export type KfProxyAuth = "access" | "jwt";

export const KF_PROXY_PREFIX = "/api/kf";
/** Header naming the upstream origin (validated server-side against *.keyforge.ai). */
export const KF_UPSTREAM_HEADER = "X-KF-Upstream";
/** Header naming the token the proxy should add (KfProxyAuth). */
export const KF_AUTH_HEADER = "X-KF-Auth";

/**
 * Diagnostic response headers for our proxies (no token values): where Authorization came from
 * ("browser", "cookie:<name>" or "none") and which cookie names reached the server.
 */
export function proxyAuthDiagnostics(authSource: string, cookieNames: string[]): Record<string, string> {
  return { "X-KF-Proxy-Auth": authSource, "X-KF-Proxy-Cookies": cookieNames.join(",") || "(none)" };
}

/** True for https://keyforge.ai and https://*.keyforge.ai — the only origins the proxy forwards to. */
export function isKeyforgeOrigin(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && (u.hostname === "keyforge.ai" || u.hostname.endsWith(".keyforge.ai"));
  } catch {
    return false;
  }
}

/** What getCookie() returns for a token cookie in a signed-in session: never the token itself. */
export const TOKEN_PLACEHOLDER: Record<KfProxyAuth, string> = {
  access: "kf-httponly-access-token",
  jwt: "kf-httponly-jwt-token",
};

export function isTokenPlaceholder(value: string | null | undefined): boolean {
  return value === TOKEN_PLACEHOLDER.access || value === TOKEN_PLACEHOLDER.jwt;
}

/** The token a request's `Authorization: Bearer <placeholder>` stands for, or null. */
function placeholderAuth(headers: Headers): KfProxyAuth | null {
  const value = headers.get("Authorization")?.replace(/^bearer\s+/i, "").trim();
  if (value === TOKEN_PLACEHOLDER.access) return "access";
  if (value === TOKEN_PLACEHOLDER.jwt) return "jwt";
  return null;
}

let httpOnlySession = false;

/** Set by AuthContext: the session is valid and its tokens are HttpOnly cookies (JS cannot read them). */
export function setHttpOnlySession(value: boolean): void {
  httpOnlySession = value;
}

export function usesHttpOnlySession(): boolean {
  return httpOnlySession;
}

/**
 * For an HttpOnly session, rewrites a direct KeyForge service call to go through the token proxy,
 * which adds the token named by the request's placeholder (or `auth` when it has none).
 * Returns null when the call should go out unchanged (no session, not a KeyForge service,
 * already one of our own routes, or it carries a real Authorization header).
 */
export function viaTokenProxy(url: string, init: RequestInit | undefined, auth: KfProxyAuth): { url: string; init: RequestInit } | null {
  if (!httpOnlySession || typeof window === "undefined") return null;
  let target: URL;
  try {
    target = new URL(url, window.location.href);
  } catch {
    return null;
  }
  // ISPM is served from the site root and calls KeyForge on another origin (preview), so
  // every same-origin URL is one of our own routes.
  if (target.origin === window.location.origin) return null;
  if (target.origin !== getBackendOrigin() && !isKeyforgeOrigin(target.origin)) return null;

  const headers = new Headers(init?.headers);
  const placeholder = placeholderAuth(headers);
  if (!placeholder && headers.get("Authorization")?.trim()) return null;
  headers.delete("Authorization");
  headers.set(KF_UPSTREAM_HEADER, target.origin);
  if (placeholder) headers.set(KF_AUTH_HEADER, placeholder);
  else if (!headers.has(KF_AUTH_HEADER)) headers.set(KF_AUTH_HEADER, auth);
  return { url: `${KF_PROXY_PREFIX}${target.pathname}${target.search}`, init: { ...init, headers } };
}

/** Drops an `Authorization: Bearer <placeholder>` header (our own routes read the token from the cookie). */
export function withoutTokenPlaceholder(init: RequestInit | undefined): RequestInit | undefined {
  if (!init?.headers) return init;
  const headers = new Headers(init.headers);
  if (!placeholderAuth(headers)) return init;
  headers.delete("Authorization");
  return { ...init, headers };
}

/** Routes a request carrying a token placeholder: KeyForge services via the token proxy, anything else without it. */
export function routeTokenPlaceholder(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  auth: KfProxyAuth = "jwt"
): [RequestInfo | URL, RequestInit | undefined] {
  if (typeof input === "string" || input instanceof URL) {
    const proxied = viaTokenProxy(typeof input === "string" ? input : input.href, init, auth);
    if (proxied) return [proxied.url, proxied.init];
  }
  return [input, withoutTokenPlaceholder(init)];
}
