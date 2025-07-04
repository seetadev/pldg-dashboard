'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  SelectRoot as Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroupContent as ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import * as React from 'react';
import { EnhancedTechPartnerData, ActionableInsight } from '@/types/dashboard';
import { TimeSeriesView } from './views/TimeSeriesView';
import { ContributorView } from './views/ContributorView';
import { GitPullRequest } from 'lucide-react';
import {
  TooltipRoot as Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

// Define a type for valid tech partner names
type TechPartnerName =
  | 'Fil-B'
  | 'Drand'
  | 'Libp2p'
  | 'Storacha'
  | 'Fil-Oz'
  | 'IPFS'
  | 'Coordination Network';

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

const PARTNER_COLORS: Record<string, { bg: string; text: string; hover: string }> = {
  'Libp2p': { bg: 'bg-blue-50', text: 'text-blue-700', hover: 'hover:bg-blue-100' },
  'IPFS': { bg: 'bg-teal-50', text: 'text-teal-700', hover: 'hover:bg-teal-100' },
  'Fil-B': { bg: 'bg-purple-50', text: 'text-purple-700', hover: 'hover:bg-purple-100' },
  'Fil-Oz': { bg: 'bg-indigo-50', text: 'text-indigo-700', hover: 'hover:bg-indigo-100' },
  'Coordination Network': { bg: 'bg-rose-50', text: 'text-rose-700', hover: 'hover:bg-rose-100' },
  'Storacha': { bg: 'bg-amber-50', text: 'text-amber-700', hover: 'hover:bg-amber-100' },
  'Drand': { bg: 'bg-emerald-50', text: 'text-emerald-700', hover: 'hover:bg-emerald-100' }
};

export const TechPartnerChart: React.FC<TechPartnerChartProps> = ({ data }) => {
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
        title: 'Error',
        description: `Unable to open repository for ${partner}. Please try again later.`,
        variant: 'destructive',
      });
    }
  };

  const getHighlightedIssues = (partnerData: EnhancedTechPartnerData): ActionableInsight[] => {
    const insights: ActionableInsight[] = [];

    if (!partnerData?.timeSeriesData?.length) {
      return insights;
    }

    const latestWeekData = [...partnerData.timeSeriesData].sort(
      (a, b) =>
        new Date(b.weekEndDate).getTime() - new Date(a.weekEndDate).getTime()
    )[0];

    if (latestWeekData?.issues?.length > 0) {
      const mostActive = latestWeekData.issues.find(
        (issue) => issue?.status === 'open'
      );
      if (mostActive) {
        insights.push({
          type: 'warning',
          title: mostActive.title,
          description: `Active issue in ${partnerData.partner}`,
          link: mostActive.url,
        });
      }
    }

    return insights;
  };

  const filteredData = React.useMemo(() => {
    return selectedPartner === 'all'
      ? data
      : data.filter((item) => item.partner === selectedPartner);
  }, [data, selectedPartner]);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <CardTitle>Tech Partner Overview</CardTitle>
            <CardDescription>Track engagement and contributions across tech partners</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedPartner !== 'all' && isTechPartner(selectedPartner) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRepoClick(selectedPartner as TechPartnerName)}
                className="flex items-center gap-2"
              >
                <GitPullRequest className="h-4 w-4" />
                View Repository
              </Button>
            )}
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger>
                <SelectValue placeholder="All Partners" />
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
      </CardHeader>
      <CardContent>
        <ToggleGroup type="single" value={view} onValueChange={(v: ViewType) => setView(v)}>
          <ToggleGroupItem value="timeline" aria-label="Show timeline view">
            Timeline
          </ToggleGroupItem>
          <ToggleGroupItem value="contributors" aria-label="Show contributors view">
            Contributors
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-6">
          {view === 'timeline' ? (
            <TimeSeriesView data={filteredData} />
          ) : (
            <ContributorView data={filteredData} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
