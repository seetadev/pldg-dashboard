import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const dbName = 'cohortDB';

let mongoClient: MongoClient | null = null;

async function getMongoClient() {
  if (!mongoClient) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  }
  return mongoClient;
}

export async function GET(req: NextRequest) {
  const cohortId = req.nextUrl.searchParams.get('id');
  if (!cohortId) {
    return NextResponse.json({ error: 'Missing cohort ID' }, { status: 400 });
  }

  const collectionName = `cohort${cohortId}`;

  try {
    const client = getMongoClient();
    await client.connect();
    const data = await client
      .db(dbName)
      .collection(collectionName)
      .find({})
      .toArray();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch cohort data' },
      { status: 500 }
    );
  }
}
