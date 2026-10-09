import { NextRequest, NextResponse } from "next/server";
import { getJwtTokenFromRequest } from "@/lib/serverAuth";

// Server-side proxy to the Continuous Compliance service used by the
// Continuous Compliance Console (graph.keyforge.ai/console). The browser
// calls /api/continuouscompliance/{tenant}/compliance/... on our own origin
// and this handler forwards to the service, so its CORS policy (which
// rejects other origins) never applies. See lib/controls-api.ts.
//
// The service expects a tenant JWT in Authorization; when the browser did not
// send one, the signed-in user's JWT cookie is used.

const UPSTREAM_BASE =
  process.env.CONTINUOUS_COMPLIANCE_UPSTREAM_BASE_URL || "https://graph.keyforge.ai/continuouscompliance/api/v1";

/** Request headers passed through to the upstream service. */
const FORWARDED_HEADERS = ["authorization", "x-tenant-id", "x-request-id", "content-type", "accept"];

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).map(encodeURIComponent).join("/");
  const url = `${UPSTREAM_BASE}/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has("authorization")) {
    const jwt = getJwtTokenFromRequest(request);
    if (jwt) headers.set("authorization", `Bearer ${jwt}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
    const body = await upstream.text();
    return new NextResponse(body || null, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") ?? "application/json" },
    });
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
