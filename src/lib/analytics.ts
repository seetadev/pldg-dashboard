import { CohortId } from "@/types/cohort";

interface CohortAnalytics {
  cohortId: CohortId;
  timestamp: string;
  action: "view" | "switch" | "refresh";
  metrics?: {
    activeContributors?: number;
    totalContributions?: number;
    engagementRate?: number;
  };
}

const analyticsQueue: CohortAnalytics[] = [];

export function trackCohortUsage(
  cohortId: CohortId,
  action: CohortAnalytics["action"],
  metrics?: CohortAnalytics["metrics"],
) {
  const event: CohortAnalytics = {
    cohortId,
    timestamp: new Date().toISOString(),
    action,
    metrics,
  };

  analyticsQueue.push(event);
  console.log("Cohort Analytics Event:", event);

  // In a production environment, you would send this to your analytics service
  if (analyticsQueue.length >= 10) {
    flushAnalytics();
  }
}

function flushAnalytics() {
  if (analyticsQueue.length === 0) return;

  // In production, send to your analytics service
  console.log("Flushing Analytics:", analyticsQueue);
  analyticsQueue.length = 0;
}
