import { DateRange } from 'react-day-picker';

export type ActionItemType = 'warning' | 'opportunity' | 'success';

export interface ActionItem {
  type: ActionItemType;
  title: string;
  description: string;
  action: string;
}

export interface EngagementData {
  Name: string;
  'Github Username'?: string;
  'Program Week': string;
  'Engagement Participation '?: string;
  'Tech Partner Collaboration?': string;
  'Which Tech Partner': string | string[];
  'How many issues, PRs, or projects this week?': string;
  'Issue Title 1'?: string | string[];
  'Issue Link 1'?: string | string[];
  'Issue Title 2'?: string | string[];
  'Issue Link 2'?: string | string[];
  'Issue Title 3'?: string | string[];
  'Issue Link 3'?: string | string[];
  [key: string]: string | string[] | undefined;
}

export interface IssueResult {
  title: string;
  link: string;
  status: string;
  engagement: number;
  week: string;
}

export interface IssueHighlight {
  title: string;
  url: string;
}

export interface IssueMetrics {
  week: string;
  open: number;
  closed: number;
  total: number;
}

export interface RawIssueMetric {
  category: string;
  count: number;
  percentComplete: number;
}

export interface FeedbackSentiment {
  positive: number;
  neutral: number;
  negative: number;
}

export interface TopPerformer {
  name: string;
  totalIssues: number;
  avgEngagement: number;
}

export interface TechPartnerMetrics {
  partner: string;
  totalIssues: number;
  activeContributors: number;
  avgIssuesPerContributor: number;
  collaborationScore: number;
}

export interface TechPartnerPerformance {
  partner: string;
  timeSeriesData: Array<{
    week: string;
    weekEndDate: string;
    issueCount: number;
    contributors: string[];
    engagementLevel: number;
    issues: Array<{
      title: string;
      url: string;
      status: 'open' | 'closed';
      lastUpdated: string;
      contributor: string;
    }>;
  }>;
  contributorDetails: Array<{
    name: string;
    githubUsername: string;
    issuesCompleted: number;
    engagementScore: number;
  }>;
  issues: number;
}

export interface ContributorDetails {
  name: string;
  githubUsername: string;
  issuesCompleted: number;
  engagementScore: number;
  email?: string;
  recentIssues?: Array<{
    title: string;
    link?: string;
    description?: string;
  }>;
}

export interface TechPartnerFilter {
  selectedPartner: string | 'all';
  weeks: string[]; // Chronologically ordered weeks 1-12
}

export interface ActionableInsight {
  type: 'success' | 'warning';
  title: string;
  description: string;
  link?: string;
}

export interface IssueTracking {
  title: string;
  link: string;
  status: 'open' | 'closed';
  engagement: number;
  week: string;
  contributor: string;
}

export interface EnhancedTechPartnerData extends TechPartnerPerformance {
  timeSeriesData: {
    week: string;
    weekEndDate: string;
    issueCount: number;
    contributors: string[];
    engagementLevel: number;
    issues: Array<{
      title: string;
      url: string;
      status: 'open' | 'closed';
      lastUpdated: string;
      contributor: string;
    }>;
  }[];
  contributorDetails: ContributorDetails[];
  issueTracking: IssueTracking[];
  mostActiveIssue: { title: string; url: string };
  staleIssue: { title: string; url: string };
}

export interface EngagementTrend {
  week: string;
  total: number;
  // Optional fields for backward compatibility
  'High Engagement'?: number;
  'Medium Engagement'?: number;
  'Low Engagement'?: number;
}

export interface TechnicalProgress {
  week: string;
  'Total Issues': number;
}

export interface ContributorGrowth {
  week: string;
  newContributors: number;
  returningContributors: number;
  totalActive: number;
}

export interface ProcessedData {
  weeklyChange: number;
  activeContributors: number;
  totalContributions: number;
  programHealth: {
    npsScore: number;
    engagementRate: number;
    activeTechPartners: number;
  };
  keyHighlights: {
    activeContributorsAcrossTechPartners: string;
    totalContributions: string;
    positiveFeedback: string;
    weeklyContributions: string;
  };
  topPerformers: TopPerformer[];
  actionItems: ActionItem[];
  engagementTrends: EngagementTrend[];
  technicalProgress: TechnicalProgress[];
  issueMetrics: IssueMetrics[];
  feedbackSentiment: FeedbackSentiment;
  techPartnerMetrics: TechPartnerMetrics[];
  techPartnerPerformance: TechPartnerPerformance[];
  contributorGrowth: ContributorGrowth[];
  rawEngagementData: EngagementData[];
}

export interface AIMetrics {
  engagementScore: number;
  technicalProgress: number;
  collaborationIndex: number;
}

export interface AIInsights {
  keyTrends: string[];
  areasOfConcern: string[];
  recommendations: string[];
  achievements: string[];
  metrics: AIMetrics;
}

export interface EnhancedProcessedData extends ProcessedData {
  insights: AIInsights;
}

export interface GitHubData {
  project: {
    user: {
      projectV2: {
        items: {
          nodes: Array<any>;
        };
      };
    };
  };
  issues: Array<{
    id: string;
    title: string;
    state: string;
    created_at: string;
    closed_at: string | null;
    status: string;
    assignee?: { login: string };
  }>;
  statusGroups: {
    todo: number;
    inProgress: number;
    done: number;
  };
  timestamp: number;
  projectBoard?: {
    issues: any[];
    project: Record<string, any>;
    statusGroups: {
      todo: number;
      inProgress: number;
      done: number;
    };
  };
  userContributions?: Record<string, GitHubUserContribution>;
}

export interface GitHubUserContribution {
  username: string;
  issues: {
    created: number;
    commented: number;
    closed: number;
  };
  pullRequests: {
    created: number;
    reviewed: number;
    merged: number;
  };
  repositories: string[];
  lastActive: string;
}

export interface EnhancedGitHubData extends GitHubData {
  userContributions: Record<string, GitHubUserContribution>;
  contributionDiscrepancies: Array<{
    username: string;
    discrepancy: string
  }>;
}

export interface ConsolidatedData {
  projectBoard: GitHubData;
  userContributions: Record<string, GitHubUserContribution>;
  validatedContributions: Record<string, ValidatedContribution>;
  metrics: DashboardMetrics;
  lastUpdated: number;
  airtableData?: EngagementData[];
  githubData?: GitHubData;
}

export interface ValidatedContribution {
  reported: number;
  projectBoard: number;
  github: number;
  isValid: boolean;
  contributorValid?: boolean;
}

export interface DashboardMetrics {
  totalContributions: number;
  activeContributors: number;
  averageEngagement: number;
  completionRate: number;
  previousTotal: number;
  npsScore?: number;
  trends: {
    engagement: EngagementTrend[];
    technical: TechnicalProgress[];
    techPartner: TechPartnerPerformance[];
    techPartnerPerformance: TechPartnerPerformance[];
    contributorGrowth: ContributorGrowth[];
  };
}

export interface RestEndpointMethodTypes {
  search: {
    issuesAndPullRequests: {
      parameters: {
        q: string;
        sort?: string;
        order?: string;
        per_page?: number;
      };
      response: {
        data: {
          total_count: number;
          items: Array<GitHubIssue>;
        };
      };
    };
  };
}

export interface GitHubIssue {
  title: string;
  state: string;
  created_at: string;
  closed_at: string | null;
  status?: string;
  assignee?: { login: string };
  comments: number;
  pull_request?: {
    merged: boolean;
    merged_at: string | null;
  };
  requested_reviewers?: Array<{ login: string }>;
} 