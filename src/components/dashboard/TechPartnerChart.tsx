'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EnhancedTechPartnerData, ActionableInsight } from '@/types/dashboard';
import { TimeSeriesView } from './views/TimeSeriesView';
import { ContributorView } from './views/ContributorView';
import { AlertCircle, CheckCircle, GitPullRequest } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

// Define a type for valid tech partner names
type TechPartnerName = 'Fil-B' | 'Drand' | 'Libp2p' | 'Storacha' | 'Fil-Oz' | 'IPFS' | 'Coordination Network';

// Define the tech partner repos with the correct type
const TECH_PARTNER_REPOS: Record<TechPartnerName, string> = {
  'Fil-B': 'https://github.com/FIL-Builders/fil-frame',
  'Drand': 'https://github.com/drand/drand/issues?q=is:open+is:issue+label:devguild',
  'Libp2p': 'https://github.com/libp2p',
  'Storacha': 'https://github.com/storacha',
  'Fil-Oz': 'https://github.com/filecoin-project/filecoin-ffi',
  'IPFS': 'https://github.com/ipfs',
  'Coordination Network': 'https://github.com/coordnet/coordnet'
};

// Add a type guard to check if a string is a valid tech partner name
function isTechPartner(partner: string): partner is TechPartnerName {
  return partner in TECH_PARTNER_REPOS;
}

// Helper function to ensure URLs are absolute and valid
const ensureAbsoluteUrl = (url: string | undefined): string => {
  if (!url) return '#';
  try {
    // If it's already a valid URL, return it
    new URL(url);
    return url;
  } catch {
    // If it's a relative URL, make it absolute
    if (url.startsWith('/')) {
      return `https://github.com${url}`;
    }
    // If it's invalid, return a safe default
    return '#';
  }
};

interface TechPartnerChartProps {
  data: EnhancedTechPartnerData[];
}

// Add type for toggle values
type ViewType = 'timeline' | 'contributors';

