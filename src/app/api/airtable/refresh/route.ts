import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache';

export async function POST() {
  try {
    console.log('Refreshing Airtable data...');

    // Validate environment variables
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;
    const tableName = process.env.AIRTABLE_TABLE_NAME;

    if (!baseId || !apiKey || !tableName) {
      const missingVariables = [];
      if (!baseId) missingVariables.push('AIRTABLE_BASE_ID');
      if (!apiKey) missingVariables.push('AIRTABLE_API_KEY');
      if (!tableName) missingVariables.push('AIRTABLE_TABLE_NAME');

      console.error('Missing required Airtable environment variables:', missingVariables.join(', '));
      return NextResponse.json(
        { error: 'Airtable configuration missing', details: `Missing variables: ${missingVariables.join(', ')}` },
        { status: 500 }
      );
    }
    
    // Clear the cache
    cache.delete('airtable_data');
    
    // Fetch fresh data
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/Weekly Engagement Survey`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

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
    
    // Update cache with fresh data
    cache.set('airtable_data', {
      data: data.records,
      timestamp: Date.now()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Airtable refresh error:', error.message, {
      stack: error.stack,
    });
    return NextResponse.json(
      { error: 'Failed to refresh Airtable data', details: error.message },
      { status: 500 }
    );
  }
} 