import { format } from 'date-fns';
import { EngagementData, GitHubData, TimelineEvent } from '@/types/dashboard';
import { nanoid } from '@/lib/utils';

function ensureValidDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error parsing date:', error);
    return new Date().toISOString().split('T')[0];
  }
}

function determineCohort(dateStr: string): string {
  const date = new Date(dateStr);
  
  const cohort1Start = new Date('2024-01-01');
  const cohort2Start = new Date('2024-04-01');
  
  if (date >= cohort2Start) {
    return 'Cohort 2';
  } else if (date >= cohort1Start) {
    return 'Cohort 1';
  } else {
    return 'Cohort 0';
  }
}

export function mergeDataForTimeline(
  githubData?: GitHubData | null,
  airtableData?: EngagementData[] | null
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  if (githubData?.issues?.length) {
    for (const issue of githubData.issues) {
      if (!issue.title) continue;

      const isPR = !!issue.pull_request;
      let status = issue.state as 'open' | 'closed' | 'merged';
      
      if (isPR && issue.state === 'closed' && issue.pull_request?.merged) {
        status = 'merged';
      }

      events.push({
        id: nanoid(),
        type: isPR ? 'pr' : 'issue',
        title: issue.title,
        url: issue.html_url,
        date: ensureValidDate(issue.created_at),
        contributor: issue.assignee?.login,
        contributorUsername: issue.assignee?.login,
        cohort: determineCohort(issue.created_at),
        week: determineWeekFromDate(issue.created_at),
        status
      });
    }
  }
  
  if (airtableData?.length) {
    for (const entry of airtableData) {
      const weekDate = determineWeekDate(entry['Program Week']);
      const cohort = determineCohort(weekDate);
      
      if (entry['How many issues, PRs, or projects this week?'] !== '0') {
        events.push({
          id: nanoid(),
          type: 'survey',
          title: `Week ${entry['Program Week']} Survey Response`,
          date: ensureValidDate(weekDate),
          contributor: entry.Name || undefined,
          cohort,
          week: entry['Program Week'],
          description: `Reported ${entry['How many issues, PRs, or projects this week?']} contributions`
        });
      }
      
      for (let i = 1; i <= 3; i++) {
        const title = entry[`Issue Title ${i}` as keyof EngagementData];
        const link = entry[`Issue Link ${i}` as keyof EngagementData];
        
        if (title && link) {
          const titleStr = Array.isArray(title) ? title[0] : title;
          const linkStr = Array.isArray(link) ? link[0] : link;
          
          if (titleStr && linkStr) {
            events.push({
              id: nanoid(),
              type: linkStr.includes('/pull/') ? 'pr' : 'issue',
              title: titleStr,
              url: linkStr,
              date: ensureValidDate(weekDate),
              contributor: entry.Name || undefined,
              contributorUsername: entry['Github Username'] as string,
              cohort,
              week: entry['Program Week']
            });
          }
        }
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
  const startDate = new Date('2023-01-01');
  const diffTime = Math.abs(date.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.ceil(diffDays / 7);
  return `Week ${weekNumber}`;
}

function determineWeekDate(weekStr: string): string {
  const weekNumber = parseInt(weekStr.replace('Week ', ''), 10) || 1;
  const startDate = new Date('2023-01-01');
  startDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  return format(startDate, 'yyyy-MM-dd');
} 