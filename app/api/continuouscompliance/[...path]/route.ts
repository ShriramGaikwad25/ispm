import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenFromRequest } from "@/lib/serverAuth";

// Server-side proxy to the Continuous Compliance service used by the
// Continuous Compliance Console (graph.keyforge.ai/console). The browser
// calls /api/continuouscompliance/{tenant}/compliance/... on our own origin
// and this handler forwards to the service, so its CORS policy (which
// rejects other origins) never applies. See lib/controls-api.ts.
//
// Assurance Events send the user's ACCESS token in Authorization; when the
// browser did not send one, the signed-in user's access-token cookie is used.

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
    const accessToken = getAccessTokenFromRequest(request);
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
    });
    // Pass the body through as bytes (JSON, or a ZIP evidence pack) with the headers the console reads.
    const body = await upstream.arrayBuffer();
    const responseHeaders = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "application/json" });
    for (const name of ["content-disposition", "x-pack-id", "x-pack-hash"]) {
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
