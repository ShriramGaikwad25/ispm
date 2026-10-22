import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";
import { getProxyAccessToken } from "@/lib/serverAuth";
import { getBackendOrigin } from "@/lib/backendOrigin";
import { isKeyforgeOrigin, KF_AUTH_HEADER, KF_UPSTREAM_HEADER, proxyAuthDiagnostics } from "@/lib/kfProxy";

// Token proxy for sessions whose tokens are HttpOnly cookies (see lib/kfProxy.ts).
// The browser calls /api/kf/<service path> with X-KF-Upstream (the service's
// origin) and X-KF-Auth (access | jwt); this adds Authorization from that cookie
// and forwards to <origin>/<service path>. Only the backend origin and
// https://*.keyforge.ai are allowed upstreams, so this is not an open proxy.

/** Request headers passed through to the upstream service. */
const FORWARDED_HEADERS = ["authorization", "x-tenant-id", "x-request-id", "idempotency-key", "content-type", "accept"];
/** Response headers passed back to the browser. */
const RETURNED_HEADERS = ["content-type", "content-disposition", "x-pack-id", "x-pack-hash"];

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).map(encodeURIComponent).join("/");

  const backendOrigin = getBackendOrigin();
  const requested = request.headers.get(KF_UPSTREAM_HEADER)?.trim().replace(/\/+$/, "") || backendOrigin;
  if (requested !== backendOrigin && !isKeyforgeOrigin(requested)) {
    return NextResponse.json({ error: "bad_upstream", message: `Upstream not allowed: ${requested}` }, { status: 400 });
  }
  const url = `${requested}/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let authSource = headers.has("authorization") ? "browser" : "none";
  if (!headers.has("authorization")) {
    const jwt = request.cookies.get(COOKIE_NAMES.JWT_TOKEN)?.value;
    const found = request.headers.get(KF_AUTH_HEADER)?.toLowerCase() === "access"
      ? getProxyAccessToken(request)
      : jwt ? { token: jwt, cookie: COOKIE_NAMES.JWT_TOKEN } : null;
    if (found) { headers.set("authorization", `Bearer ${found.token}`); authSource = `cookie:${found.cookie}`; }
  }
  const diagnostics = proxyAuthDiagnostics(authSource, request.cookies.getAll().map((c) => c.name));

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
    });
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers(diagnostics);
    for (const name of RETURNED_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(body.byteLength ? body : null, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: "upstream_unreachable", message: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
