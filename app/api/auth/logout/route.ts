import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAMES_TO_CLEAR, sharedCookieDomain } from '@/lib/auth';

/**
 * Clears auth cookies (including HttpOnly) on logout. KeyForge sets SSO cookies on the parent
 * domain (.keyforge.ai), and a cookie only goes away when the expiry names the same domain, so
 * each name is expired both host-only and on that domain. Raw Set-Cookie headers are used
 * because response.cookies.set keeps only one entry per name.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() || request.headers.get('host') || request.nextUrl.host;
  const domain = sharedCookieDomain(host);
  const secure = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

  // Auth cookies only: other cookies on the shared .keyforge.ai domain belong to other apps.
  for (const name of new Set<string>(AUTH_COOKIE_NAMES_TO_CLEAR)) {
    for (const d of domain ? [null, domain] : [null]) {
      response.headers.append(
        'Set-Cookie',
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0${d ? `; Domain=${d}` : ''}${secure ? '; Secure; SameSite=None' : ''}`,
      );
    }
  }

  return response;
}
