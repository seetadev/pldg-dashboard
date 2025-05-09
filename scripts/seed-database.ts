import fs from "fs";
import path from "path";
import papaparse from "papaparse";
import dotenvPkg from "dotenv";
import { fileURLToPath } from "url";
import connectToDatabase from "../src/lib/db.js";
import { engagementService } from "../src/lib/engagement-data/index.js";

// Get exports from CommonJS packages
const { parse } = papaparse;
const { config } = dotenvPkg;

// Setup dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config();

/**
 * Reads a CSV file and parses its content
 * @param filePath Path to the CSV file
 * @returns Parsed data from the CSV file
 */
async function readCSVFile(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error: Error) => {
          reject(error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets all CSV files from a directory
 * @param directoryPath Path to the directory containing CSV files
 * @returns Array of CSV file paths
 */
function getCSVFiles(directoryPath: string): string[] {
  try {
    const files = fs.readdirSync(directoryPath);
    return files
      .filter((file) => file.toLowerCase().endsWith(".csv"))
      .map((file) => path.join(directoryPath, file));
  } catch (error) {
    console.error("Error reading directory:", error);
    return [];
  }
}

/**
 * Seeds a single collection from a CSV file
 * @param filePath Path to the CSV file
 * @returns Number of documents inserted
 */
async function seedCollection(filePath: string): Promise<number> {
  try {
    const filename = path.basename(filePath);

    // Parse the CSV file
    const data = await readCSVFile(filePath);

    if (!data || data.length === 0) {
      console.warn(`No data found in ${filename}`);
      return 0;
    }

    console.log(`Processing ${data.length} records from ${filename}`);

    // Use the engagement service to seed the data
    const result = await engagementService.seedData(data);
    console.log(
      `Inserted ${result.length} documents into EngagementData collection`
    );

    return result.length;
  } catch (error) {
    console.error(`Error seeding from file ${filePath}:`, error);
    return 0;
  }
}

/**
 * Main function to seed the database from all CSV files
 */
async function seedDatabase() {
  try {
    console.log("Connecting to database...");
    await connectToDatabase();

    // Use path.resolve for cross-platform compatibility
    const dataDir = path.resolve(process.cwd(), "public", "data");
    console.log(`Looking for CSV files in ${dataDir}...`);

    const csvFiles = getCSVFiles(dataDir);

    if (csvFiles.length === 0) {
      console.warn("No CSV files found in the data directory");
      process.exit(0);
    }

    console.log(`Found ${csvFiles.length} CSV files to process`);

    let totalInserted = 0;

    for (const filePath of csvFiles) {
      const inserted = await seedCollection(filePath);
      totalInserted += inserted;
    }

    console.log(
      `Database seeding completed. Total documents inserted: ${totalInserted}`
    );
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seeding script
seedDatabase();
