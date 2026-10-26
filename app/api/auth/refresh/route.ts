import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES } from '@/lib/auth';
import { mintJwt, reviewerIdFromJwt, setTokenCookies, tenantFromRequest } from '@/lib/authSession';

/**
 * Issues a fresh JWT from the session's access token (both HttpOnly cookies) and stores it as the
 * jwtToken cookie. The response carries no token.
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get(COOKIE_NAMES.ACCESS_TOKEN)?.value?.trim();
  const tenant = tenantFromRequest(request);
  if (!accessToken || !tenant) {
    return NextResponse.json({ ok: false, message: 'No session' }, { status: 401 });
  }
  try {
    const jwtToken = await mintJwt(accessToken, tenant);
    const response = NextResponse.json(
      { ok: true, reviewerId: reviewerIdFromJwt(jwtToken) },
      { headers: { 'Cache-Control': 'no-store, private' } }
    );
    setTokenCookies(response, request, { jwtToken });
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Refresh failed' },
      { status: 401 }
    );
  }
}
