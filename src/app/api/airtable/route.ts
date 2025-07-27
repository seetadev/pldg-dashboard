import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { EngagementData } from '@/types/dashboard';
import { withMiddleware } from '@/lib/middleware';
import { Logger } from '@/lib/logger';

const logger = Logger.getInstance();

async function handleGET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || 'unknown';
  
  try {
    logger.info('Airtable data request started', {
      requestId,
      operation: 'airtable_data_fetch',
    });

    // Check if we should use local CSV data
    const useLocalData = process.env.USE_LOCAL_DATA === 'true';

    if (useLocalData) {
      try {
        logger.info('Using local CSV data', {
          requestId,
          source: 'local_csv',
        });

        // Read the CSV file from the public directory
        const csvPath = path.join(
          process.cwd(),
          'public',
          'data',
          'Weekly Engagement Survey Breakdown (4).csv'
        );
        const csvData = await fs.readFile(csvPath, 'utf-8');

        // Parse CSV data
        const parsedData = Papa.parse<EngagementData>(csvData, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim(),
        });

        if (parsedData.errors.length > 0) {
          logger.warn('CSV parsing warnings', {
            requestId,
            errors: parsedData.errors,
          });
        }

        const duration = Date.now() - startTime;
        logger.info('Local CSV data loaded successfully', {
          requestId,
          duration,
          recordCount: parsedData.data.length,
        });

        return NextResponse.json(parsedData.data);
      } catch (error) {
        logger.error('Error loading CSV data', error as Error, {
          requestId,
        });
        throw new Error('Failed to load CSV data');
      }
    }

    // Validate environment variables
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!baseId || !apiKey || !tableName) {
      logger.error('Missing Airtable environment variables', undefined, {
        requestId,
        hasBaseId: !!baseId,
        hasApiKey: !!apiKey,
        hasTableName: !!tableName,
      });
      return NextResponse.json(
        { error: 'Airtable configuration missing' },
        { status: 500 }
      );
    }

    const apiUrl = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
    
    logger.info('Fetching from Airtable API', {
      requestId,
      baseId,
      tableName,
      url: apiUrl,
    });

    const apiStartTime = Date.now();
    // Use the table name from environment variables instead of hardcoded ID
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const apiDuration = Date.now() - apiStartTime;

    logger.logExternalAPI('airtable', apiUrl, 'GET', response.status, apiDuration, {
      requestId,
      baseId,
      tableName,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Airtable API error', undefined, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        errorResponse: errorText,
        baseId,
        tableName,
        url: apiUrl,
      });
      throw new Error(`Airtable API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.records || !Array.isArray(data.records)) {
      logger.error('Invalid Airtable response format', undefined, {
        requestId,
        hasRecords: !!data.records,
        isRecordsArray: Array.isArray(data.records),
        dataKeys: Object.keys(data),
      });
      throw new Error('Invalid Airtable response format');
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */ // disabling this for now
    const transformedData = data.records.map((record: any) => ({
      'Program Week': record.fields['Program Week'] || '',
      Name: record.fields['Name'] || '',
      'Engagement Participation ':
        record.fields['Engagement Participation '] || '',
      'Tech Partner Collaboration?':
        record.fields['Tech Partner Collaboration?'] || 'No',
      'Which Tech Partner': parseTechPartners(
        record.fields['Which Tech Partner'] || []
      ),
      'How many issues, PRs, or projects this week?':
        record.fields['How many issues, PRs, or projects this week?'] || '0',
      'How likely are you to recommend the PLDG to others?':
        record.fields['How likely are you to recommend the PLDG to others?'] ||
        '0',
      'PLDG Feedback': record.fields['PLDG Feedback'] || '',
      'GitHub Issue Title': record.fields['GitHub Issue Title'] || '',
      'GitHub Issue URL': record.fields['GitHub Issue URL'] || '',
      Created: record.fields['Created'] || record.createdTime || '',
    }));

    const totalDuration = Date.now() - startTime;
    logger.info('Airtable data fetched successfully', {
      requestId,
      duration: totalDuration,
      apiDuration,
      recordCount: data.records.length,
      transformedCount: transformedData.length,
    });

    return NextResponse.json(transformedData);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Airtable API error', error as Error, {
      requestId,
      duration,
      operation: 'airtable_data_fetch',
    });
    return NextResponse.json(
      { error: 'Failed to fetch Airtable data' },
      { status: 500 }
    );
  }
}

export const GET = withMiddleware(handleGET);

function parseTechPartners(techPartner: string | string[]): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner;
  }
  return techPartner?.split(',').map((p) => p.trim()) ?? [];
}
