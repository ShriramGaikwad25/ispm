import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Security headers. Scripts run only with this request's nonce (Next.js adds it to its own
 * scripts) or when loaded by such a script ('strict-dynamic'); inline scripts and on* handler
 * attributes are blocked, so injected markup cannot run code. Dev keeps 'unsafe-eval' for
 * React Refresh. style-src keeps 'unsafe-inline': the UI relies on inline styles throughout.
 */
export function middleware(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const csp =
    "default-src 'self'; " +
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}; ` +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://preview.keyforge.ai https://graph.keyforge.ai; " +
    "object-src 'none'; frame-ancestors 'none'; base-uri 'self'";

  // Next.js reads the nonce from the request's CSP header when rendering the page.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  return res;
}

export const config = { matcher: "/:path*" };
