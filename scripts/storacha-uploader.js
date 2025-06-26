import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as Client from '@web3-storage/w3up-client';
import { StoreMemory } from '@web3-storage/w3up-client/stores/memory';
import { Signer } from '@web3-storage/w3up-client/principal/ed25519';
import * as Proof from '@web3-storage/w3up-client/proof';
import dotenv from 'dotenv';

dotenv.config();

if (typeof global.File === 'undefined') {
  global.File = class File extends Blob {
    constructor(chunks, name, options = {}) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cohort1CSVPath = path.resolve(__dirname, '../public/data/cohort-1/Weekly Engagement Survey Breakdown (4).csv');
const cohort2CSVPath = path.resolve(__dirname, '../public/data/cohort-2/[cohort 2] Weekly Engagement Survey-Raw Dataset.csv');
// const cohort1FeedbackCSVPath = path.resolve(__dirname, '../public/data/cohort-1/PLDG Cohort 1 RetroPGF - TechPartner Feedback.csv');
const cohort2FeedbackCSVPath = path.resolve(__dirname, '../public/data/cohort-2/PLDG Cohort 2 RetroPGF - TechPartner Feedback.csv');

async function initStorachaClient() {
  try {
    const principal = Signer.parse(process.env.KEY);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });
    const proof = await Proof.parse(process.env.PROOF);
    const space = await client.addSpace(proof);
    await client.setCurrentSpace(space.did());
    return client;
  } catch (error) {
    console.error("Error initializing Storacha client:", error);
    throw new Error("Failed to initialize Storacha client: " + error.message);
  }
}

async function prepareFiles() {
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
  return fileObjs;
}

async function uploadToStoracha() {
  try {
    const client = await initStorachaClient();
    const fileObjs = await prepareFiles();
    if (fileObjs.length === 0) {
      console.error('No files found to upload.');
      return;
    }
    const directoryCid = await client.uploadDirectory(fileObjs);
    console.log('Directory uploaded!');
    console.log('CID:', directoryCid);
    console.log(`View at: https://${directoryCid}.ipfs.w3s.link`);
  } catch (err) {
    console.error('Upload failed:', err.message);
  }
}

uploadToStoracha(); 