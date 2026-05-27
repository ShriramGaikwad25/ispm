import { NextRequest, NextResponse } from 'next/server';
import appConfig from '@/config.json';

const AUTH_BASE_URL = 'https://preview.keyforge.ai/RequestJWTToken/TokenProvider';

/** Server proxy for OAuth code exchange (avoids browser CORS). */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim();
  const state = request.nextUrl.searchParams.get('state')?.trim();

  if (!code || !state) {
    return NextResponse.json(
      { status: 'failed', statusMessage: 'Missing code or state' },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      code,
      state,
      registeredAppName: appConfig.tenantId,
    });
    const response = await fetch(`${AUTH_BASE_URL}/oauth/callback?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'failed',
        statusMessage: error instanceof Error ? error.message : 'oauth callback proxy failed',
      },
      { status: 502 }
    );
  }
}
