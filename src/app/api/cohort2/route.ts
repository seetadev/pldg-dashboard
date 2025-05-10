// app/api/cohort2/route.ts
import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';


const uri = process.env.MONGO_URI!;
const client = new MongoClient(uri);
const dbName = 'cohortDB';
const collectionName = 'cohort2';

export async function GET() {
  try {
    await client.connect();
    const data = await client.db(dbName).collection(collectionName).find({}).toArray();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}