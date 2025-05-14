import { ProcessedData } from "@/types/dashboard";
import { KPICard } from "./KPICard";

export function PerformanceIndicators({ data }: { data: ProcessedData }) {
  const latestIssueMetrics = data.issueMetrics[data.issueMetrics.length - 1];
  const completionRate = latestIssueMetrics
    ? Math.round((latestIssueMetrics.closed / latestIssueMetrics.total) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KPICard
        title="Engagement Rate"
        value={`${data.programHealth.engagementRate}%`}
        trend={+5}
        status="positive"
        description="Weekly active participation"
      />
      <KPICard
        title="NPS Score"
        value={data.programHealth.npsScore}
        trend={-2}
        status="neutral"
        description="Net Promoter Score"
      />
      <KPICard
        title="Active Tech Partners"
        value={data.programHealth.activeTechPartners}
        trend={+3}
        status="positive"
        description="Current collaborating partners"
      />
      <KPICard
        title="Project Completion"
        value={`${completionRate}%`}
        trend={+12}
        status="positive"
        description="On-time delivery rate"
      />
    </div>
  );
}
