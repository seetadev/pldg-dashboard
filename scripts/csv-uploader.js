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

async function uploadCSVToCollection(filePath, collectionName) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          const db = client.db('cohortDB');
          const collection = db.collection(collectionName);
          await collection.deleteMany({});
          await collection.insertMany(results);
          console.log(`CSV data imported to MongoDB Atlas: ${collectionName}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function uploadAllCSVs() {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    // Upload all CSV files to their respective collections
    await uploadCSVToCollection(cohort1CSVPath, 'cohort1');
    await uploadCSVToCollection(cohort2CSVPath, 'cohort2');
    // await uploadCSVToCollection(cohort1FeedbackCSVPath, 'cohort1feedback');
    await uploadCSVToCollection(cohort2FeedbackCSVPath, 'cohort2feedback');
    
    console.log('All CSV files uploaded successfully');
  } catch (err) {
    console.error('Error uploading CSV files:', err);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

uploadAllCSVs();