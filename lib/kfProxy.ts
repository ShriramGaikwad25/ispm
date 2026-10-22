// =====================================================================
// Server-side token proxy for sessions whose tokens are HttpOnly cookies.
//
// After an external (e.g. Oracle) SSO sign-in, KeyForge sets accessToken /
// jwtToken as HttpOnly cookies: the browser holds them but our JS cannot read
// them, so calls that attach `Authorization` themselves would go out without
// it. For such sessions those calls are rerouted through /api/kf/...
// (app/api/kf), which adds the token from the cookie on the server and
// forwards to the original KeyForge service. Sessions whose tokens JS can read
// (password sign-in) are left exactly as they were.
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

let httpOnlySession = false;

/** Set by AuthContext: the session is valid but its tokens are HttpOnly (JS cannot read them). */
export function setHttpOnlySession(value: boolean): void {
  httpOnlySession = value;
}

export function usesHttpOnlySession(): boolean {
  return httpOnlySession;
}

/**
 * For an HttpOnly session, rewrites a direct KeyForge service call to go through the token proxy.
 * Returns null when the call should go out unchanged (normal session, not a KeyForge service,
 * already one of our own routes, or it already carries an Authorization header).
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
  if (headers.get("Authorization")?.trim()) return null;
  headers.delete("Authorization");
  headers.set(KF_UPSTREAM_HEADER, target.origin);
  if (!headers.has(KF_AUTH_HEADER)) headers.set(KF_AUTH_HEADER, auth);
  return { url: `${KF_PROXY_PREFIX}${target.pathname}${target.search}`, init: { ...init, headers } };
}
