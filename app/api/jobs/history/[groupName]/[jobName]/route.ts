import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { groupName: string; jobName: string } }) {
  const { groupName, jobName } = params;

  try {
    const externalApiUrl = `https://preview.keyforge.ai/kfscheduler/api/v1/ACMECOM/jobs/history/${encodeURIComponent(groupName)}/${encodeURIComponent(jobName)}`;
    const response = await fetch(externalApiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from external API: ${response.status} - ${errorText}`);
      return NextResponse.json({ message: 'Failed to fetch job history from external API', error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ message: 'Internal server error', error: (error as Error).message }, { status: 500 });
  }
}
