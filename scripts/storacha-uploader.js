import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { create } from '@web3-storage/w3up-client';
import dotenv from 'dotenv';

if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    constructor(chunks, name, options = {}) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cohort1CSVPath = path.resolve(__dirname, '../public/data/cohort-1/Weekly Engagement Survey Breakdown (4).csv');
const cohort2CSVPath = path.resolve(__dirname, '../public/data/cohort-2/[cohort 2] Weekly Engagement Survey-Raw Dataset.csv');
// const cohort1FeedbackCSVPath = path.resolve(__dirname, '../public/data/cohort-1/PLDG Cohort 1 RetroPGF - TechPartner Feedback.csv');
const cohort2FeedbackCSVPath = path.resolve(__dirname, '../public/data/cohort-2/PLDG Cohort 2 RetroPGF - TechPartner Feedback.csv');

async function uploadFilesToStoracha() {
  const client = await create();

  const email = process.env.STORACHA_EMAIL || 'durgachaitu193@gmail.com';
  const account = await client.login(email);
  await account.plan.wait(); // Wait for payment plan if needed

  const space = await client.createSpace('pldg-dashboard-test', { account });
  await client.setCurrentSpace(space.did());

  const filesToUpload = [
    { filePath: cohort1CSVPath, name: 'cohort-1/Weekly Engagement Survey Breakdown (4).csv' },
    { filePath: cohort2CSVPath, name: 'cohort-2/[cohort 2] Weekly Engagement Survey-Raw Dataset.csv' },
    { filePath: cohort2FeedbackCSVPath, name: 'cohort-2/PLDG Cohort 2 RetroPGF - TechPartner Feedback.csv' },
    // { filePath: cohort1FeedbackCSVPath, name: 'cohort-1/PLDG Cohort 1 RetroPGF - TechPartner Feedback.csv' },
  ];

  const fileObjs = [];
  for (const { filePath, name } of filesToUpload) {
    try {
      const data = await fs.readFile(filePath);
      const file = new File([data], name);
      fileObjs.push(file);
    } catch (err) {
      console.warn(`Skipping missing file: ${filePath}`);
    }
  }

  if (fileObjs.length === 0) {
    console.error('No files found to upload.');
    return;
  }

  const directoryCid = await client.uploadDirectory(fileObjs);

  console.log('Directory uploaded!');
  console.log('CID:', directoryCid);
  console.log(`View at: https://${directoryCid}.ipfs.w3s.link`);
}

uploadFilesToStoracha().catch(console.error); 