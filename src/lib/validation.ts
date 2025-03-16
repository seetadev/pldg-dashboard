import { GitHubData, GitHubUserContribution, ValidatedContribution } from '@/types/dashboard';
import { VALIDATION_CONFIG, normalizeContributorName } from './constants';
import { EngagementData } from '@/types/dashboard';

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

export function validateCSVData(data: EngagementData[]): EngagementData[] {
  return data.filter(record => {
    // Basic validation checks
    const isValid = 
      // Required fields check
      record.Name && 
      record['Program Week'] &&
      record.cohortId &&
      // Cohort format check (optional)
      /^cohort-\d+$/.test(record.cohortId);
    
    if (!isValid) {
      console.warn('Invalid record found:', record);
    }
    
    return isValid;
  });
}