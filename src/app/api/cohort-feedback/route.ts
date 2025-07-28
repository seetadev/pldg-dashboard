import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const dbName = 'cohortDB';

function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  return new MongoClient(uri);
}

export async function GET(req: NextRequest) {
  const cohortId = req.nextUrl.searchParams.get('id');
  if (!cohortId) {
    return NextResponse.json({ error: 'Missing cohort ID' }, { status: 400 });
  }

  const collectionName = `cohort${cohortId}feedback`;

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
      { error: 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}
