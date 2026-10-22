// =====================================================================
// Assurance Events — authentication.
//
// Every Assurance Events page calls its APIs with the signed-in user's
// ACCESS token (the long-lived `accessToken` cookie), not the short-lived JWT
// the rest of ISPM uses. There is no JWT refresh here: when a call comes back
// with a token-expired answer (HTTP 401, or a body saying the token expired),
// the user is logged out (forceLogout).
//
// Calls go through the browser's original fetch, so authFetch's JWT
// injection and JWT refresh never apply to them.
// =====================================================================

import { COOKIE_NAMES, forceLogout, getCookie, resolveTenantIdForHeader } from "@/lib/auth";
import { getOriginalFetch } from "@/lib/authFetch";
import { viaTokenProxy } from "@/lib/kfProxy";

/** The signed-in user's access token (cookie), or null. */
export function getAssuranceAccessToken(): string | null {
  return getCookie(COOKIE_NAMES.ACCESS_TOKEN);
}

/** Authorization (access token) + X-Tenant-Id headers for Assurance Events calls. */
export function assuranceAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getAssuranceAccessToken();
  const tenant = resolveTenantIdForHeader();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenant ? { "X-Tenant-Id": tenant } : {}),
    ...extra,
  };
}

/** True when a response says the token expired: HTTP 401, or an "expired" error in the body. */
export function isTokenExpiredResponse(status: number, body: unknown): boolean {
  if (status === 401) return true;
  const texts: string[] = [];
  if (typeof body === "string") texts.push(body);
  else if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    for (const k of ["errorMessage", "error_message", "ErrorMessage", "message", "error", "error_code", "errorCode", "code", "detail"]) {
      if (typeof o[k] === "string") texts.push(o[k] as string);
    }
  }
  return texts.some((t) => /token[\s_-]*(has\s+)?expired|expired[\s_-]*token|jwt[\s_-]*expired/i.test(t));
}

let loggingOut = false;

/** Logs the user out once (several calls may see the expiry at the same time). */
export function logoutOnTokenExpired(reason = "Token Expired"): void {
  if (loggingOut) return;
  loggingOut = true;
  forceLogout(`Assurance Events: ${reason}`);
}

/**
 * fetch() for Assurance Events: sends the access token (and tenant) and logs the user out when the
 * answer is a token-expired one. When JS cannot read the token (an HttpOnly cookie, as after an
 * external SSO sign-in) the request goes without it and our proxies add it from the cookie; only
 * the service's answer (401 / token expired) decides that the session is over.
 */
export async function assuranceFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAssuranceAccessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else {
    headers.delete("Authorization");
    // Direct service calls (kfmailserver, kfscheduler, ...) get the token from the cookie via the token proxy.
    const proxied = viaTokenProxy(input, { ...init, headers }, "access");
    if (proxied) {
      input = proxied.url;
      init = proxied.init;
      new Headers(proxied.init.headers).forEach((v, k) => headers.set(k, v));
    }
  }
  const tenant = resolveTenantIdForHeader();
  if (tenant && !headers.has("X-Tenant-Id")) headers.set("X-Tenant-Id", tenant);

  const doFetch = typeof window !== "undefined" ? getOriginalFetch() : fetch;
  const res = await doFetch(input, { ...init, headers });

  if (res.status === 401) {
    logoutOnTokenExpired(`HTTP 401 from ${input}`);
    throw new Error("Your session has expired. Please sign in again.");
  }
  // A token-expired answer can also come back in the body (e.g. {"status":"error","errorMessage":"Token Expired"}).
  if (!res.ok || (res.headers.get("content-type") ?? "").includes("json")) {
    const text = await res.clone().text().catch(() => "");
    let body: unknown = text;
    try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (isTokenExpiredResponse(res.status, body)) {
      logoutOnTokenExpired(`Token expired (${input})`);
      throw new Error("Your session has expired. Please sign in again.");
    }
  }
  return res;
}

/**
 * JSON request for Assurance Events (the access-token counterpart of apiRequestWithAuth):
 * parses JSON (plain text is returned as-is), throws on an HTTP error, logs out on token expiry.
 */
export async function assuranceRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const isGet = (options.method ?? "GET").toUpperCase() === "GET";
  const headers = new Headers(options.headers);
  if (!isGet && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await assuranceFetch(url, { ...options, headers });
  const text = await res.text();
  let data: unknown = text;
  try { data = text ? JSON.parse(text) : undefined; } catch { /* plain text */ }
  if (!res.ok) {
    const o = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const message = String(o.message ?? o.errorMessage ?? o.error ?? (typeof data === "string" && data) ?? res.statusText);
    throw new Error(`[HTTP ${res.status}] ${message || res.statusText}`);
  }
  return data as T;
}
