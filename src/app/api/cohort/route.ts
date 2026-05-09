// app/api/cohort/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const dbName = 'cohortDB';
const collectionName = 'cohortData';

export async function GET() {
  const uri = process.env.MONGO_URI;
  
  if (!uri) {
    return NextResponse.json(
      { error: 'MONGO_URI environment variable is not set' },
      { status: 500 }
    );
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const data = await client.db(dbName).collection(collectionName).find({}).toArray();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  } finally {
    await client.close();
  }
}
