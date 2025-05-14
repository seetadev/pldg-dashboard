import fs from 'fs';
import csvParser from 'csv-parser';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

const cohort1CSVPath = '../public/data/cohort-1/Weekly Engagement Survey Breakdown (4).csv';
const cohort2CSVPath = '../public/data/cohort-2/[cohort 2] Weekly Engagement Survey-Raw Dataset.csv';
const cohort1FeedbackCSVPath = '../public/data/cohort-1/PLDG Cohort 1 RetroPGF - TechPartner Feedback.csv';
const cohort2FeedbackCSVPath = '../public/data/cohort-2/PLDG Cohort 2 RetroPGF - TechPartner Feedback.csv';

async function uploadCSV() {
  try {
    await client.connect();
    const db = client.db('cohortDB');
    const collection = db.collection('cohort2feedback');

    const results = [];

    fs.createReadStream(cohort2FeedbackCSVPath)  // Replace with your file path
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