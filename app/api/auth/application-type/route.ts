import { NextResponse } from 'next/server';
import appConfig from '@/config.json';

const AUTH_BASE_URL = 'https://preview.keyforge.ai/RequestJWTToken/TokenProvider';

/** Server proxy for applicationType (avoids browser CORS). */
export async function POST() {
  try {
    const response = await fetch(`${AUTH_BASE_URL}/applicationType`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ registeredAppName: appConfig.tenantId }),
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
        statusMessage: error instanceof Error ? error.message : 'applicationType proxy failed',
      },
      { status: 502 }
    );
  }
}
