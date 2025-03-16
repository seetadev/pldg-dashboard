import { GitHubData, GitHubUserContribution, DashboardMetrics, ValidatedContribution } from '@/types/dashboard';

export function calculateMetrics({
  projectBoard,
  userContributions,
  validatedContributions
}: {
  projectBoard: GitHubData;
  userContributions: Record<string, GitHubUserContribution>;
  validatedContributions: Record<string, ValidatedContribution>;
}): DashboardMetrics {
  // Add null checks and provide defaults
  const safeUserContributions = userContributions || {};
  const safeValidatedContributions = validatedContributions || {};
  const safeProjectBoard = projectBoard || { issues: [], statusGroups: { todo: 0, inProgress: 0, done: 0 } };

  // Basic metrics with safe access
  const totalContributions = Object.values(safeUserContributions).reduce((acc, curr) =>
    acc + ((curr?.issues?.created || 0)), 0);

  const activeContributors = Object.values(safeUserContributions).filter(
    user => (user?.issues?.created || 0) > 0
  ).length;

  const averageEngagement = activeContributors > 0 ?
    totalContributions / activeContributors : 0;

  // Generate trend data for charts with safe access
  const trends = {
    engagement: (safeProjectBoard.issues || []).map(issue => ({
      week: new Date(issue.created_at || new Date()).toISOString().split('T')[0],
      'High Engagement': 1,
      'Medium Engagement': 1,
      'Low Engagement': 1,
      total: 3
    })),
    technical: (safeProjectBoard.issues || []).map(issue => ({
      week: new Date(issue.created_at || new Date()).toISOString().split('T')[0],
      'Total Issues': 1
    })),
    techPartner: [],
    techPartnerPerformance: Object.entries(safeValidatedContributions).map(([partner, contrib]) => ({
      partner,
      issues: contrib?.github || 0,
      timeSeriesData: [],  // Add required property
      contributorDetails: []  // Add required property
    })),
    contributorGrowth: [{
      week: new Date().toISOString().split('T')[0],
      newContributors: Object.keys(safeUserContributions).length,
      returningContributors: 0,
      totalActive: Object.keys(safeUserContributions).length
    }]
  };

  // Add console logging for debugging
  console.log('Metrics Calculation:', {
    totalContributions,
    activeContributors,
    hasUserContributions: Object.keys(safeUserContributions).length > 0,
    trendDataSizes: {
      engagement: trends.engagement.length,
      technical: trends.technical.length,
      techPartner: trends.techPartnerPerformance.length,
      growth: trends.contributorGrowth.length
    }
  });

  return {
    totalContributions,
    activeContributors,
    averageEngagement,
    completionRate: 0,
    previousTotal: 0,
    trends
  };
}

export function calculateInitialMetrics(
  projectBoard: GitHubData,
  userContributions: Record<string, GitHubUserContribution>
): DashboardMetrics {
  return calculateMetrics({
    projectBoard,
    userContributions,
    validatedContributions: {}
  });
}

export function generateTrendData(data: {
  projectBoard: GitHubData;
  userContributions: Record<string, GitHubUserContribution>;
  validatedContributions: Record<string, ValidatedContribution>;
}) {
  const {
    projectBoard = { issues: [] },
    userContributions = {},
    validatedContributions = {}
  } = data;

  return {
    engagement: (projectBoard.issues || []).map(issue => ({
      week: new Date(issue.created_at || new Date()).toISOString().split('T')[0],
      'High Engagement': 0,
      'Medium Engagement': 0,
      'Low Engagement': 0,
      total: 0
    })),
    technical: (projectBoard.issues || []).map(issue => ({
      week: new Date(issue.created_at || new Date()).toISOString().split('T')[0],
      'Total Issues': 1
    })),
    techPartner: [],
    techPartnerPerformance: Object.entries(validatedContributions).map(([partner, contrib]) => ({
      partner,
      issues: contrib?.github || 0,
      timeSeriesData: [],  // Add required property
      contributorDetails: []  // Add required property
    })),
    contributorGrowth: [{
      week: new Date().toISOString().split('T')[0],
      newContributors: Object.keys(userContributions).length,
      returningContributors: 0,
      totalActive: Object.keys(userContributions).length
    }]
  };
} 