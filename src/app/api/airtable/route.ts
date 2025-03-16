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
        const csvPath = path.join(process.cwd(), 'public', 'data', 'Weekly Engagement Survey Breakdown (4).csv');
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
      } catch (error) {
        console.error('Error loading CSV:', error);
        throw new Error('Failed to load CSV data');
      }
    }

    console.log('Fetching from Airtable API...');

    // Validate environment variables
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!baseId || !apiKey || !tableName) {
      console.error('Missing required Airtable environment variables');
      return NextResponse.json(
        { error: 'Airtable configuration missing' },
        { status: 500 }
      );
    }

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
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw Airtable response:', {
      hasRecords: !!data.records,
      recordCount: data.records?.length || 0,
      sampleRecord: data.records?.[0]
    });

    if (!data.records || !Array.isArray(data.records)) {
      console.error('Invalid Airtable response format:', data);
      throw new Error('Invalid Airtable response format');
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
  } catch (error) {
    console.error('Airtable API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Airtable data' },
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
