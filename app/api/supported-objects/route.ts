import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('API Route: Fetching supported objects from external API...');
    const response = await fetch(
      'https://preview.keyforge.ai/registerscimapp/registerfortenant/ACMECOM/getAllSupportedObjects',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'ISPM-App/1.0'
        }
      }
    );

    console.log('API Route: External API response status:', response.status);
    const text = await response.text();
    console.log('API Route: External API response length:', text.length);

    if (!response.ok) {
      console.error('API Route: External API error:', response.status, text);
      throw new Error(`External API error: ${response.status} ${response.statusText} - ${text}`);
    }

    let data: any;
    try {
      data = JSON.parse(text);
      console.log('API Route: Parsed JSON successfully, applicationType count:', data?.applicationType?.length || 0);
    } catch (parseError) {
      console.error('API Route: JSON parse error:', parseError);
      data = { message: text };
    }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('API Route: Error in GET handler:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch supported objects',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}


