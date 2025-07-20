import { GitHubData, GitHubUserContribution, ValidatedContribution } from '@/types/dashboard';
import { VALIDATION_CONFIG, normalizeContributorName } from './constants';
import { z } from 'zod';

export interface AirtableRecord {
  fields: {
    Name: string;
    'How many issues, PRs, or projects this week?': string;
    [key: string]: any;
  };
}

export interface AirtableResponse {
  records: AirtableRecord[];
}

export function validateContributions(
  projectBoard: GitHubData,
  userContributions: Record<string, GitHubUserContribution>,
  airtableData: AirtableResponse
): {
  validatedContributions: Record<string, ValidatedContribution>;
  discrepancies: Array<{ username: string; discrepancy: string }>;
} {
  const discrepancies: Array<{ username: string; discrepancy: string }> = [];
  const validatedContributions: Record<string, ValidatedContribution> = {};

  if (!projectBoard?.projectBoard?.issues) {
    console.warn('No project board data available for validation');
    return { validatedContributions, discrepancies };
  }

  // First validate against project board (primary source)
  for (const record of airtableData.records) {
    if (!record?.fields?.Name) continue;

    const githubUsername = normalizeContributorName(record.fields.Name);
    const reportedCount = parseInt(record.fields['How many issues, PRs, or projects this week?'] || '0', 10);
    
    const projectBoardCount = countUserProjectBoardItems(projectBoard, githubUsername);
    const githubCount = countUserGithubContributions(userContributions[githubUsername]);

    // Primary validation against project board
    const projectBoardValid = Math.abs(reportedCount - projectBoardCount) <= VALIDATION_CONFIG.maxIssueDifference;

    // Secondary validation against contributor profile
    const contributorValid = Math.abs(githubCount - projectBoardCount) <= VALIDATION_CONFIG.maxIssueDifference;

    if (!projectBoardValid) {
      discrepancies.push({
        username: githubUsername,
        discrepancy: `Project Board: Reported ${reportedCount} vs actual ${projectBoardCount}`
      });
    }

    if (!contributorValid) {
      discrepancies.push({
        username: githubUsername,
        discrepancy: `Contributor Profile: Board shows ${projectBoardCount} vs profile shows ${githubCount}`
      });
    }

    validatedContributions[githubUsername] = {
      reported: reportedCount,
      projectBoard: projectBoardCount,
      github: githubCount,
      isValid: projectBoardValid, // Primary source determines validity
      contributorValid: contributorValid // Additional validation info
    };
  }

  return { validatedContributions, discrepancies };
}

export function countUserProjectBoardItems(projectBoard: GitHubData, username: string): number {
  return (projectBoard.projectBoard?.issues || projectBoard.issues || []).filter(issue => 
    issue.assignee?.login === username
  ).length;
}

export function countUserGithubContributions(contribution?: GitHubUserContribution): number {
  if (!contribution) return 0;
  return (
    contribution.issues.created +
    contribution.pullRequests.created +
    contribution.pullRequests.reviewed
  );
}

export const engagementAlertResolutionSchema = z.object({
  resolvedAt: z.string().datetime(),
  resolvedBy: z.string(),
  reason: z.string().min(1)
});

export const engagementAlertSchema = z.object({
  id: z.string().min(1),
  contributorName: z.string().min(1),
  githubUsername: z.string().optional(),
  severity: z.enum(['warning', 'critical']),
  type: z.enum(['inactivity', 'engagement_drop']),
  lastActiveWeek: z.string().min(1),
  inactiveWeeks: z.number().int().min(0),
  previousEngagementLevel: z.number().int().min(0).max(3).optional(),
  currentEngagementLevel: z.number().int().min(0).max(3).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(['active', 'resolved', 'dismissed']),
  resolution: engagementAlertResolutionSchema.optional()
});

export const engagementAlertSummarySchema = z.object({
  totalAlerts: z.number().int().min(0),
  criticalAlerts: z.number().int().min(0),
  warningAlerts: z.number().int().min(0),
  inactivityAlerts: z.number().int().min(0),
  engagementDropAlerts: z.number().int().min(0),
  alerts: z.array(engagementAlertSchema)
});