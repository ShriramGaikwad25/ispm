// =====================================================================
// Server-side session tokens (used by the /api/auth routes only).
//
// accessToken and jwtToken are only ever written here, as HttpOnly cookies, so
// page JavaScript (and therefore an XSS) can never read them. The browser gets
// a placeholder instead (lib/kfProxy.ts) and the token proxy adds the real
// token on the server.
// =====================================================================

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES, decodeJwtPayload, extractJWTToken, sharedCookieDomain } from "@/lib/auth";
import { REGISTERED_APP_COOKIE } from "@/lib/tenant";

const AUTH_SERVICE_URL = "https://preview.keyforge.ai/authservice/api/v1";

/** Same lifetime the browser-set cookies had (7 days); the tokens inside expire sooner. */
const TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

/** Cookie names other sign-ins (external SSO) may hold the tokens under. */
export const ACCESS_TOKEN_ALIASES = [COOKIE_NAMES.ACCESS_TOKEN, "access_token", "AccessToken", "ACCESS_TOKEN"];
export const JWT_TOKEN_ALIASES = [COOKIE_NAMES.JWT_TOKEN, "jwt_token", "JwtToken", "JWT_TOKEN"];

function tokenCookieOptions(request: NextRequest) {
  return {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TOKEN_COOKIE_MAX_AGE,
  };
}

/** Writes the session tokens as HttpOnly cookies on the response. */
export function setTokenCookies(
  response: NextResponse,
  request: NextRequest,
  tokens: { accessToken?: string; jwtToken?: string }
): void {
  const options = tokenCookieOptions(request);
  if (tokens.accessToken) response.cookies.set(COOKIE_NAMES.ACCESS_TOKEN, tokens.accessToken, options);
  if (tokens.jwtToken) {
    response.cookies.set(COOKIE_NAMES.JWT_TOKEN, tokens.jwtToken, options);
    // A stale copy KeyForge set on the shared domain would otherwise be sent alongside the new one.
    const domain = sharedCookieDomain(request.nextUrl.hostname);
    if (domain) response.cookies.set(COOKIE_NAMES.JWT_TOKEN, "", { path: "/", maxAge: 0, domain });
  }
}

/** Expires a cookie both host-only and on the shared domain. */
export function expireCookie(response: NextResponse, request: NextRequest, name: string): void {
  response.cookies.set(name, "", { path: "/", maxAge: 0 });
  const domain = sharedCookieDomain(request.nextUrl.hostname);
  if (domain) response.cookies.set(name, "", { path: "/", maxAge: 0, domain });
}

/** The tenant for token calls: the page's X-Tenant-Id, then the tenant cookies. */
export function tenantFromRequest(request: NextRequest): string | null {
  const header = request.headers.get("x-tenant-id")?.trim();
  if (header) return header;
  const cookie = request.cookies.get(REGISTERED_APP_COOKIE)?.value?.trim();
  if (cookie) return cookie;
  try {
    const uid = JSON.parse(request.cookies.get(COOKIE_NAMES.UID_TENANT)?.value ?? "") as { tenantId?: string };
    return uid.tenantId?.trim() || null;
  } catch {
    return null;
  }
}

/** Issues a JWT for the access token (KeyForge authservice). Throws on failure. */
export async function mintJwt(accessToken: string, tenant: string): Promise<string> {
  const response = await fetch(`${AUTH_SERVICE_URL}/${encodeURIComponent(tenant)}/generateJWTToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`JWT token generation failed: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  if (data?.status === "failed" || data?.status === "error" || data?.valid === false) {
    throw new Error("JWT token generation returned failed status");
  }
  const jwtToken = extractJWTToken(data);
  if (!jwtToken) throw new Error("JWT token not found in response");
  return jwtToken;
}

/** The reviewer id (userUniqueID claim) in a JWT, for the readable reviewerId cookie the UI uses. */
export function reviewerIdFromJwt(jwtToken: string): string | undefined {
  const value = decodeJwtPayload<{ userUniqueID?: unknown }>(jwtToken)?.userUniqueID;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
