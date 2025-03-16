'use client';

import * as React from 'react';
import { EngagementTrend } from '@/types/dashboard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';

interface Props {
  data: EngagementTrend[];
}

export default function EngagementChart({ data }: Props) {
  const chartData = React.useMemo(() => {
    if (!data?.length) return [];

    // Process and clean the data - now just counting total active contributors
    const processed = data.map(week => ({
      name: week.week,
      'Active Contributors': week.total || 0  // Use the total field directly
    }));

    console.log('Processed contributor data:', processed);
    return processed;
  }, [data]);

  return (
    <Card className="h-[500px]">
      <CardHeader>
        <CardTitle>Engagement Trends</CardTitle>
        <CardDescription>Weekly engagement levels</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px] pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="activeContributors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              tickMargin={10}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickMargin={10}
              label={{ 
                value: 'Contributors', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '6px',
                padding: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Bar 
              dataKey="Active Contributors" 
              fill="url(#activeContributors)" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}