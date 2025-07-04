import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { EngagementData } from '@/types/dashboard';

export async function GET() {
  try {
    console.log('Using local CSV data...');
    
    // Read the latest CSV file
    const csvPath = path.join(process.cwd(), 'public', 'data', 'Weekly Engagement Survey Breakdown (4).csv');
    console.log('Attempting to read file:', csvPath);
    
    try {
      // Read the CSV file
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
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.error(`CSV file not found: ${csvPath}`);
        return NextResponse.json([], { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error loading CSV:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to load CSV data' },
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
