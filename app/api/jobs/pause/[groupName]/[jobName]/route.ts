import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { groupName: string; jobName: string } }
) {
  try {
    const { groupName, jobName } = params;
    
    // Decode URL-encoded parameters
    const decodedGroupName = decodeURIComponent(groupName);
    const decodedJobName = decodeURIComponent(jobName);
    
    const response = await fetch(
      `https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/${decodedGroupName}/${decodedJobName}/pause`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ISPM-Scheduler/1.0',
        }
      }
    );

    // Read the response body once
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText} - ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      data = { message: responseText, success: true };
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
    console.error('Error pausing job:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to pause job',
        message: error instanceof Error ? error.message : 'Unknown error'
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

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
