import mongoose, { Schema, Document } from "mongoose";
import { EngagementData } from "../../types/dashboard";

// Interface for the Mongoose document
export interface EngagementDataDocument
  extends Omit<Document, keyof EngagementData>,
    EngagementData {
  // Additional properties can be added here if needed
}

// Schema definition
const EngagementDataSchema = new Schema<EngagementDataDocument>(
  {
    Name: { type: String, required: true },
    "Github Username": { type: String },
    "Program Week": { type: String, required: true },
    "Engagement Participation ": { type: String },
    "Tech Partner Collaboration?": { type: String },
    "Which Tech Partner": { type: Schema.Types.Mixed }, // Can be string or string[]
    "How many issues, PRs, or projects this week?": { type: String },
    "Issue Title 1": { type: Schema.Types.Mixed },
    "Issue Link 1": { type: Schema.Types.Mixed },
    "Issue Title 2": { type: Schema.Types.Mixed },
    "Issue Link 2": { type: Schema.Types.Mixed },
    "Issue Title 3": { type: Schema.Types.Mixed },
    "Issue Link 3": { type: Schema.Types.Mixed },
  },
  {
    strict: false, // Allow additional fields not specified in the schema
    timestamps: true,
  }
);

// Create and export model
const EngagementDataModel =
  mongoose.models.EngagementData ||
  mongoose.model<EngagementDataDocument>(
    "EngagementData",
    EngagementDataSchema
  );

export default EngagementDataModel;
