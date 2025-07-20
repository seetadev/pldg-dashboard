import { ProcessedData, EngagementData } from '@/types/dashboard';

export default function normalizeEngagementData(entry: Record<string, any>): ProcessedData {
  const engagementData: EngagementData = {
    Name: entry.Name || '',
    'Program Week': entry['Program Week'] || '',
    'Tech Partner Collaboration?': entry['Tech Partner Collaboration?'] || '',
    'Which Tech Partner': entry['Which Tech Partner'] || '',
    'How many issues, PRs, or projects this week?': entry['How many issues, PRs, or projects this week?'] || '0',
    'Engagement Participation ': entry['Engagement Participation '] || '',
    'Github Username': entry['Github Username'] || '',
    'Issue Title 1': entry['Issue Title 1'] || '',
    'Issue Link 1': entry['Issue Link 1'] || '',
    'Issue Title 2': entry['Issue Title 2'] || '',
    'Issue Link 2': entry['Issue Link 2'] || '',
    'Issue Title 3': entry['Issue Title 3'] || '',
    'Issue Link 3': entry['Issue Link 3'] || ''
  };

  return {
    weeklyChange: 0,
    activeContributors: 0,
    totalContributions: 0,
    programHealth: {
      npsScore: 0,
      engagementRate: 0,
      activeTechPartners: 0
    },
    keyHighlights: {
      activeContributorsAcrossTechPartners: '0 across 0',
      totalContributions: '0 total',
      positiveFeedback: '0 positive',
      weeklyContributions: '0% change'
    },
    topPerformers: [],
    actionItems: [],
    engagementTrends: [],
    technicalProgress: [],
    issueMetrics: [],
    feedbackSentiment: {
      positive: 0,
      neutral: 0,
      negative: 0
    },
    techPartnerMetrics: [],
    techPartnerPerformance: [],
    contributorGrowth: [],
    rawEngagementData: [engagementData],
    engagementAlerts: {
      totalAlerts: 0,
      criticalAlerts: 0,
      warningAlerts: 0,
      inactivityAlerts: 0,
      engagementDropAlerts: 0,
      alerts: []
    }
  };
} 