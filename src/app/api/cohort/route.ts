import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';

export async function GET(req: NextRequest) {
  const cohortId = req.nextUrl.searchParams.get('id');
  if (!cohortId) {
    return NextResponse.json({ error: 'Missing cohort ID' }, { status: 400 });
  }

  try {
    console.log('Reading data from local CSV file...');
    
    // Define file paths based on cohort
    let csvPath;
    if (cohortId === '1') {
      csvPath = path.join(process.cwd(), 'public', 'data', 'cohort-1', 'Weekly Engagement Survey Breakdown (4).csv');
    } else if (cohortId === '2') {
      csvPath = path.join(process.cwd(), 'public', 'data', 'cohort-2', '[cohort 2] Weekly Engagement Survey-Raw Dataset.csv');
    } else {
      return NextResponse.json({ error: 'Invalid cohort ID' }, { status: 400 });
    }
    
    console.log('Attempting to read file:', csvPath);
    
    try {
      // Read the CSV file
      const csvData = await fs.readFile(csvPath, 'utf-8');
      
      // Parse CSV data
      const parsedData = Papa.parse(csvData, {
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
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.error(`CSV file not found: ${csvPath}`);
        return NextResponse.json([], { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading CSV:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cohortId
    });
    return NextResponse.json(
      { error: 'Failed to load CSV data' },
      { status: 500 }
    );
  }
}
