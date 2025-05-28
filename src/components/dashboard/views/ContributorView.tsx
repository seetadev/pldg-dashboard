'use client';

import { EnhancedTechPartnerData } from '@/types/dashboard';
import { useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Contribution {
  title: string;
  url: string;
  week: string;
}

interface ContributorDetails {
  name: string;
  githubUsername: string;
  techPartners: Set<string>;
  totalIssues: number;
  engagement: number;
  contributions: Contribution[];
}

interface ContributorViewProps {
  data: EnhancedTechPartnerData[];
}

export function ContributorView({ data }: ContributorViewProps) {
  const [
    selectedContributorContributions,
    setSelectedContributorContributions,
  ] = useState<Contribution[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');

  const contributors = useMemo(() => {
    if (!data?.length) return [];
    const contributorMap = new Map<string, ContributorDetails>();

    data.forEach((partner) => {
      partner.timeSeriesData.forEach((weekData) => {
        weekData.contributors.forEach((name) => {
          if (!contributorMap.has(name)) {
            const details = partner.contributorDetails.find(
              (d) => d.name === name
            );
            contributorMap.set(name, {
              name,
              githubUsername:
                details?.githubUsername ||
                name.toLowerCase().replace(/\s+/g, '-'),
              techPartners: new Set(),
              totalIssues: 0,
              engagement: 0,
              contributions: [],
            });
          }
          const contributor = contributorMap.get(name)!;
          contributor.techPartners.add(partner.partner);

          const uniqueIssuesThisWeek = new Set(
            weekData.issues
              .filter((issue) => issue.contributor === name)
              .map((issue) => issue.url)
          ).size;
          contributor.totalIssues += uniqueIssuesThisWeek;

          contributor.engagement = Math.max(
            contributor.engagement,
            weekData.engagementLevel
          );

          weekData.issues.forEach((issue) => {
            if (
              issue.contributor === name &&
              !contributor.contributions.some((c) => c.url === issue.url)
            ) {
              contributor.contributions.push({
                title: issue.title,
                url: issue.url,
                week: weekData.week,
              });
            }
          });
        });
      });
    });

    return Array.from(contributorMap.values()).sort(
      (a, b) => b.totalIssues - a.totalIssues
    );
  }, [data]);

  const handleViewMore = (contributor: ContributorDetails) => {
    setSelectedContributorContributions(contributor.contributions);
    setDialogTitle(`${contributor.name}'s Contributions`);
    setIsDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>GitHub</TableHead>
            <TableHead>Tech Partners</TableHead>
            <TableHead>Issues</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead className="text-right">Recent Contributions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contributors.map((contributor) => (
            <TableRow key={contributor.name}>
              <TableCell>{contributor.name}</TableCell>
              <TableCell>
                {contributor.githubUsername && (
                  <a
                    href={`https://github.com/${contributor.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800"
                  >
                    {contributor.githubUsername}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </TableCell>
              <TableCell>
                {Array.from(contributor.techPartners).map((partner) => (
                  <div key={partner}>{partner}</div>
                ))}
              </TableCell>
              <TableCell>{contributor.totalIssues}</TableCell>
              <TableCell>{contributor.engagement.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                {contributor.contributions
                  .slice(0, 3)
                  .map((contribution, idx) => (
                    <Tooltip key={idx}>
                      <TooltipTrigger className="underline cursor-pointer text-blue-500">
                        {contribution.title.length > 20
                          ? `${contribution.title.slice(0, 20)}...`
                          : contribution.title}
                      </TooltipTrigger>
                      <TooltipContent className="bg-white border border-black">
                        <p className="text-black">{contribution.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Week: {contribution.week}
                        </p>
                        <a
                          href={contribution.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1"
                        >
                          View on GitHub <ExternalLink className="h-3 w-3" />
                        </a>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                {contributor.contributions.length > 3 && (
                  <Button
                    size="sm"
                    className="ml-2"
                    onClick={() => handleViewMore(contributor)}
                  >
                    +{contributor.contributions.length - 3} more
                  </Button>
                )}
                {contributor.contributions.length === 0 && (
                  <span className="text-muted-foreground">
                    No recent contributions
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              All contributions from this contributor.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            {selectedContributorContributions.length > 0 ? (
              <ul className="space-y-2">
                {selectedContributorContributions.map((contribution, index) => (
                  <li key={index} className="border rounded-md p-2">
                    <p className="font-semibold">{contribution.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Week: {contribution.week}
                    </p>
                    <a
                      href={contribution.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      View on GitHub <ExternalLink className="h-4 w-4" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No contributions found.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
