import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAMES, sharedCookieDomain } from '@/lib/auth';
import { checkJwt, isAccessTokenExpired } from '@/lib/serverAuth';
import { REGISTERED_APP_COOKIE } from '@/lib/tenant';

/** Cookies that may carry the tenant: ours first, then those KeyForge sets after an external (e.g. Oracle) SSO sign-in. */
const TENANT_COOKIES = [REGISTERED_APP_COOKIE, 'tenantId', 'REGISTERED_APPNAME'];
/** Cookies that may carry the signed-in user's id when uidTenant is absent. */
const USER_COOKIES = ['LOGGEDIN_USERID', 'userid'];

/** Server-side session check (reads HttpOnly cookies the browser JS cannot). */
export async function GET(request: NextRequest) {
  const cookie = (name: string) => request.cookies.get(name)?.value?.trim() || null;
  const first = (names: string[]) => names.map(cookie).find(Boolean) ?? null;

  const accessToken = cookie(COOKIE_NAMES.ACCESS_TOKEN);
  const jwtToken = cookie(COOKIE_NAMES.JWT_TOKEN);
  const uidTenant = cookie(COOKIE_NAMES.UID_TENANT);

  let user: { email?: string; tenantId?: string; userid?: string } | null = null;
  if (uidTenant) {
    try {
      user = JSON.parse(uidTenant) as { email?: string; tenantId?: string; userid?: string };
    } catch {
      user = null;
    }
  }

  // An external SSO sign-in sets no uidTenant: build the user from the cookies it does set.
  const tenantId = user?.tenantId?.trim() || first(TENANT_COOKIES);
  const userid = user?.userid?.trim() || user?.email?.trim() || first(USER_COOKIES);
  if (tenantId || userid) {
    user = { ...user, tenantId: tenantId ?? undefined, userid: user?.userid ?? userid ?? undefined };
  }

  // Presence alone is not a session: jwtToken must be a well-formed KeyForge token (correctly
  // signed when KF_JWT_SECRET is set) and accessToken unexpired. An expired jwtToken is fine —
  // the client refreshes it from accessToken.
  const jwtCheck = await checkJwt(jwtToken);
  const tampered = !!jwtToken && jwtCheck === 'invalid';
  const authenticated =
    !!accessToken && !isAccessTokenExpired(accessToken) && !!jwtToken && jwtCheck !== 'invalid' && !!user;

  const response = NextResponse.json(
    {
      authenticated,
      hasAccessToken: !!accessToken,
      hasJwtToken: !!jwtToken,
      user: authenticated ? user : null,
    },
    { headers: { 'Cache-Control': 'no-store, private' } }
  );
  if (tampered) {
    for (const name of [COOKIE_NAMES.ACCESS_TOKEN, COOKIE_NAMES.JWT_TOKEN]) {
      // Clears host-only and shared-domain copies alike (see sharedCookieDomain).
      response.cookies.set(name, '', { path: '/', maxAge: 0 });
      const domain = sharedCookieDomain(request.nextUrl.hostname);
      if (domain) response.cookies.set(name, '', { path: '/', maxAge: 0, domain });
    }
  }
  return response;
}
