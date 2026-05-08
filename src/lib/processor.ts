import { 
  EngagementData, 
  ProcessedData, 
  GitHubData,
  EngagementTrend,
  TechnicalProgress
} from '@/types/dashboard';
import _ from 'lodash';
import { 
  parseWeekNumber, 
  formatWeekString, 
  parseTechPartners,
  getStringValue,
  normalizeContributorName
} from './core/parsers';
import { 
  calculateNPS, 
  calculateEngagementRate, 
  calculateWeeklyChange,
  calculateIssueMetrics
} from './metrics/engine';
import { validateEngagementData } from './validation';

/**
 * Main processor that transforms raw Airtable and GitHub data into structured dashboard metrics.
 */
export function processDashboardData(
  rawAirtableData: EngagementData[],
  githubData?: GitHubData | null
): ProcessedData {
  // Validate and normalize data using Zod
  const validatedData = validateEngagementData(rawAirtableData);

  // Sort data chronologically by week
  const sortedData = _.sortBy(validatedData, [
    (entry) => parseWeekNumber(entry['Program Week'])
  ]);

  const activeContributors = new Set(sortedData.map(e => e.Name)).size;
  const totalContributions = sortedData.reduce((sum, entry) => {
    const value = entry['How many issues, PRs, or projects this week?'];
    return sum + (value === '4+' ? 4 : parseInt(value || '0'));
  }, 0);

  const techPartners = new Set(
    sortedData.flatMap(row => parseTechPartners(row['Which Tech Partner']))
  );

  const issueMetrics = calculateIssueMetrics(sortedData);
  const weeklyChange = calculateWeeklyChange(sortedData);

  const baseData: ProcessedData = {
    weeklyChange,
    activeContributors,
    totalContributions,
    programHealth: {
      npsScore: calculateNPS(sortedData),
      engagementRate: calculateEngagementRate(sortedData),
      activeTechPartners: techPartners.size
    },
    keyHighlights: {
      activeContributorsAcrossTechPartners: `${activeContributors} across ${techPartners.size}`,
      totalContributions: `${totalContributions} total`,
      positiveFeedback: `${calculatePositiveFeedback(sortedData)} positive`,
      weeklyContributions: `${weeklyChange}% change`
    },
    topPerformers: calculateTopPerformers(sortedData),
    techPartnerMetrics: calculateTechPartnerMetrics(sortedData),
    techPartnerPerformance: processTechPartnerPerformance(sortedData),
    engagementTrends: calculateEngagementTrends(sortedData),
    technicalProgress: calculateTechnicalProgressOverTime(sortedData, githubData),
    issueMetrics,
    feedbackSentiment: calculateFeedbackSentiment(sortedData),
    actionItems: [], // Populated by AI or specific rules
    contributorGrowth: [], // Can be derived from weekly snapshots
    rawEngagementData: sortedData
  };

  return baseData;
}

// Internal helpers to keep the main function clean

function calculatePositiveFeedback(data: EngagementData[]): number {
  return data.filter(entry => {
    const feedback = getStringValue(entry['PLDG Feedback']).toLowerCase();
    return feedback.includes('great') || feedback.includes('good') || feedback.includes('excellent');
  }).length;
}

function calculateFeedbackSentiment(data: EngagementData[]) {
  const positive = calculatePositiveFeedback(data);
  const negative = data.filter(entry => {
    const feedback = getStringValue(entry['PLDG Feedback']).toLowerCase();
    return feedback.includes('bad') || feedback.includes('poor') || feedback.includes('difficult');
  }).length;
  
  return {
    positive,
    neutral: Math.max(0, data.length - positive - negative),
    negative
  };
}

function calculateTopPerformers(data: EngagementData[]) {
  return _(data)
    .groupBy('Name')
    .map((entries, name) => ({
      name,
      totalIssues: _.sumBy(entries, e => {
        const value = e['How many issues, PRs, or projects this week?'];
        return value === '4+' ? 4 : parseInt(value || '0');
      }),
      avgEngagement: _.meanBy(entries, e => {
        const p = e['Engagement Participation ']?.trim() || '';
        return p.startsWith('3') ? 3 : p.startsWith('2') ? 2 : p.startsWith('1') ? 1 : 0;
      })
    }))
    .orderBy(['totalIssues', 'avgEngagement'], ['desc', 'desc'])
    .value();
}

function calculateTechPartnerMetrics(data: EngagementData[]) {
  return _(data)
    .flatMap(entry => {
      const partners = parseTechPartners(entry['Which Tech Partner']);
      return partners.map(partner => ({ ...entry, partner }));
    })
    .groupBy('partner')
    .map((items, partner) => ({
      partner,
      totalIssues: _.sumBy(items, item => {
        const value = item['How many issues, PRs, or projects this week?'];
        return value === '4+' ? 4 : parseInt(value || '0');
      }),
      activeContributors: new Set(items.map(item => item.Name)).size,
      avgIssuesPerContributor: 0,
      collaborationScore: 0
    }))
    .value();
}

