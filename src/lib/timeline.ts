import { format } from 'date-fns';
import { EngagementData, GitHubData, TimelineEvent } from '@/types/dashboard';
import { nanoid } from '@/lib/utils';
import { PROJECT_BOARD } from '@/lib/constants';

export const COHORT_DATES = {
  COHORT_0_START: '2023-10-01',
  COHORT_1_START: '2024-01-01',
  COHORT_2_START: '2024-04-01'
} as const;

class InvalidDateError extends Error {
  constructor(dateStr: string) {
    super(`Invalid date format: ${dateStr}`);
    this.name = 'InvalidDateError';
  }
}

function ensureValidDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (!dateStr || !date.toISOString()) {
      throw new InvalidDateError(dateStr);
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    throw new InvalidDateError(dateStr);
  }
}

function determineCohort(dateStr: string): string {
  const date = new Date(dateStr);
  
  const cohort1Start = new Date(COHORT_DATES.COHORT_1_START);
  const cohort2Start = new Date(COHORT_DATES.COHORT_2_START);
  
  if (date >= cohort2Start) {
    return 'Cohort 2';
  } else if (date >= cohort1Start) {
    return 'Cohort 1';
  } else {
    return 'Cohort 0';
  }
}

const seenEvents = new Set<string>();

function createEventKey(event: Partial<TimelineEvent>): string {
  return `${event.type}-${event.title}-${event.date}-${event.contributor || ''}`;
}

function addEventIfNotDuplicate(events: TimelineEvent[], event: TimelineEvent): void {
  const eventKey = createEventKey(event);
  if (!seenEvents.has(eventKey)) {
    seenEvents.add(eventKey);
    events.push(event);
  }
}

export function mergeDataForTimeline(
  githubData?: GitHubData | null,
  airtableData?: EngagementData[] | null
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  seenEvents.clear();
  
  if (githubData?.issues?.length) {
    for (const issue of githubData.issues) {
      if (!issue.title) continue;

      const isPR = issue.state === 'MERGED';
      let status: TimelineEvent['status'] = issue.state.toLowerCase() as 'open' | 'closed' | 'merged';
      
      if (isPR && status === 'closed') {
        status = 'merged';
      }

      try {
        const event: TimelineEvent = {
          id: nanoid(),
          type: isPR ? 'pr' : 'issue',
          title: issue.title,
          url: PROJECT_BOARD.url,
          date: ensureValidDate(issue.created_at),
          contributor: issue.assignee?.login || 'unassigned',
          contributorUsername: issue.assignee?.login || 'unassigned',
          techPartner: PROJECT_BOARD.owner,
          cohort: determineCohort(issue.created_at),
          week: determineWeekFromDate(issue.created_at),
          status
        };
        addEventIfNotDuplicate(events, event);
      } catch (error) {
        console.error('Error processing GitHub issue:', error);
        continue;
      }
    }
  }
  
  if (airtableData?.length) {
    for (const entry of airtableData) {
      try {
        const weekDate = determineWeekDate(entry['Program Week']);
        const cohort = determineCohort(weekDate);
        const techPartner = Array.isArray(entry['Which Tech Partner']) 
          ? entry['Which Tech Partner'][0] 
          : entry['Which Tech Partner'] || 'unknown';
        
        if (entry['How many issues, PRs, or projects this week?'] !== '0') {
          const surveyEvent: TimelineEvent = {
            id: nanoid(),
            type: 'survey',
            title: `Week ${entry['Program Week']} Survey Response`,
            date: ensureValidDate(weekDate),
            contributor: entry.Name || 'anonymous',
            contributorUsername: entry.Name || 'anonymous',
            techPartner,
            cohort,
            week: entry['Program Week'],
            description: `Reported ${entry['How many issues, PRs, or projects this week?']} contributions`,
            status: 'closed'
          };
          addEventIfNotDuplicate(events, surveyEvent);
        }
        
        for (const issueNum of Array.from({ length: 3 }, (_, i) => i + 1)) {
          const title = entry[`Issue Title ${issueNum}` as keyof EngagementData];
          const link = entry[`Issue Link ${issueNum}` as keyof EngagementData];
          
          if (title && link) {
            const titleStr = Array.isArray(title) ? title[0] : title;
            const linkStr = Array.isArray(link) ? link[0] : link;
            
            if (titleStr && linkStr) {
              const isPR = linkStr.includes('/pull/');
              const event: TimelineEvent = {
                id: nanoid(),
                type: isPR ? 'pr' : 'issue',
                title: titleStr,
                url: linkStr,
                date: ensureValidDate(weekDate),
                contributor: entry.Name || 'anonymous',
                contributorUsername: entry['Github Username'] as string || 'anonymous',
                techPartner,
                cohort,
                week: entry['Program Week'],
                status: 'closed'
              };
              addEventIfNotDuplicate(events, event);
            }
          }
        }
      } catch (error) {
        console.error('Error processing Airtable entry:', error);
        continue;
      }
    }
  }
  
  return events
    .filter(event => event.title && event.date) 
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB.getTime() - dateA.getTime();
    });
}

function determineWeekFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  const startDate = new Date(COHORT_DATES.COHORT_0_START);
  const diffTime = Math.abs(date.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil(diffDays / 7);
  return `Week ${weekNumber}`;
}

function determineWeekDate(weekStr: string): string {
  const weekNumber = parseInt(weekStr.replace('Week ', ''), 10) || 1;
  const startDate = new Date(COHORT_DATES.COHORT_0_START);
  startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  return format(startDate, 'yyyy-MM-dd');
}