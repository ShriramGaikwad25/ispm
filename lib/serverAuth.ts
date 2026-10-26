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

export type JwtCheck = "ok" | "expired" | "invalid";

function base64UrlDecode(part: string): Uint8Array {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Server-side check of the KeyForge jwtToken: well-formed, signed (alg not "none"), not
 * expired, and, when KF_JWT_SECRET is set, a valid HS256 signature. Without the secret a forged-but-well-formed token
 * still passes; the gateway remains the authority for every API call.
 */
export async function checkJwt(token: string | null | undefined): Promise<JwtCheck> {
  const parts = token?.split(".");
  if (!parts || parts.length !== 3 || parts.some((p) => !/^[A-Za-z0-9_-]+$/.test(p))) return "invalid";
  let header: { alg?: string };
  let payload: { exp?: number };
  try {
    const text = new TextDecoder();
    header = JSON.parse(text.decode(base64UrlDecode(parts[0])));
    payload = JSON.parse(text.decode(base64UrlDecode(parts[1])));
  } catch {
    return "invalid";
  }
  if (!header.alg || header.alg.toLowerCase() === "none") return "invalid";

  const secret = process.env.KF_JWT_SECRET?.trim();
  if (secret) {
    if (header.alg !== "HS256") return "invalid";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(parts[2]).buffer as ArrayBuffer,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
    if (!ok) return "invalid";
  }

  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) return "expired";
  return "ok";
}

/**
 * The access token may be KeyForge's JWT or, after an external SSO sign-in, a provider token in
 * another format, so only its expiry is checked, and only when it decodes as a JWT.
 */
export function isAccessTokenExpired(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1]))) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 <= Date.now();
  } catch {
    return false;
  }
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

