import mongoose, { Schema, Document } from "mongoose";

// Interface for the Mongoose document
export interface EngagementDataDocument extends Document {
  Name: string;
  "Github Username"?: string;
  "Program Week": string;
  "Engagement Participation "?: string;
  "Tech Partner Collaboration?": string;
  "Which Tech Partner": string | string[];
  "How many issues, PRs, or projects this week?": string;
  "Issue Title 1"?: string | string[];
  "Issue Link 1"?: string | string[];
  "Issue Title 2"?: string | string[];
  "Issue Link 2"?: string | string[];
  "Issue Title 3"?: string | string[];
  "Issue Link 3"?: string | string[];
  [key: string]: any;
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
const EngagementData =
  mongoose.models.EngagementData ||
  mongoose.model<EngagementDataDocument>(
    "EngagementData",
    EngagementDataSchema
  );

export default EngagementData;
