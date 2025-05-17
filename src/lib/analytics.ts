import { CohortId } from '@/types/cohort';

interface CohortAnalytics {
  cohortId: CohortId;
  timestamp: string;
  action: 'view' | 'switch' | 'refresh';
  metrics?: {
    activeContributors?: number;
    totalContributions?: number;
    engagementRate?: number;
  };
}

const analyticsQueue: CohortAnalytics[] = [];

export function trackCohortUsage(
  cohortId: CohortId,
  action: CohortAnalytics['action'],
  metrics?: CohortAnalytics['metrics']
) {
  const event: CohortAnalytics = {
    cohortId,
    timestamp: new Date().toISOString(),
    action,
    metrics,
  };

  analyticsQueue.push(event);
  if (analyticsQueue.length >= 10) {
    flushAnalytics();
  }
}

function flushAnalytics() {
  if (analyticsQueue.length === 0) return;

  analyticsQueue.length = 0;
}
