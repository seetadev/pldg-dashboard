'use client';

import * as React from 'react';
import { TopPerformer } from '@/types/dashboard';

interface Props {
  data: TopPerformer[];
}

export default function TopPerformersTable({ data }: Props) {
  // Add debug logging
  React.useEffect(() => {
    console.log('Raw TopPerformers Data:', data);
  }, [data]);

  // Normalize and combine duplicate performers
  const normalizedPerformers = React.useMemo(() => {
    // Create a map to store normalized names
    const nameMap = new Map<string, TopPerformer>();

    // Add debug logging for data processing
    console.log('Processing performers:', {
      totalCount: data.length,
      uniqueNames: new Set(data.map(p => p.name)).size
    });

    data.forEach(performer => {
      // Normalize the name (lowercase, trim spaces)
      const normalizedName = performer.name.toLowerCase().trim();
      
      // Special cases for known duplicates with case preservation
      const finalName = 
        normalizedName.includes('nick') && normalizedName.includes('lionis') ? 'Nick Lionis' :
        normalizedName.includes('manu') && normalizedName.includes('sheel') ? 'Manu Sheel Gupta' :
        // Add more name normalizations as needed
        performer.name;

      if (nameMap.has(finalName)) {
        // Combine metrics for existing performer
        const existing = nameMap.get(finalName)!;
        nameMap.set(finalName, {
          name: finalName,
          totalIssues: existing.totalIssues + performer.totalIssues,
          avgEngagement: 0 // We're not using this anymore
        });
      } else {
        // Add new performer with original name
        nameMap.set(finalName, {
          name: finalName,
          totalIssues: performer.totalIssues || 0, // Ensure non-null
          avgEngagement: 0 // We're not using this anymore
        });
      }
    });

    // Convert map to array and sort
    const sortedPerformers = Array.from(nameMap.values())
      .sort((a, b) => {
        // Sort by total issues first
        if (b.totalIssues !== a.totalIssues) {
          return b.totalIssues - a.totalIssues;
        }
        // If total issues are equal, sort by average engagement
        return b.avgEngagement - a.avgEngagement;
      })
      .slice(0, 10); // Get top 10

    // Log processed data
    console.log('Processed TopPerformers:', {
      normalizedCount: sortedPerformers.length,
      topPerformer: sortedPerformers[0]
    });

    return sortedPerformers;
  }, [data]);

  if (!data?.length) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No contributor data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Total Issues</th>
            <th className="px-4 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {normalizedPerformers.map((performer, index) => (
            <tr key={performer.name} className="border-b hover:bg-gray-50">
              <td className="px-4 py-2">{performer.name}</td>
              <td className="px-4 py-2">{performer.totalIssues}</td>
              <td className="px-4 py-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${index < 3 ? 'bg-green-100 text-green-800' : 
                    index < 6 ? 'bg-blue-100 text-blue-800' : 
                    'bg-gray-100 text-gray-800'}`}>
                  {index < 3 ? 'Top Performer' : 
                   index < 6 ? 'High Performer' : 
                   'Active Contributor'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 