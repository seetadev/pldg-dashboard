import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { EngagementData } from '@/types/dashboard';

export async function GET() {
  try {
    // Check if we should use local CSV data
    const useLocalData = process.env.USE_LOCAL_DATA === 'true';
    
    if (useLocalData) {
      console.log('Using local CSV data...');
      try {
        // Read the CSV file from the public directory
        const csvPath = path.join(process.cwd(), 'public', 'data', 'Weekly Engagement Survey Breakdown (3).csv');
        const csvData = await fs.readFile(csvPath, 'utf-8');
        
        // Parse CSV data
        const parsedData = Papa.parse<EngagementData>(csvData, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim()
        });

        console.log('CSV Data Loaded:', {
          rowCount: parsedData.data.length,
          sampleRow: parsedData.data[0],
          errors: parsedData.errors
        });

        if (parsedData.errors.length > 0) {
          console.warn('CSV parsing warnings:', parsedData.errors);
        }

        return NextResponse.json(parsedData.data);
      } catch (error: any) {
        console.error('Error loading CSV:', error.message, {
          stack: error.stack,
        });
        return NextResponse.json(
          { error: 'Failed to load CSV data', details: error.message },
          { status: 500 }
        );
      }
    }

    console.log('Fetching from Airtable API...');

    // Validate environment variables
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!baseId || !apiKey || !tableName) {
      const missingVariables = [];
      if (!baseId) missingVariables.push('AIRTABLE_BASE_ID');
      if (!apiKey) missingVariables.push('AIRTABLE_API_KEY');
      if (!tableName) missingVariables.push('AIRTABLE_TABLE_NAME');

      console.error('Missing required Airtable environment variables');
      return NextResponse.json(
        { error: 'Airtable configuration missing' },
        { status: 500 }
      );
    }

    try{
    // Use the table name from environment variables instead of hardcoded ID
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      }
    );

    console.log('Airtable API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Airtable API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        baseId,
        tableName,
        requestUrl: `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`
      });
      return NextResponse.json(
        { error: `Airtable API error: ${response.statusText}`, details: errorText },
        { status: response.status >= 400 && response.status < 600 ? response.status : 500 }
      );
    }

    const data = await response.json();
    console.log('Raw Airtable response:', {
      hasRecords: !!data.records,
      recordCount: data.records?.length || 0,
      sampleRecord: data.records?.[0]
    });

    if (!data.records || !Array.isArray(data.records)) {
      console.error('Invalid Airtable response format:', data);
      return NextResponse.json(
        { error: 'Invalid Airtable response format', details: 'Data.records is missing or not an array' },
        { status: 500 }
      );
    }

    // Transform data at API level to match expected EngagementData type
    const transformedData = data.records.map((record: any) => ({
      'Program Week': record.fields['Program Week'] || '',
      'Name': record.fields['Name'] || '',
      'Engagement Participation ': record.fields['Engagement Participation '] || '',
      'Tech Partner Collaboration?': record.fields['Tech Partner Collaboration?'] || 'No',
      'Which Tech Partner': parseTechPartners(record.fields['Which Tech Partner'] || []),
      'How many issues, PRs, or projects this week?': record.fields['How many issues, PRs, or projects this week?'] || '0',
      'How likely are you to recommend the PLDG to others?': record.fields['How likely are you to recommend the PLDG to others?'] || '0',
      'PLDG Feedback': record.fields['PLDG Feedback'] || '',
      'GitHub Issue Title': record.fields['GitHub Issue Title'] || '',
      'GitHub Issue URL': record.fields['GitHub Issue URL'] || '',
      'Created': record.fields['Created'] || record.createdTime || ''
    }));

    console.log('Airtable API Response:', {
      recordCount: transformedData.length,
      sampleRecord: transformedData[0],
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(transformedData);
  } catch (error: any) {
    console.error('Airtable API error:', error.message, {
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to fetch Airtable data' + error.message },
      { status: 500 }
    );
  }
} catch (generalError: any) {
  // Catch any unexpected errors
  console.error('Unexpected error in Airtable API:', generalError);
  return NextResponse.json(
    { error: 'Unexpected error', details: generalError.message },
    { status: 500 }
  );
}
}

function parseTechPartners(techPartner: string | string[]): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner;
  }
  return techPartner?.split(',').map(p => p.trim()) ?? [];
} 