const PARTNER_COLORS: Record<string, { bg: string, text: string, hover: string }> = {
  'Libp2p': { bg: 'bg-blue-50', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  'IPFS': { bg: 'bg-teal-50', text: 'text-teal-700', hover: 'hover:bg-teal-100' },
  'Fil-B': { bg: 'bg-purple-50', text: 'text-purple-700', hover: 'hover:bg-purple-100' },
  'Fil-Oz': { bg: 'bg-indigo-50', text: 'text-indigo-700', hover: 'hover:bg-indigo-100' },
  'Coordination Network': { bg: 'bg-rose-50', text: 'text-rose-700', hover: 'hover:bg-rose-100' },
  'Storacha': { bg: 'bg-amber-50', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
  'Drand': { bg: 'bg-emerald-50', text: 'text-emerald-700', hover: 'hover:bg-emerald-100' }
};

export function TechPartnerChart({ data }: TechPartnerChartProps) {
  const [selectedPartner, setSelectedPartner] = useState<string>('all');
  const [view, setView] = useState<ViewType>('timeline');

  // Add debug logging
  React.useEffect(() => {
    console.log('TechPartnerChart processing data:', {
      totalPartners: data.length,
      partners: data.map(p => ({
        name: p.partner,
        totalIssues: p.issues,
        weekCount: p.timeSeriesData.length,
        sampleWeek: p.timeSeriesData[0]
      }))
    });
  }, [data]);

  const handleRepoClick = (partner: TechPartnerName) => {
    try {
      if (!TECH_PARTNER_REPOS[partner]) {
        throw new Error(`No repository URL found for ${partner}`);
      }
      const url = new URL(TECH_PARTNER_REPOS[partner]);
      window.open(url.href, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(`Error opening repository for ${partner}:`, error);
      toast({
        title: "Error",
        description: `Unable to open repository for ${partner}. Please try again later.`,
        variant: "destructive",
      });
    }
  };

  const getHighlightedIssues = (partnerData: EnhancedTechPartnerData): ActionableInsight[] => {
    const insights: ActionableInsight[] = [];

    if (!partnerData?.timeSeriesData?.length) {
      return insights;
    }

    const latestWeekData = [...partnerData.timeSeriesData]
      .sort((a, b) => new Date(b.weekEndDate).getTime() - new Date(a.weekEndDate).getTime())[0];

    if (latestWeekData?.issues?.length > 0) {
      const mostActive = latestWeekData.issues.find(issue => issue?.status === 'open');
      if (mostActive) {
        insights.push({
          type: 'success',
          title: 'Active Issue',
          description: mostActive.title || 'Latest issue',
          link: ensureAbsoluteUrl(mostActive.url)
        });
      }
    }

    const staleIssues = partnerData.timeSeriesData
      .flatMap(week => week.issues || [])
      .filter(issue =>
        issue?.status === 'open' &&
        issue?.lastUpdated &&
        new Date(issue.lastUpdated) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

    if (staleIssues.length > 0) {
      insights.push({
        type: 'warning',
        title: 'Needs Review',
        description: `${staleIssues.length} stale issue${staleIssues.length > 1 ? 's' : ''}`,
        link: ensureAbsoluteUrl(staleIssues[0]?.url)
      });
    }

    return insights;
  };

  const filteredData = React.useMemo(() => {
    // Add debug logging
    console.log('TechPartnerChart Data:', {
      allData: data,
      selectedPartner,
      dataLength: data.length
    });

    return selectedPartner === 'all' 
      ? data 
      : data.filter(item => item.partner === selectedPartner);
  }, [data, selectedPartner]);

  return (
    <Card>
      <CardHeader className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle>Partner Activity Overview</CardTitle>
            <CardDescription>Comprehensive tech partner engagement metrics</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedPartner && selectedPartner !== 'all' && isTechPartner(selectedPartner) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRepoClick(selectedPartner)}
                className="flex items-center gap-2"
              >
                <GitPullRequest className="h-4 w-4" />
                View Issues
              </Button>
            )}
            <Select
              value={selectedPartner}
              onValueChange={setSelectedPartner}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partners</SelectItem>
                {Array.from(new Set(data.map(item => item.partner))).map(partner => (
                  <SelectItem key={partner} value={partner}>
                    {partner}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(value: string) => value && setView(value as ViewType)}
          className="justify-start mb-6"
        >
          <ToggleGroupItem value="timeline" aria-label="Show timeline view">
            Timeline
          </ToggleGroupItem>
          <ToggleGroupItem value="contributors" aria-label="Show contributors view">
            Contributors
          </ToggleGroupItem>
        </ToggleGroup>
        
        <div className="flex flex-wrap gap-4 mt-6">
          {filteredData.map(partner => {
            const colors = PARTNER_COLORS[partner.partner] || { 
              bg: 'bg-gray-50', 
              text: 'text-gray-700', 
              hover: 'hover:bg-gray-100' 
            };
            
            return (
              <div
                key={partner.partner}
                className={`flex items-center p-3 rounded-lg border ${colors.bg} ${colors.hover} transition-shadow`}
              >
                <div className="flex flex-col space-y-2">
                  <h3 className={`text-sm font-medium ${colors.text}`}>
                    {partner.partner}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    {getHighlightedIssues(partner).map((insight, index) => (
                      <TooltipProvider key={`${partner.partner}-${insight.title}-${index}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={insight.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                                insight.type === 'warning'
                                  ? 'bg-yellow-100/80 text-yellow-800 hover:bg-yellow-100'
                                  : 'bg-green-100/80 text-green-800 hover:bg-green-100'
                              }`}
                            >
                              {insight.type === 'warning' ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              {insight.title}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{insight.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mt-8">
          {view === 'timeline' ? (
            <TimeSeriesView data={filteredData} />
          ) : (
            <ContributorView data={filteredData} />
          )}
        </div>
      </CardContent>
    </Card>
  );
} 