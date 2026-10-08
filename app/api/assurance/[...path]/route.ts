import { NextRequest, NextResponse } from "next/server";

// Server-side proxy to the Continuous Assurance (compliance) service. The
// browser calls /api/assurance/* on our own origin and this handler forwards
// to graph.keyforge.ai, so the service's CORS policy never applies.
// See lib/assurance-api.ts for the client side.

const ASSURANCE_UPSTREAM_BASE =
  process.env.ASSURANCE_UPSTREAM_BASE_URL || "https://graph.keyforge.ai/cc/api/v1/compliance";

/** Request headers passed through to the upstream service. */
const FORWARDED_HEADERS = ["authorization", "x-tenant-id", "idempotency-key", "content-type", "accept"];

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await params;
  const path = (pathSegments ?? []).map(encodeURIComponent).join("/");
  const url = `${ASSURANCE_UPSTREAM_BASE}/${path}${request.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
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
    console.error("Assurance proxy error:", error);
    return NextResponse.json(
      { error: "Proxy failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
