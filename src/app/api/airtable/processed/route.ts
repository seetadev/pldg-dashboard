import { NextResponse } from 'next/server';
import { processData } from '@/lib/data-processing';
import { GitHubData, EngagementData } from '@/types/dashboard';

async function fetchAirtableData(): Promise<EngagementData[]> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/airtable`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Airtable data');
  }

  return response.json();
}

async function fetchGitHubData(): Promise<GitHubData | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/github`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.warn('GitHub data fetch failed, continuing without GitHub data');
      return null;
    }

    return response.json();
  } catch (error) {
    console.warn('Error fetching GitHub data:', error);
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
  } catch (error) {
    console.error('Error processing Airtable data:', error);
    return NextResponse.json(
      { error: 'Failed to process Airtable data' },
      { status: 500 }
    );
  }
}
