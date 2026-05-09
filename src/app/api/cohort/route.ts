import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

const dbName = 'cohortDB';
const collectionName = 'cohortData';

export async function GET() {
  try {
    const client = await clientPromise;
    const data = await client.db(dbName).collection(collectionName).find({}).toArray();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cohort data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
