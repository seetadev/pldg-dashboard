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
    console.log('Reading feedback data from local CSV file...');
    
    // Currently only Cohort 2 has feedback data
    if (cohortId === '2') {
      const csvPath = path.join(process.cwd(), 'public', 'data', 'cohort-2', 'PLDG Cohort 2 RetroPGF - TechPartner Feedback.csv');
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

        console.log('Feedback Data Loaded:', {
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
    } else {
      // For other cohorts, return empty array as no feedback data exists
      console.log(`No feedback data available for cohort ${cohortId}`);
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error loading feedback CSV:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      cohortId
    });
    return NextResponse.json(
      { error: 'Failed to load feedback data' },
      { status: 500 }
    );
  }
}
