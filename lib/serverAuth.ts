import { NextRequest } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";

export function getJwtTokenFromRequest(request: NextRequest): string | null {
  try {
    return request.cookies.get(COOKIE_NAMES.JWT_TOKEN)?.value ?? null;
  } catch {
    return null;
  }
}

/** Master access token used by registerscimapp / schemamapper endpoints (not JWT). */
export function getAccessTokenFromRequest(request: NextRequest): string | null {
  try {
    return request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value ?? null;
  } catch {
    return null;
  }
}

/** Cookie KeyForge sets after an external (e.g. Oracle) SSO sign-in, holding the provider's access token. */
export const OAUTH_PROVIDER_ACCESS_TOKEN_COOKIE = "OAUTH_PROVIDER_ACCESSTOKEN";

/**
 * Token our proxies forward when the browser sent no Authorization. Returns the cookie used.
 * - Password sign-in: the accessToken cookie.
 * - External SSO sign-in (OAUTH_PROVIDER_ACCESSTOKEN present): the KeyForge jwtToken by default,
 *   because the Continuous Compliance service cannot verify the provider's (Oracle) token yet;
 *   PROXY_SSO_TOKEN=provider sends the provider token instead.
 */
export function getProxyAccessToken(request: NextRequest): { token: string; cookie: string } | null {
  const sso = !!request.cookies.get(OAUTH_PROVIDER_ACCESS_TOKEN_COOKIE)?.value;
  const sendProvider = (process.env.PROXY_SSO_TOKEN ?? "jwt").trim().toLowerCase() === "provider";
  const order = !sso
    ? [COOKIE_NAMES.ACCESS_TOKEN]
    : sendProvider
      ? [OAUTH_PROVIDER_ACCESS_TOKEN_COOKIE, COOKIE_NAMES.ACCESS_TOKEN]
      : [COOKIE_NAMES.JWT_TOKEN, OAUTH_PROVIDER_ACCESS_TOKEN_COOKIE, COOKIE_NAMES.ACCESS_TOKEN];
  for (const cookie of order) {
    const token = request.cookies.get(cookie)?.value?.trim();
    if (token) return { token, cookie };
  }
  return null;
}

export function withAuthHeader(
  headers: HeadersInit | undefined,
  jwtToken: string | null
): HeadersInit | undefined {
  if (!jwtToken) {
    return headers;
  }

  const headerBag = new Headers(headers ?? undefined);

  if (!headerBag.has("Authorization")) {
    headerBag.set("Authorization", `Bearer ${jwtToken}`);
  }

  return headerBag;
}

/** Authorization for registerscimapp APIs — prefers access token over JWT. */
export function withRegisterScimAuthHeader(
  headers: HeadersInit | undefined,
  request: NextRequest
): HeadersInit {
  const accessToken = getAccessTokenFromRequest(request);
  const headerBag = new Headers(headers ?? undefined);
  if (accessToken) {
    headerBag.set("Authorization", `Bearer ${accessToken}`);
  }
  return headerBag;
}

