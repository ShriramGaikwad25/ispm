import { NextRequest, NextResponse } from 'next/server';
import { getJwtTokenFromRequest, withAuthHeader } from '@/lib/serverAuth';

export async function GET(
  request: NextRequest,
  { params }: { params: { groupName: string; jobName: string } }
) {
  try {
    const jwtToken = getJwtTokenFromRequest(request);
    const { groupName, jobName } = params;
    
    // Decode URL-encoded parameters
    const decodedGroupName = decodeURIComponent(groupName);
    const decodedJobName = decodeURIComponent(jobName);
    
    const response = await fetch(
      `https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/${decodedGroupName}/${decodedJobName}`,
      {
        method: 'GET',
        headers: withAuthHeader({
          'Content-Type': 'application/json',
          'User-Agent': 'ISPM-Scheduler/1.0',
        }, jwtToken),
      }
    );

    if (!response.ok) {
      throw new Error(`External API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch job details',
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { groupName: string; jobName: string } }
) {
  try {
    const jwtToken = getJwtTokenFromRequest(request);
    const { groupName, jobName } = params;
    
    // Decode URL-encoded parameters
    const decodedGroupName = decodeURIComponent(groupName);
    const decodedJobName = decodeURIComponent(jobName);
    
    // Get the request body
    const body = await request.json();
    
    const response = await fetch(
      `https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/${decodedGroupName}/${decodedJobName}`,
      {
        method: 'PUT',
        headers: withAuthHeader({
          'Content-Type': 'application/json',
          'User-Agent': 'ISPM-Scheduler/1.0',
        }, jwtToken),
        body: JSON.stringify(body)
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
    console.error('Error updating job data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update job data',
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
