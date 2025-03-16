'use client';

import * as React from 'react';
import { EnhancedTechPartnerData } from '@/types/dashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, GitPullRequest } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ContributorViewProps {
  data: EnhancedTechPartnerData[];
}

export function ContributorView({ data }: ContributorViewProps) {
  const contributors = React.useMemo(() => {
    if (!data?.length) return [];

    const contributorMap = new Map<string, {
      name: string;
      githubUsername: string;
      techPartners: Set<string>;
      totalIssues: number;
      engagement: number;
      contributions: Array<{
        title: string;
        url: string;
        week: string;
      }>;
    }>();

    data.forEach(partner => {
      partner.timeSeriesData.forEach(weekData => {
        weekData.contributors.forEach(name => {
          if (!contributorMap.has(name)) {
            const details = partner.contributorDetails.find(d => d.name === name);
            contributorMap.set(name, {
              name,
              githubUsername: details?.githubUsername || name.toLowerCase().replace(/\s+/g, '-'),
              techPartners: new Set(),
              totalIssues: 0,
              engagement: 0,
              contributions: []
            });
          }
          const contributor = contributorMap.get(name)!;
          contributor.techPartners.add(partner.partner);
          
          const uniqueIssuesThisWeek = new Set(weekData.issues
            .filter(issue => issue.contributor === name)
            .map(issue => issue.url)
          ).size;
          contributor.totalIssues += uniqueIssuesThisWeek;
          
          contributor.engagement = Math.max(contributor.engagement, weekData.engagementLevel);
          
          weekData.issues.forEach(issue => {
            if (issue.contributor === name && 
                !contributor.contributions.some(c => c.url === issue.url)) {
              contributor.contributions.push({
                title: issue.title,
                url: issue.url,
                week: weekData.week
              });
            }
          });
        });
      });
    });

    return Array.from(contributorMap.values())
      .sort((a, b) => b.totalIssues - a.totalIssues);
  }, [data]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>GitHub</TableHead>
            <TableHead>Tech Partners</TableHead>
            <TableHead className="text-right">Issues</TableHead>
            <TableHead className="text-right">Engagement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contributors.map(contributor => (
            <TableRow key={contributor.name}>
              <TableCell className="font-medium">{contributor.name}</TableCell>
              <TableCell>
                {contributor.githubUsername && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://github.com/${contributor.githubUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          {contributor.githubUsername}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[400px] p-4">
                        <div className="space-y-3">
                          <p className="font-medium text-sm">Recent Contributions:</p>
                          <ul className="space-y-2">
                            {contributor.contributions.slice(0, 5).map((contribution, idx) => (
                              <li key={idx} className="space-y-1">
                                <a
                                  href={contribution.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs hover:text-blue-600"
                                >
                                  <GitPullRequest className="h-3 w-3" />
                                  <span className="font-medium">{contribution.title}</span>
                                </a>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{contribution.week}</span>
                                </div>
                              </li>
                            ))}
                            {contributor.contributions.length > 5 && (
                              <li className="text-xs text-gray-500 pt-1">
                                +{contributor.contributions.length - 5} more contributions
                              </li>
                            )}
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {Array.from(contributor.techPartners).map(partner => (
                    <span
                      key={partner}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {partner}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{contributor.totalIssues}</TableCell>
              <TableCell className="text-right">{contributor.engagement.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
