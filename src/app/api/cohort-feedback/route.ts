import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);
const dbName = 'cohortDB';

export async function GET(req: NextRequest) {
  const cohortId = req.nextUrl.searchParams.get('id');
  if (!cohortId) {
    return NextResponse.json({ error: 'Missing cohort ID' }, { status: 400 });
  }

  const collectionName = `cohort${cohortId}feedback`;

  try {
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
