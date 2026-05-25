import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

let cachedClient: MongoClient | null = null;

async function getClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

const DB_NAME = 'cohortDB';
const COLLECTION_NAME = 'cohortData';

export async function GET() {
  try {
    const client = await getClient();
    const data = await client
      .db(DB_NAME)
      .collection(COLLECTION_NAME)
      .find({})
      .toArray();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch cohort data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data' },
      { status: 500 }
    );
  }
}