import fs from 'fs';
import csvParser from 'csv-parser';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function uploadCSV() {
  try {
    await client.connect();
    const db = client.db('cohortDB');
    const collection = db.collection('cohortData');

    const results = [];
    fs.createReadStream('../public/data/Weekly Engagement Survey Breakdown (4).csv')  // Replace with your file path
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        await collection.deleteMany({});
        await collection.insertMany(results);
        console.log('CSV data imported to MongoDB Atlas.');
        await client.close();
      });
  } catch (err) {
    console.error(err);
  }
}

uploadCSV();
