import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth';
import { getProxyAccessToken } from '@/lib/serverAuth';

/**
 * Hands the session's tokens to the page when they are HttpOnly cookies JS cannot read
 * (external SSO sign-in), so the page can send `Authorization: Bearer` itself. Same-origin only:
 * no CORS headers, never cached. The access token follows the proxies' choice (getProxyAccessToken).
 */
export async function GET(request: NextRequest) {
  const accessToken = getProxyAccessToken(request)?.token ?? null;
  const jwtToken = request.cookies.get(COOKIE_NAMES.JWT_TOKEN)?.value?.trim() || null;
  const status = accessToken && jwtToken ? 200 : 401;
  return NextResponse.json(
    { accessToken, jwtToken },
    { status, headers: { 'Cache-Control': 'no-store, private', Pragma: 'no-cache' } },
  );
}
