import { EngagementData, IssueMetrics } from '@/types/dashboard';
import { getStringValue, parseWeekNumber } from '../core/parsers';
import _ from 'lodash';

/**
 * Calculates Net Promoter Score (NPS).
 * Formula: ((Promoters - Detractors) / Total Responses) * 100
 */
export function calculateNPS(data: EngagementData[]): number {
  const scores = data
    .map(entry => {
      const score = entry['How likely are you to recommend the PLDG to others?'];
      return parseInt(getStringValue(score) || '0');
    })
    .filter(score => score > 0);

  if (scores.length === 0) return 0;

  const promoters = scores.filter(score => score >= 9).length;
  const detractors = scores.filter(score => score <= 6).length;
  
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

/**
 * Calculates the engagement rate based on participation levels.
 * Considers "3 -" and "2 -" as active participation.
 */
export function calculateEngagementRate(data: EngagementData[]): number {
  const totalEntries = data.length;
  if (totalEntries === 0) return 0;

  const activeEntries = data.filter(entry => {
    const participation = entry['Engagement Participation '];
    return participation?.includes('3 -') || participation?.includes('2 -');
  }).length;

  return Math.round((activeEntries / totalEntries) * 100);
}

/**
 * Calculates the percentage change in contributions between the latest and previous week.
 */
export function calculateWeeklyChange(data: EngagementData[]): number {
  const weeks = _.groupBy(data, 'Program Week');
  const sortedWeeks = Object.keys(weeks).sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  if (sortedWeeks.length < 2) return 0;

  const currentWeek = weeks[sortedWeeks[sortedWeeks.length - 1]];
  const previousWeek = weeks[sortedWeeks[sortedWeeks.length - 2]];

  const calculateTotal = (entries: EngagementData[]) => 
    entries.reduce((sum, entry) => {
      const value = entry['How many issues, PRs, or projects this week?'];
      const parsedValue = value === '4+' ? 4 : parseInt(value || '0');
      return sum + (isNaN(parsedValue) ? 0 : parsedValue);
    }, 0);

  const currentTotal = calculateTotal(currentWeek);
  const previousTotal = calculateTotal(previousWeek);

  if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
  
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
}

/**
 * Processes raw engagement data into weekly issue metrics.
 */
export function calculateIssueMetrics(data: EngagementData[]): IssueMetrics[] {
  const weeklyGroups = _.groupBy(data, 'Program Week');
  const sortedWeeks = Object.keys(weeklyGroups).sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  return sortedWeeks.map(week => {
    const entries = weeklyGroups[week];
    const totalIssues = entries.reduce((sum, entry) => {
      const value = entry['How many issues, PRs, or projects this week?'];
      return sum + (value === '4+' ? 4 : parseInt(value || '0'));
    }, 0);

    // Heuristic for closed issues if not explicitly tracked
    const closedIssues = entries.filter(entry => 
      getStringValue(entry['Issue Link 1']).includes('closed') ||
      getStringValue(entry['GitHub Issue URL']).includes('closed')
    ).length || Math.round(totalIssues * 0.7);

    return {
      week: week.replace(/\(.*?\)/, '').trim(),
      open: Math.max(0, totalIssues - closedIssues),
      closed: closedIssues,
      total: totalIssues
    };
  });
}

/**
 * Calculates the technical progress percentage.
 */
export function calculateTechnicalProgress(metrics: IssueMetrics[]): number {
  if (metrics.length === 0) return 0;
  const latest = metrics[metrics.length - 1];
  return latest.total > 0 ? Math.round((latest.closed / latest.total) * 100) : 0;
}
