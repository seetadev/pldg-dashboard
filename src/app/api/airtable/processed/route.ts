import { NextResponse } from 'next/server';
import { processData } from '@/lib/data-processing';
import { GitHubData, EngagementData } from '@/types/dashboard';

async function fetchAirtableData(): Promise<EngagementData[]> {
  try{
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/airtable`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  console.log('Airtable API Response (fetchAirtableData):', {
    status: response.status,
    statusText: response.statusText,
    url: response.url
  });

  if (!response.ok) {
    const errorText = await response.text();
      console.error('Airtable API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: response.url
      });
      throw new Error(`Airtable API error: ${response.statusText}, details: ${errorText}`);
  }

  const data=await response.json();
  return data;
} catch (error: any) {
  console.error('Error fetching Airtable data (fetchAirtableData):', error.message, {
    stack: error.stack,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/airtable`
  });
  throw error; // Re-throw the error to be caught in the main function
}
}

async function fetchGitHubData(): Promise<GitHubData | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/github`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    console.log('GitHub API Response (fetchGitHubData):', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('GitHub data fetch failed, continuing without GitHub data:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url: response.url
      });
      return null;
    }

    return response.json();
  } catch (error: any) {
    console.warn('Error fetching GitHub data (fetchGitHubData):', error.message, {
      stack: error.stack,
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/github`
    });
    return null;
  }
}

export async function GET() {
  try {
    // Fetch raw data
    const rawData = await fetchAirtableData();
    const githubData = await fetchGitHubData();

    // Process the data using our enhanced processing functions
    const processedData = processData(rawData, githubData);
    console.log('Processed data:', {
      weeklyChange: processedData.weeklyChange,
      activeContributors: processedData.activeContributors,
      totalContributions: processedData.totalContributions,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(processedData);
  } catch (error: any) {
    console.error('Error processing Airtable data:', error.message, {
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to process Airtable data' + error.message },
      { status: 500 }
    );
  }
}
