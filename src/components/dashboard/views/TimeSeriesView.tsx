'use client';

import { useMemo } from 'react';
import { EnhancedTechPartnerData } from '@/types/dashboard';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface TimeSeriesViewProps {
  data: EnhancedTechPartnerData[];
}


interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    name: string;
    value: number; 
    payload:Record<string, number | string>;
  }[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length || !label) return null;
  console.log("The payload is", payload);

  const weekNumber = label.replace(/Week Week/, "Week");
  const insightsElements = payload[0];

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="text-base font-medium text-gray-800 pb-3 border-b border-gray-100">
    {weekNumber}
    </div>
    
    {/* Key Metrics Component */}
    <div className="py-4 text-sm text-gray-700 space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Avg. Engagement</span>
        <span className="font-medium text-gray-900">
          {insightsElements?.payload != null
            ? Number(insightsElements.payload.avgEngagement)
            : "N/A"}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Issues per capita</span>
        <span className="font-medium text-gray-900">
          {insightsElements?.payload != null
            ? Number(insightsElements.payload.issuesPerCapita)
            : "N/A"}
        </span>
      </div>
    </div>
    
    {/* Partners & Issues List */}
    <div className="pt-3">
        <div className="text-xs uppercase font-medium text-gray-500 mb-2">Partners & Issues</div>
        <div className="divide-y divide-gray-100">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center py-2 text-sm w-full">
              <div className="flex items-center gap-2 flex-1">
                <span
                  className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.name }}
                />
                <span className="text-gray-800">{entry.name}</span>
              </div>
              <div className="ml-6 text-gray-700 font-medium">
                {entry.value} {entry.value === 1 ? "issue" : "issues"}
              </div>
            </div>
          ))}
        </div>
      </div>
  </div>
  );
};


export function TimeSeriesView({ data }: TimeSeriesViewProps) {
  const chartData = React.useMemo(() => {
    if (!data?.length) return [];
    // Get all unique weeks and format them
    const allWeeks = new Set<string>();
    data.forEach((partner) => {
      partner.timeSeriesData.forEach((ts) => {
        if (ts.week) {
          // Extract just the week number
          const weekNum = ts.week.match(/Week (\d+)/)?.[1];
          if (weekNum) allWeeks.add(`Week ${weekNum}`);
        }
      });
    });  

   

    // Sort weeks by number
    const sortedWeeks = Array.from(allWeeks).sort((a, b) => {
      const weekA = parseInt(a.match(/\d+/)?.[1] || '0');
      const weekB = parseInt(b.match(/\d+/)?.[1] || '0');
      return weekA - weekB;
    });

  
    // Create data points for each week
    return sortedWeeks.map((weekLabel) => {
      let totalEngagement = 0;
      let totalContributors = 0;
      let totalIssues = 0;
      const point: Record<string, string | number> = { week: weekLabel };

      // Process each partner's data for this week
      data.forEach((partner) => {
        // Find matching week data by comparing week numbers
        const weekData = partner.timeSeriesData.find((ts) => {
          const tsWeekNum = ts.week.match(/Week (\d+)/)?.[1];
          const currentWeekNum = weekLabel.match(/Week (\d+)/)?.[1];
          return tsWeekNum === currentWeekNum;
        });
        
        const contributors = weekData?.contributors.length || 0;
        const engagement = weekData?.engagementLevel || 0;
        // Add the issue count for this partner
        point[partner.partner] = weekData?.issueCount || 0;

        if (contributors > 0) {
          totalEngagement = engagement;
          totalContributors += contributors;
          totalIssues += weekData?.issueCount || 0;
        }
      });
      point["avgEngagement"] = (totalEngagement/data.length).toFixed(2) || 0;
      point["issuesPerCapita"] = totalContributors > 0 ? (totalIssues / totalContributors).toFixed(2) : 0;
      return point;
    });
  }, [data]);

  if (!chartData.length) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  const COLORS = {
    Libp2p: '#3B82F6',
    IPFS: '#14B8A6',
    'Fil-B': '#A855F7',
    'Fil-Oz': '#6366F1',
    'Coordination Network': '#F43F5E',
    Storacha: '#F59E0B',
    Drand: '#10B981',
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" tick={{ fontSize: 12 }} />
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: 'Issues',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle' },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {Object.entries(COLORS).map(([partner, color]) => (
            <Bar
              key={partner}
              dataKey={partner}
              fill={color}
              stackId="stack"
              name={partner}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