function processTechPartnerPerformance(data: EngagementData[]) {
  const partnerGroups = _(data)
    .flatMap(entry => {
      const partners = parseTechPartners(entry['Which Tech Partner']);
      return partners.map(partner => ({ ...entry, partner }));
    })
    .groupBy('partner')
    .value();

  return Object.entries(partnerGroups).map(([partner, entries]) => {
    const weeklyData = _.groupBy(entries, 'Program Week');
    const sortedWeeks = Object.entries(weeklyData).sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]));
    
    const timeSeriesData = sortedWeeks.map(([week, weekEntries]) => ({
      week: formatWeekString(week),
      weekEndDate: new Date().toISOString(),
      issueCount: _.sumBy(weekEntries, e => {
        const v = e['How many issues, PRs, or projects this week?'];
        return v === '4+' ? 4 : parseInt(v || '0');
      }),
      contributors: Array.from(new Set(weekEntries.map(e => e.Name))),
      engagementLevel: _.meanBy(weekEntries, e => {
        const p = e['Engagement Participation ']?.trim() || '';
        return p.startsWith('3') ? 3 : p.startsWith('2') ? 2 : 0;
      }),
      issues: weekEntries.filter(e => e['Issue Title 1']).map(e => ({
        title: getStringValue(e['Issue Title 1']),
        url: getStringValue(e['Issue Link 1']),
        status: 'open' as const,
        lastUpdated: new Date().toISOString(),
        contributor: e.Name
      }))
    }));

    const allIssues = timeSeriesData.flatMap(w => w.issues);
    const mostRecentIssue = _.maxBy(allIssues, i => new Date(i.lastUpdated).getTime());
    const staleIssues = allIssues.filter(i => 
      new Date(i.lastUpdated) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    return {
      partner,
      issues: _.sumBy(entries, e => {
        const v = e['How many issues, PRs, or projects this week?'];
        return v === '4+' ? 4 : parseInt(v || '0');
      }),
      timeSeriesData,
      contributorDetails: _(entries)
        .groupBy('Name')
        .map((userEntries, name) => ({
          name,
          githubUsername: normalizeContributorName(name),
          issuesCompleted: _.sumBy(userEntries, e => {
            const v = e['How many issues, PRs, or projects this week?'];
            return v === '4+' ? 4 : parseInt(v || '0');
          }),
          engagementScore: _.meanBy(userEntries, e => {
            const p = e['Engagement Participation ']?.trim() || '';
            return p.startsWith('3') ? 3 : p.startsWith('2') ? 2 : 0;
          })
        }))
        .value(),
      issueTracking: timeSeriesData.flatMap(week => week.issues.map(issue => ({
        title: issue.title,
        link: issue.url,
        status: issue.status,
        engagement: 0,
        week: week.week,
        contributor: issue.contributor
      }))),
      mostActiveIssue: mostRecentIssue ? { title: mostRecentIssue.title, url: mostRecentIssue.url } : { title: '', url: '' },
      staleIssue: staleIssues[0] ? { title: staleIssues[0].title, url: staleIssues[0].url } : { title: '', url: '' }
    };
  });
}

function calculateEngagementTrends(data: EngagementData[]): EngagementTrend[] {
  const weeklyGroups = _.groupBy(data, 'Program Week');
  const sortedWeeks = Object.keys(weeklyGroups).sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  return sortedWeeks.map(week => {
    const entries = weeklyGroups[week];
    return {
      week: formatWeekString(week),
      total: new Set(entries.map(e => e.Name)).size,
      'High Engagement': entries.filter(e => e['Engagement Participation ']?.includes('3 -')).length,
      'Medium Engagement': entries.filter(e => e['Engagement Participation ']?.includes('2 -')).length,
      'Low Engagement': entries.filter(e => e['Engagement Participation ']?.includes('1 -')).length
    };
  });
}

function calculateTechnicalProgressOverTime(data: EngagementData[], githubData?: GitHubData | null): TechnicalProgress[] {
  const weeklyGroups = _.groupBy(data, 'Program Week');
  const sortedWeeks = Object.keys(weeklyGroups).sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  return sortedWeeks.map(week => {
    const entries = weeklyGroups[week];
    return {
      week: formatWeekString(week),
      'Total Issues': entries.reduce((sum, entry) => {
        const v = entry['How many issues, PRs, or projects this week?'];
        return sum + (v === '4+' ? 4 : parseInt(v || '0'));
      }, 0),
      'In Progress': githubData?.statusGroups?.inProgress || 0,
      'Done': githubData?.statusGroups?.done || 0
    };
  });
}
