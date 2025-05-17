import {
  ProcessedData,
  EnhancedProcessedData,
  AIMetrics,
  AIInsights,
} from "@/types/dashboard";

export function calculateEngagementScore(data: ProcessedData): number {
  const {
    programHealth: { engagementRate, npsScore },
    activeContributors,
    totalContributions,
  } = data;

  // Normalize each metric to a 0-100 scale
  const normalizedEngagement = engagementRate;
  const normalizedNPS = (npsScore + 100) / 2; // NPS is -100 to 100, normalize to 0-100
  const contributorScore = Math.min((activeContributors / 20) * 100, 100); // Cap at 20 contributors
  const contributionScore = Math.min((totalContributions / 50) * 100, 100); // Cap at 50 contributions

  // Weighted average
  return Math.round(
    normalizedEngagement * 0.4 +
      normalizedNPS * 0.3 +
      contributorScore * 0.2 +
      contributionScore * 0.1
  );
}

export function calculateTechnicalProgress(data: ProcessedData): number {
  const { issueMetrics, techPartnerMetrics, weeklyChange } = data;

  const latestIssues = issueMetrics[issueMetrics.length - 1];
  const issueCompletionRate =
    (latestIssues.closed / (latestIssues.total || 1)) * 100;
  const partnerDiversity = Math.min(
    (techPartnerMetrics.length / 10) * 100,
    100
  ); // Cap at 10 partners
  const growthScore = weeklyChange > 0 ? Math.min(weeklyChange, 100) : 0;

  return Math.round(
    issueCompletionRate * 0.4 + partnerDiversity * 0.3 + growthScore * 0.3
  );
}

export function calculateCollaborationIndex(data: ProcessedData): number {
  const {
    techPartnerMetrics,
    programHealth: { activeTechPartners },
    contributorGrowth,
  } = data;

  const averageIssuesPerPartner =
    techPartnerMetrics.reduce((sum, partner) => sum + partner.totalIssues, 0) /
    (techPartnerMetrics.length || 1);

  const partnerScore = Math.min((activeTechPartners / 5) * 100, 100); // Cap at 5 active partners
  const issueScore = Math.min((averageIssuesPerPartner / 10) * 100, 100); // Cap at 10 issues per partner
  const growthScore = Math.min(
    ((contributorGrowth[contributorGrowth.length - 1]?.newContributors || 0) /
      5) *
      100,
    100
  );

  return Math.round(partnerScore * 0.4 + issueScore * 0.3 + growthScore * 0.3);
}

export function generateAIInsights(data: ProcessedData): AIInsights {
  const metrics = {
    engagementScore: calculateEngagementScore(data),
    technicalProgress: calculateTechnicalProgress(data),
    collaborationIndex: calculateCollaborationIndex(data),
  };

  // Generate insights based on the metrics and data
  const keyTrends: string[] = [];
  const areasOfConcern: string[] = [];
  const recommendations: string[] = [];
  const achievements: string[] = [];

  // Analyze engagement trends
  if (data.weeklyChange > 10) {
    achievements.push(
      `Strong growth with ${Math.round(data.weeklyChange)}% increase in contributions`
    );
  } else if (data.weeklyChange < -10) {
    areasOfConcern.push(
      `Declining engagement with ${Math.abs(Math.round(data.weeklyChange))}% decrease in contributions`
    );
    recommendations.push(
      "Schedule community engagement sessions to boost participation"
    );
  }

  // Analyze technical progress
  const latestIssues = data.issueMetrics[data.issueMetrics.length - 1];
  const completionRate =
    (latestIssues.closed / (latestIssues.total || 1)) * 100;
  if (completionRate > 70) {
    achievements.push(
      `High issue completion rate at ${Math.round(completionRate)}%`
    );
  } else if (completionRate < 30) {
    areasOfConcern.push(
      `Low issue completion rate at ${Math.round(completionRate)}%`
    );
    recommendations.push(
      "Review issue complexity and provide additional technical support"
    );
  }

  // Analyze collaboration
  if (data.programHealth.activeTechPartners > 3) {
    achievements.push(
      `Strong partner diversity with ${data.programHealth.activeTechPartners} active tech partners`
    );
  } else {
    recommendations.push(
      "Expand tech partner outreach to increase collaboration opportunities"
    );
  }

  return {
    keyTrends,
    areasOfConcern,
    recommendations,
    achievements,
    metrics,
  };
}

export function enhanceProcessedData(
  data: ProcessedData
): EnhancedProcessedData {
  return {
    ...data,
    insights: generateAIInsights(data),
  };
}

export async function processDataWithAI(
  data: ProcessedData
): Promise<EnhancedProcessedData> {
  return {
    ...data,
    insights: generateAIInsights(data),
  };
}
