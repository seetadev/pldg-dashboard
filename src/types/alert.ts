// types/alert.ts
import { z } from "zod";

export const AlertThresholdSchema = z.object({
  inactiveWeeks: z.number().min(1).default(2),
  contributionDropPercentage: z.number().min(0).max(100).default(30),
  contributorDropCount: z.number().min(1).default(2),
});

export type AlertThreshold = z.infer<typeof AlertThresholdSchema>;

export const UserAlertSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  userId: z.string(),
  userName: z.string(),
  githubUsername: z.string().optional(),
  cohortId: z.string(),
  alertType: z.enum(["inactivity", "contribution-drop", "new-contributor"]),
  metric: z.string(),
  currentValue: z.number(),
  previousValue: z.number().optional(),
  percentageChange: z.number().optional(),
  week: z.string(),
  firstDetected: z.string().default(() => new Date().toISOString()),
  status: z.enum(["new", "acknowledged", "resolved"]).default("new"),
});

export type UserAlert = z.infer<typeof UserAlertSchema>;

export const CohortAlertSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  cohortId: z.string(),
  alertType: z.enum(["contributor-drop", "engagement-drop", "activity-spike"]),
  metric: z.string(),
  currentValue: z.number(),
  previousValue: z.number(),
  percentageChange: z.number(),
  week: z.string(),
  affectedUsers: z.array(z.string()).optional(),
  firstDetected: z.string().default(() => new Date().toISOString()),
  status: z.enum(["new", "acknowledged", "resolved"]).default("new"),
});

export type CohortAlert = z.infer<typeof CohortAlertSchema>;
