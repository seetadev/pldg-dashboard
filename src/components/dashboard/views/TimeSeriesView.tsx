'use client';

import * as React from 'react';
import { EnhancedTechPartnerData } from '@/types/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface TimeSeriesViewProps {
  data: EnhancedTechPartnerData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length || !label) return null;

  const weekNumber = label.replace(/Week Week/, 'Week');

  return (
    <Card className="p-3 bg-white/95 shadow-lg border-0">
      <div className="space-y-2">
        <div className="font-medium">{weekNumber}</div>
        <div className="grid gap-1 text-sm">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>
                {entry.name}: {entry.value} {entry.value === 1 ? 'issue' : 'issues'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export function TimeSeriesView({ data }: TimeSeriesViewProps) {
  const chartData = React.useMemo(() => {
    if (!data?.length) return [];

    // Get all unique weeks and format them
    const allWeeks = new Set<string>();
    data.forEach(partner => {
      partner.timeSeriesData.forEach(ts => {
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
    return sortedWeeks.map(weekLabel => {
      const point: Record<string, any> = { week: weekLabel };
      
      // Process each partner's data for this week
      data.forEach(partner => {
        // Find matching week data by comparing week numbers
        const weekData = partner.timeSeriesData.find(ts => {
          const tsWeekNum = ts.week.match(/Week (\d+)/)?.[1];
          const currentWeekNum = weekLabel.match(/Week (\d+)/)?.[1];
          return tsWeekNum === currentWeekNum;
        });

        // Add the issue count for this partner
        point[partner.partner] = weekData?.issueCount || 0;
      });

      return point;
    });
  }, [data]);

  // Debug logging
  React.useEffect(() => {
    console.log('Chart Data:', chartData);
  }, [chartData]);

  if (!chartData.length) {
    return <div className="h-[400px] w-full flex items-center justify-center text-gray-500">
      No data available
    </div>;
  }

  const COLORS = {
    'Libp2p': '#3B82F6',
    'IPFS': '#14B8A6',
    'Fil-B': '#A855F7',
    'Fil-Oz': '#6366F1',
    'Coordination Network': '#F43F5E',
    'Storacha': '#F59E0B',
    'Drand': '#10B981'
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="week"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            label={{ 
              value: 'Issues', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
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
              name={partner} // Add name for tooltip
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
