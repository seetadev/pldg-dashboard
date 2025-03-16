import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, CheckCircle, Users } from "lucide-react";
import { ProcessedData } from "@/types/dashboard";

interface ActionableInsight {
  type: 'success' | 'warning' | 'opportunity';
  title: string;
  description: string;
  metric?: number;
  action?: string;
}

export function ActionableInsights({ data }: { data: ProcessedData }) {
  const insights: ActionableInsight[] = React.useMemo(() => {
    const insights: ActionableInsight[] = [];
    
    // Get the last 4 weeks of data for trend analysis
    const recentWeeks = data.engagementTrends.slice(-4);
    
    // Calculate week-over-week trends
    if (recentWeeks.length >= 2) {
      const currentWeek = recentWeeks[recentWeeks.length - 1];
      const previousWeek = recentWeeks[recentWeeks.length - 2];
      const changePercent = Math.round(((currentWeek.total - previousWeek.total) / previousWeek.total) * 100);

      // Only show significant changes (more than 10%)
      if (Math.abs(changePercent) > 10) {
        insights.push({
          type: changePercent < 0 ? 'warning' : 'success',
          title: changePercent < 0 ? 'Significant Drop in Activity' : 'Strong Growth in Participation',
          description: `${Math.abs(changePercent)}% ${changePercent < 0 ? 'decrease' : 'increase'} in active contributors`,
          metric: changePercent,
          action: changePercent < 0 
            ? 'Schedule 1:1 check-ins with recently inactive contributors'
            : 'Maintain momentum by highlighting recent contributor achievements'
        });
      }
    }

    // Analyze contribution patterns
    const contributionTrend = recentWeeks.map(w => w.total);
    const isDecreasingTrend = contributionTrend.every((val, i) => 
      i === 0 || val <= contributionTrend[i - 1]
    );

    if (isDecreasingTrend && recentWeeks.length > 2) {
      insights.push({
        type: 'warning',
        title: 'Declining Participation Trend',
        description: 'Consistent decrease in participation over the last 3 weeks',
        action: 'Review program engagement strategies and gather feedback'
      });
    }

    // Tech Partner Analysis
    const activeTechPartners = data.techPartnerMetrics.filter(m => m.activeContributors > 0);
    const totalPartners = data.techPartnerMetrics.length;
    const partnerEngagementRate = Math.round((activeTechPartners.length / totalPartners) * 100);

    if (partnerEngagementRate < 50) {
      insights.push({
        type: 'opportunity',
        title: 'Tech Partner Engagement Opportunity',
        description: `Only ${partnerEngagementRate}% of tech partners are actively engaged`,
        metric: partnerEngagementRate,
        action: 'Schedule outreach to inactive tech partners and identify collaboration opportunities'
      });
    }

    // Debug logging
    console.log('Insight Generation:', {
      recentWeeks: recentWeeks.map(w => ({ week: w.week, total: w.total })),
      contributionTrend,
      isDecreasingTrend,
      partnerEngagementRate,
      generatedInsights: insights.length
    });

    return insights;
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
        <CardDescription>Key areas requiring attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  insight.type === 'success' ? 'bg-green-50 border-green-200' :
                  'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {insight.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
                  {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {insight.type === 'opportunity' && <TrendingUp className="w-5 h-5 text-blue-600" />}
                  <div>
                    <h4 className="font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    {insight.action && (
                      <p className="text-sm font-medium">
                        Recommended Action: {insight.action}
                      </p>
                    )}
                  </div>
                  {insight.metric !== undefined && (
                    <span className={`ml-auto font-medium ${
                      insight.type === 'warning' ? 'text-red-600' :
                      insight.type === 'success' ? 'text-green-600' :
                      'text-blue-600'
                    }`}>
                      {insight.metric > 0 ? '+' : ''}{insight.metric}%
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No critical action items at this time
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 