import mongoose from "mongoose";
import connectToDatabase from "../db";
import EngagementData, { EngagementDataDocument } from "./model";

/**
 * Service for handling engagement data operations
 * Optimized for Next.js environment with efficient connection handling
 */
export class EngagementService {
  private connectionPromise: Promise<typeof mongoose> | null = null;

  /**
   * Initialize service and ensure database connection is established
   */
  constructor() {
    this.ensureConnection();
  }

  /**
   * Ensure a valid database connection exists
   * Reuses existing connection if already established
   */
  private async ensureConnection() {
    if (!this.connectionPromise) {
      this.connectionPromise = connectToDatabase();
    }
    return this.connectionPromise;
  }

  /**
   * Get all engagement data records
   */
  async getAll(): Promise<EngagementDataDocument[]> {
    await this.ensureConnection();
    return EngagementData.find().exec();
  }

  /**
   * Get engagement data by id
   */
  async getById(id: string): Promise<EngagementDataDocument | null> {
    await this.ensureConnection();
    return EngagementData.findById(id).exec();
  }

  /**
   * Create a new engagement data record
   */
  async create(
    data: Partial<EngagementDataDocument>
  ): Promise<EngagementDataDocument> {
    await this.ensureConnection();
    return EngagementData.create(data);
  }

  /**
   * Create multiple engagement data records
   */
  async createMany(data: any[]): Promise<EngagementDataDocument[]> {
    await this.ensureConnection();
    return EngagementData.insertMany(data);
  }

  /**
   * Update an engagement data record
   */
  async update(
    id: string,
    data: Partial<EngagementDataDocument>
  ): Promise<EngagementDataDocument | null> {
    await this.ensureConnection();
    return EngagementData.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  /**
   * Delete an engagement data record
   */
  async delete(id: string): Promise<EngagementDataDocument | null> {
    await this.ensureConnection();
    return EngagementData.findByIdAndDelete(id).exec();
  }

  /**
   * Delete all engagement data records
   */
  async deleteAll(): Promise<void> {
    await this.ensureConnection();
    await EngagementData.deleteMany({});
  }

  /**
   * Clear existing data and seed from new data
   */
  async seedData(data: any[]): Promise<EngagementDataDocument[]> {
    await this.ensureConnection();
    await EngagementData.deleteMany({});
    return EngagementData.insertMany(data);
  }

  /**
   * Find engagement data by program week
   */
  async findByProgramWeek(week: string): Promise<EngagementDataDocument[]> {
    await this.ensureConnection();
    return EngagementData.find({ "Program Week": week }).exec();
  }

  /**
   * Find engagement data by tech partner
   */
  async findByTechPartner(partner: string): Promise<EngagementDataDocument[]> {
    await this.ensureConnection();
    return EngagementData.find({ "Which Tech Partner": partner }).exec();
  }
}

// Create a singleton instance
const engagementService = new EngagementService();
export default engagementService;
