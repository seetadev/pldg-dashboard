import _ from 'lodash';
import {
  EngagementData, ProcessedData, TechPartnerMetrics,
  TechPartnerPerformance, ContributorDetails, IssueResult,
  IssueHighlight, EnhancedTechPartnerData, ActionItem,
  GitHubData, IssueMetrics, EngagementTrend
} from '@/types/dashboard';
import * as utils from './utils';

// Types for CSV data structure
interface WeeklyEngagementEntry {
  Name: string;
  'Github Username'?: string;
  'Email Address'?: string;
  'Program Week': string;
  'Engagement Tracking'?: string;
  'Engagement Participation '?: string;
  'Tech Partner Collaboration?': string;
  'Which Tech Partner': string | string[];
  'Describe your work with the tech partner'?: string;
  'Did you work on an issue, PR, or project this week?': string;
  'How many issues, PRs, or projects this week?': string;
  'Issue Title 1'?: string;
  'Issue Link 1'?: string;
  'Issue Title 2'?: string;
  'Issue Link 2'?: string;
  'Issue Title 3'?: string;
  'Issue Link 3'?: string;
  'How likely are you to recommend the PLDG to others?': string;
  'PLDG Feedback'?: string;
}

// Standardized issue structure
interface IssueEntry {
  title: string;
  url: string;
  status: string;
  lastUpdated: string;
  partner: string;
  contributor: string;
  week: string;
}

// Updated ContributorDetail interface
interface ContributorDetail {
  name: string;
  githubUsername: string;
  issuesCompleted: number;
  engagementScore: number;
  techPartners: Set<string>;
  weeks: Set<string>;
  recentContributions: Array<{
    issueTitle: string;
    issueLink: string;
    week: string;
    partner: string;
  }>;
}

// Weekly data structure
interface WeeklyData {
  issueCount: number;
  contributors: Set<string>;
  issues: IssueEntry[];
  engagementLevel: number;
}

// Add these interfaces at the top of the file
interface ProcessedWeekData {
  issues: Array<{
    title: string;
    url: string;
    status: string;
    lastUpdated: string;
  }>;
  contributors: Set<string>;
  issueCount: number;
  engagementScores: number[];
}

interface ProcessedPartnerData {
  weeks: Record<string, ProcessedWeekData>;
  contributors: Map<string, {
    issuesCompleted: number;
    engagementScores: number[];
    githubUsername: string;
  }>;
}

// Add proper type for tech partner field
type TechPartnerField = string | string[] | undefined;

// Update type guard to be more specific
function isTechPartnerString(value: TechPartnerField): value is string {
  return typeof value === 'string';
}

// Add helper function to normalize tech partner data
function normalizeTechPartners(techPartner: TechPartnerField): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner.map((p: string) => p.trim()).filter(Boolean);
  }
  if (isTechPartnerString(techPartner)) {
    return techPartner.split(',').map((p: string) => p.trim()).filter(Boolean);
  }
  return [];
}

// Helper function to parse tech partners consistently
function parseTechPartners(techPartner: string | string[]): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner;
  }
  return techPartner?.split(',').map(p => p.trim()) ?? [];
}

// Update the week parsing function to handle CSV format correctly
function parseWeekNumber(weekString: string): number {
  // Format: "Week X (Month Day - Month Day, Year)"
  const match = weekString.match(/Week (\d+)/i);
  if (!match) {
    console.warn(`Invalid week format: ${weekString}`);
    return 0;
  }
  return parseInt(match[1]);
}

// Helper function to format week string consistently
function formatWeekString(weekString: string): string {
  return weekString.replace(/\(.*?\)/, '').trim();
}

// Add helper function to safely handle string or string[] fields
function getStringValue(value: string | string[] | undefined): string {
  if (!value) return '';
  return Array.isArray(value) ? value[0] || '' : value;
}

// Calculate NPS Score
function calculateNPSScore(data: EngagementData[]): number {
  const scores = data
    .map(entry => parseInt(getStringValue(entry['How likely are you to recommend the PLDG to others?']) || '0'))
    .filter(score => score > 0);

  if (scores.length === 0) return 0;

  const promoters = scores.filter(score => score >= 9).length;
  const detractors = scores.filter(score => score <= 6).length;
  
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

// Calculate Engagement Rate
function calculateEngagementRate(data: EngagementData[]): number {
  const totalEntries = data.length;
  if (totalEntries === 0) return 0;

  const activeEntries = data.filter(entry => 
    entry['Engagement Participation ']?.includes('3 -') || 
    entry['Engagement Participation ']?.includes('2 -')
  ).length;

  return Math.round((activeEntries / totalEntries) * 100);
}

// Calculate Weekly Change
function calculateWeeklyChange(data: EngagementData[]): number {
  const weeks = _.groupBy(data, 'Program Week');
  const weekNumbers = Object.keys(weeks).sort((a, b) => {
    const weekA = parseWeekNumber(a);
    const weekB = parseWeekNumber(b);
    return weekA - weekB;
  });

  if (weekNumbers.length < 2) return 0;

  const currentWeek = weeks[weekNumbers[weekNumbers.length - 1]];
  const previousWeek = weeks[weekNumbers[weekNumbers.length - 2]];

  const currentTotal = currentWeek.reduce((sum, entry) => {
    const value = parseInt(entry['How many issues, PRs, or projects this week?'] || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const previousTotal = previousWeek.reduce((sum, entry) => {
    const value = parseInt(entry['How many issues, PRs, or projects this week?'] || '0');
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
  
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
}

// Calculate Positive Feedback
function calculatePositiveFeedback(data: EngagementData[]): number {
  return data.filter(entry => {
    const feedback = getStringValue(entry['PLDG Feedback']);
    return feedback.toLowerCase().includes('great') || 
           feedback.toLowerCase().includes('good');
  }).length;
}

// Calculate Top Performers
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
        const participation = e['Engagement Participation ']?.trim() || '';
        return participation.startsWith('3') ? 3 :
               participation.startsWith('2') ? 2 :
               participation.startsWith('1') ? 1 : 0;
      })
    }))
    .orderBy(['totalIssues', 'avgEngagement'], ['desc', 'desc'])
    .value();
}

// Calculate Tech Partner Metrics
function calculateTechPartnerMetrics(data: EngagementData[]) {
  return _(data)
    .groupBy('Which Tech Partner')
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

// Update the interfaces at the top
interface ContributorDetail {
  name: string;
  githubUsername: string;
  issuesCompleted: number;
  engagementScore: number;
  techPartners: Set<string>;
  weeks: Set<string>;
  recentContributions: Array<{
    issueTitle: string;
    issueLink: string;
    week: string;
    partner: string;
  }>;
}

// Modify calculateTechPartnerPerformance to use the contributor details
function calculateTechPartnerPerformance(data: EngagementData[] | WeeklyEngagementEntry[]): TechPartnerPerformance[] {
  // Type guard to check if we're working with WeeklyEngagementEntry
  const isWeeklyEntry = (entry: EngagementData | WeeklyEngagementEntry): entry is WeeklyEngagementEntry => {
    return 'Name' in entry && 'Program Week' in entry;
  };

  // First, process all entries by contributor
  const contributorMap = new Map<string, ContributorDetail>();

  data.forEach(entry => {
    if (entry['Tech Partner Collaboration?'] !== 'Yes') return;

    const name = isWeeklyEntry(entry) ? entry.Name : entry.Name;
    const githubUsername = isWeeklyEntry(entry) ? entry['Github Username'] : entry['Github Username'];

    const key = `${name}-${githubUsername}`;
    if (!contributorMap.has(key)) {
      contributorMap.set(key, {
        name,
        githubUsername: githubUsername || '',
        issuesCompleted: 0,
        engagementScore: 0,
        techPartners: new Set(),
        weeks: new Set(),
        recentContributions: []
      });
    }

    const contributor = contributorMap.get(key)!;
    const partners = normalizeTechPartners(entry['Which Tech Partner']);

    // Add week and partners
    contributor.weeks.add(entry['Program Week']);
    partners.forEach(p => contributor.techPartners.add(p));

    // Process all issues for this entry
    const processIssue = (title: string | string[] | undefined, link: string | string[] | undefined) => {
      const titleStr = Array.isArray(title) ? title[0] : title;
      const linkStr = Array.isArray(link) ? link[0] : link;

      if (titleStr && linkStr) {
        partners.forEach(partner => {
          contributor.recentContributions.push({
            issueTitle: titleStr,
            issueLink: linkStr,
            week: entry['Program Week'],
            partner
          });
        });
      }
    };

    processIssue(entry['Issue Title 1'], entry['Issue Link 1']);
    processIssue(entry['Issue Title 2'], entry['Issue Link 2']);
    processIssue(entry['Issue Title 3'], entry['Issue Link 3']);

    // Update metrics
    const issueCount = entry['How many issues, PRs, or projects this week?'] === '4+'
      ? 4
      : parseInt(entry['How many issues, PRs, or projects this week?'] || '0');

    contributor.issuesCompleted += issueCount;

    const engagement = entry['Engagement Participation ']?.includes('3 -') ? 3
      : entry['Engagement Participation ']?.includes('2 -') ? 2
      : entry['Engagement Participation ']?.includes('1 -') ? 1
      : 0;
    contributor.engagementScore = Math.max(contributor.engagementScore, engagement);
  });

  // Now group by tech partner
  const partnerMap = new Map<string, {
    weeklyData: Map<string, WeeklyData>;
    contributors: ContributorDetail[];
  }>();

  // Process contributor data into partner structure
  Array.from(contributorMap.values()).forEach(contributor => {
    contributor.techPartners.forEach(partner => {
      if (!partnerMap.has(partner)) {
        partnerMap.set(partner, {
          weeklyData: new Map(),
          contributors: []
        });
      }

      const partnerData = partnerMap.get(partner)!;
      partnerData.contributors.push(contributor);

      // Add weekly data
      contributor.weeks.forEach(week => {
        if (!partnerData.weeklyData.has(week)) {
          partnerData.weeklyData.set(week, {
            issueCount: 0,
            contributors: new Set(),
            issues: [],
            engagementLevel: 0
          });
        }

        const weekData = partnerData.weeklyData.get(week)!;
        weekData.contributors.add(contributor.name);

        // Add relevant issues
        const weekIssues = contributor.recentContributions
          .filter(c => c.week === week && c.partner === partner)
          .map(issue => ({
            title: issue.issueTitle,
            url: issue.issueLink,
            status: 'open',
            lastUpdated: new Date().toISOString(),
            partner,
            contributor: contributor.name,
            week
          }));

        weekData.issues.push(...weekIssues);
        weekData.issueCount += weekIssues.length;
        weekData.engagementLevel = Math.max(weekData.engagementLevel, contributor.engagementScore);
      });
    });
  });

  // Convert to final TechPartnerPerformance format
  return Array.from(partnerMap.entries()).map(([partner, data]) => ({
    partner,
    timeSeriesData: Array.from(data.weeklyData.entries())
      .sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]))
      .map(([week, weekData]) => ({
        week,
        weekEndDate: new Date().toISOString(),
        issueCount: weekData.issueCount,
        contributors: Array.from(weekData.contributors),
        engagementLevel: 0,
        issues: weekData.issues.map(issue => ({
          title: issue.title,
          url: issue.url,
          status: 'open',
          lastUpdated: new Date().toISOString(),
          contributor: issue.contributor  // Add contributor field
        }))
      })),
    contributorDetails: data.contributors.map(c => ({
      name: c.name,
      githubUsername: c.githubUsername,
      issuesCompleted: c.issuesCompleted,
      engagementScore: c.engagementScore
    })),
    issues: data.contributors.reduce((sum, c) => sum + c.issuesCompleted, 0)
  }));
}

// Calculate Action Items
function calculateActionItems(data: EngagementData[]): ActionItem[] {
  const actionItems: ActionItem[] = [];

  // Check for engagement drops
  const weeklyEngagement = Object.entries(
    _.groupBy(data, 'Program Week')
  ).map(([week, entries]) => ({
    week,
    highEngagement: entries.filter(e => e['Engagement Participation ']?.includes('3 -')).length
  })).sort((a, b) => a.week.localeCompare(b.week));

  if (weeklyEngagement.length >= 2) {
    const lastTwo = weeklyEngagement.slice(-2);
    if (lastTwo[1].highEngagement < lastTwo[0].highEngagement) {
      actionItems.push({
        type: 'warning',
        title: 'Engagement Drop Detected',
        description: 'High engagement decreased from last week',
        action: 'Review recent program changes and gather feedback'
      });
    }
  }

  // Process tech partners
  const techPartners = new Set(
    data.flatMap(entry => parseTechPartners(entry['Which Tech Partner']))
  );

  const activeTechPartners = new Set(
    data.filter(e => e['Tech Partner Collaboration?'] === 'Yes')
      .flatMap(entry => parseTechPartners(entry['Which Tech Partner']))
  );

  // Fix Set iteration by converting to Array first
  const inactivePartners = Array.from(techPartners)
    .filter(partner => !activeTechPartners.has(partner));

  if (inactivePartners.length > 0) {
    actionItems.push({
      type: 'opportunity',
      title: 'Partner Engagement Opportunity',
      description: `${inactivePartners.length} tech partners need attention`,
      action: 'Schedule check-ins with inactive partners'
    });
  }

  return actionItems;
}

// Process Raw Issue Metrics
function processRawIssueMetrics(entries: EngagementData[]): IssueMetrics[] {
  const weeklyMetrics = _.groupBy(entries, 'Program Week');

  return Object.entries(weeklyMetrics).map(([week, weekEntries]) => {
    const totalIssues = weekEntries.reduce((sum, entry) => {
      const value = entry['How many issues, PRs, or projects this week?'];
      return sum + (value === '4+' ? 4 : parseInt(value || '0'));
    }, 0);

    const hasGitHubLink = weekEntries.some(entry => entry['Issue Link 1']);
    const closedIssues = hasGitHubLink
      ? weekEntries.filter(entry => entry['Issue Link 1']?.includes('closed')).length
      : Math.round(totalIssues * 0.7);

    return {
      week: week.replace(/\(.*?\)/, '').trim(),
      open: totalIssues - closedIssues,
      closed: closedIssues,
      total: totalIssues
    };
  });
}

// Add validation helper
function validateEngagementData(data: any[]): data is EngagementData[] {
  return data.every(entry =>
    typeof entry === 'object' &&
    typeof entry.Name === 'string' &&
    typeof entry['Program Week'] === 'string' &&
    (typeof entry['Which Tech Partner'] === 'string' || Array.isArray(entry['Which Tech Partner']))
  );
}

// Add type for tech partner string
type TechPartner = string;

function processCSVData(csvData: any[]): TechPartnerPerformance[] {
  console.log('Processing CSV data input:', {
    recordCount: csvData.length,
    sampleRecord: csvData[0]
  });

  const partnerData = new Map<TechPartner, {
    weeklyData: Map<string, {
      issues: any[];
      contributors: Set<string>;
      issueCount: number;
      engagementLevel: number;
    }>;
    contributors: Map<string, {
      issuesCompleted: number;
      engagementScore: number;
      githubUsername: string;
    }>;
  }>();

  csvData.forEach(row => {
    if (row['Tech Partner Collaboration?'] !== 'Yes') return;

    // Handle multiple tech partners
    const partners: TechPartner[] = (row['Which Tech Partner'] || '')
      .toString()
      .split(',')
      .map((p: string): string => p.trim())
      .filter(Boolean);

    partners.forEach((partner: TechPartner) => {
      if (!partnerData.has(partner)) {
        partnerData.set(partner, {
          weeklyData: new Map(),
          contributors: new Map()
        });
      }

      const data = partnerData.get(partner)!;
      // Keep the original week format from CSV
      const week = row['Program Week'];

      if (!data.weeklyData.has(week)) {
        data.weeklyData.set(week, {
          issues: [],
          contributors: new Set(),
          issueCount: 0,
          engagementLevel: 0
        });
      }

      const weekData = data.weeklyData.get(week)!;
      weekData.contributors.add(row.Name);

      // Process issues
      const issueCount = row['How many issues, PRs, or projects this week?'] === '4+'
        ? 4
        : parseInt(row['How many issues, PRs, or projects this week?'] || '0');
      weekData.issueCount += issueCount;

      // Add specific issues
      for (let i = 1; i <= 3; i++) {
        const title = row[`Issue Title ${i}`];
        const url = row[`Issue Link ${i}`];
        if (title && url) {
          weekData.issues.push({
            title,
            url,
            status: 'open',
            lastUpdated: new Date().toISOString(),
            contributor: row.Name
          });
        }
      }

      // Update contributor data
      if (!data.contributors.has(row.Name)) {
        data.contributors.set(row.Name, {
          issuesCompleted: 0,
          engagementScore: 0,
          githubUsername: row['Github Username'] || ''
        });
      }

      const contributor = data.contributors.get(row.Name)!;
      contributor.issuesCompleted += issueCount;
      
      const engagement = row['Engagement Participation ']?.includes('3 -') ? 3
        : row['Engagement Participation ']?.includes('2 -') ? 2
        : row['Engagement Participation ']?.includes('1 -') ? 1
        : 0;
      contributor.engagementScore = Math.max(contributor.engagementScore, engagement);
      weekData.engagementLevel = Math.max(weekData.engagementLevel, engagement);
    });
  });

  // Convert to array and sort weeks chronologically
  const result = Array.from(partnerData.entries()).map(([partner, data]) => ({
    partner,
    timeSeriesData: Array.from(data.weeklyData.entries())
      .sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]))
      .map(([week, weekData]) => ({
        week,
        weekEndDate: new Date().toISOString(),
        issueCount: weekData.issueCount,
        contributors: Array.from(weekData.contributors),
        engagementLevel: weekData.engagementLevel,
        issues: weekData.issues
      })),
    contributorDetails: Array.from(data.contributors.entries()).map(([name, details]) => ({
      name,
      githubUsername: details.githubUsername,
      issuesCompleted: details.issuesCompleted,
      engagementScore: details.engagementScore
    })),
    issues: Array.from(data.contributors.values())
      .reduce((sum, c) => sum + c.issuesCompleted, 0)
  }));

  console.log('Processed tech partner data:', result);
  return result;
}

// Add the missing calculateTotalContributions function
function calculateTotalContributions(csvData: any[]): number {
  return csvData.reduce((sum, row) => {
    const count = row['How many issues, PRs, or projects this week?'];
    return sum + (count === '4+' ? 4 : parseInt(count || '0'));
  }, 0);
}

// Update the processData function to return all required ProcessedData fields
export function processData(
  csvData: any[],
  cohortId: string,
  githubData?: GitHubData | null
): ProcessedData {
  console.log('Processing data:', {
    recordCount: csvData.length,
    sampleRecord: csvData[0],
    hasGithubData: !!githubData
  });

  const techPartnerPerformance = processCSVData(csvData);
  console.log('Tech Partner Performance:', techPartnerPerformance);

  // Tagged csvData with cohortId
  csvData = csvData.map(row => ({
    ...row,
    cohortId
  }));
  // Calculate core metrics with validation
  const activeContributors = new Set(csvData.filter(row => row.Name).map(row => row.Name)).size;
  const totalContributions = calculateTotalContributions(csvData);
  
  // Calculate tech partners
  const techPartners = new Set(
    csvData.flatMap(row => 
      (row['Which Tech Partner'] || '').toString().split(',')
        .map((p: string) => p.trim())
        .filter(Boolean)
    )
  );

  return {
    weeklyChange: calculateWeeklyChange(csvData),
    activeContributors,
    totalContributions,
    programHealth: {
      npsScore: calculateNPSScore(csvData),
      engagementRate: calculateEngagementRate(csvData),
      activeTechPartners: techPartners.size
    },
    keyHighlights: {
      activeContributorsAcrossTechPartners: `${activeContributors} across ${techPartners.size}`,
      totalContributions: `${totalContributions} total`,
      positiveFeedback: `${calculatePositiveFeedback(csvData)} positive`,
      weeklyContributions: `${calculateWeeklyChange(csvData)}% change`
    },
    topPerformers: calculateTopPerformers(csvData),
    techPartnerMetrics: calculateTechPartnerMetrics(csvData),
    techPartnerPerformance,
    engagementTrends: calculateEngagementTrends(csvData),
    technicalProgress: calculateTechnicalProgress(csvData, githubData),
    issueMetrics: processRawIssueMetrics(csvData),
    actionItems: calculateActionItems(csvData),
    feedbackSentiment: {
      positive: calculatePositiveFeedback(csvData),
      neutral: 0,
      negative: 0
    },
    contributorGrowth: [{
      week: new Date().toISOString().split('T')[0],
      newContributors: activeContributors,
      returningContributors: 0,
      totalActive: activeContributors
    }],
    rawEngagementData: csvData
  };
}

// Add helper functions for the new calculations
function calculateEngagementTrends(csvData: any[]): EngagementTrend[] {
  // First, get all unique weeks and sort them
  const allWeeks = Array.from(new Set(csvData.map(row => row['Program Week'])))
    .sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  console.log('Week Processing:', {
    uniqueWeeks: allWeeks,
    weekCount: allWeeks.length,
    lastWeek: allWeeks[allWeeks.length - 1]
  });

  // Create a map of week data
  const weeklyData = _.groupBy(csvData, 'Program Week');

  // Process each week
  return allWeeks.map(week => {
    const entries = weeklyData[week] || [];
    
    // Count unique contributors for this week
    const activeContributors = new Set(entries.map(e => e.Name)).size;

    // Debug logging
    console.log(`Week ${week} contributors:`, {
      total: activeContributors,
      uniqueNames: new Set(entries.map(e => e.Name))
    });

    return {
      week: `Week ${parseWeekNumber(week)}`,
      total: activeContributors,
      // Add zero values for backward compatibility
      'High Engagement': 0,
      'Medium Engagement': 0,
      'Low Engagement': 0
    };
  });
}

function calculateTechnicalProgress(csvData: any[], githubData?: GitHubData | null) {
  return Object.entries(_.groupBy(csvData, 'Program Week'))
    .sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]))
    .map(([week, entries]) => ({
      week: formatWeekString(week),
      'Total Issues': entries.reduce((sum, entry) =>
        sum + parseInt(entry['How many issues, PRs, or projects this week?'] || '0'), 0
      ),
      'In Progress': githubData?.statusGroups?.inProgress || 0,
      'Done': githubData?.statusGroups?.done || 0
    }));
}

// Add helper function to safely get string field
function getStringField(entry: EngagementData, field: keyof EngagementData): string {
  const value = entry[field];
  return Array.isArray(value) ? value[0] || '' : value || '';
}

// Update the interface name and structure at the top of the file
interface ContributorDetail {
  name: string;
  githubUsername: string;
  issuesCompleted: number;
  engagementScore: number;
  techPartners: Set<string>;
  weeks: Set<string>;
  recentContributions: Array<{
    issueTitle: string;
    issueLink: string;
    week: string;
    partner: string;
  }>;
}

// Then update the function signature
function processContributorData(csvData: Array<{
  Name: string;
  'Github Username': string;
  'Program Week': string;
  'How many issues, PRs, or projects this week?': string;
  'Engagement Participation '?: string;
  'Issue Title 1'?: string;
  'Issue Link 1'?: string;
  'Issue Title 2'?: string;
  'Issue Link 2'?: string;
  'Issue Title 3'?: string;
  'Issue Link 3'?: string;
  'Which Tech Partner'?: string;
}>): ContributorDetail[] {
  const contributorMap = new Map<string, ContributorDetail>();

  csvData.forEach(row => {
    const key = `${row.Name}-${row['Github Username']}`;
    
    if (!contributorMap.has(key)) {
      contributorMap.set(key, {
        name: row.Name,
        githubUsername: row['Github Username'],
        issuesCompleted: 0,
        engagementScore: 0,
        techPartners: new Set(),
        weeks: new Set(),
        recentContributions: []
      });
    }

    const contributor = contributorMap.get(key)!;
    const partners = row['Which Tech Partner']?.split(',').map(p => p.trim()) || [''];
    
    contributor.weeks.add(row['Program Week']);
    partners.forEach(partner => {
      if (partner) contributor.techPartners.add(partner);
    });

    // Add contributions with partner info
    if (row['Issue Title 1'] && row['Issue Link 1']) {
      partners.forEach(partner => {
        contributor.recentContributions.push({
          issueTitle: row['Issue Title 1']!,
          issueLink: row['Issue Link 1']!,
          week: row['Program Week'],
          partner: partner || 'Unknown'
        });
      });
    }

    // Similar updates for Issue 2 and 3...
    if (row['Issue Title 2'] && row['Issue Link 2']) {
      partners.forEach(partner => {
        contributor.recentContributions.push({
          issueTitle: row['Issue Title 2']!,
          issueLink: row['Issue Link 2']!,
          week: row['Program Week'],
          partner: partner || 'Unknown'
        });
      });
    }

    if (row['Issue Title 3'] && row['Issue Link 3']) {
      partners.forEach(partner => {
        contributor.recentContributions.push({
          issueTitle: row['Issue Title 3']!,
          issueLink: row['Issue Link 3']!,
          week: row['Program Week'],
          partner: partner || 'Unknown'
        });
      });
    }

    // Update metrics
    const issueCount = row['How many issues, PRs, or projects this week?'];
    contributor.issuesCompleted += issueCount === '4+' ? 4 : parseInt(issueCount || '0');
    
    const engagement = row['Engagement Participation ']?.includes('3 -') ? 3 :
                      row['Engagement Participation ']?.includes('2 -') ? 2 :
                      row['Engagement Participation ']?.includes('1 -') ? 1 : 0;
    contributor.engagementScore = Math.max(contributor.engagementScore, engagement);
  });

  return Array.from(contributorMap.values());
}

export function mergeCohortData(
  cohort1Data: EngagementData[], 
  cohort2Data: EngagementData[]
): EngagementData[] {
  return [...cohort1Data, ...cohort2Data];
}

export function filterMergeCohortData(
  data: EngagementData[],
  cohort: string
): EngagementData[] {
  if (cohort !== 'all') {
    return data.filter(record => record.cohortId === cohort);
  }
  
  const userMap = new Map<string, EngagementData>();
  
  data.forEach(record => {
    const userName = record.Name.toLowerCase().trim();
    
    if (!userMap.has(userName)) {
      userMap.set(userName, {...record});
    } else {
      const existingRecord = userMap.get(userName)!;
      
      const existingIssueCount = existingRecord['How many issues, PRs, or projects this week?'];
      const currentIssueCount = record['How many issues, PRs, or projects this week?'];
      
      const existingCount = existingIssueCount === '4+' ? 4 : parseInt(existingIssueCount || '0');
      const currentCount = currentIssueCount === '4+' ? 4 : parseInt(currentIssueCount || '0');
      const totalCount = existingCount + currentCount;
      
      existingRecord['How many issues, PRs, or projects this week?'] = totalCount.toString();
      
      const existingPartners = Array.isArray(existingRecord['Which Tech Partner']) 
        ? existingRecord['Which Tech Partner'] 
        : [existingRecord['Which Tech Partner']];
      
      const currentPartners = Array.isArray(record['Which Tech Partner'])
        ? record['Which Tech Partner']
        : [record['Which Tech Partner']];
      
      existingRecord['Which Tech Partner'] = [...new Set([...existingPartners, ...currentPartners])];
      
      existingRecord.cohortId = 'all';
      
      for (let i = 1; i <= 3; i++) {
        const titleKey = `Issue Title ${i}` as keyof EngagementData;
        const linkKey = `Issue Link ${i}` as keyof EngagementData;
        
        if (record[titleKey] && record[linkKey]) {
          let emptySlot = 0;
          for (let j = 1; j <= 3; j++) {
            const checkTitleKey = `Issue Title ${j}` as keyof EngagementData;
            if (!existingRecord[checkTitleKey]) {
              emptySlot = j;
              break;
            }
          }
          
          if (emptySlot > 0) {
            const newTitleKey = `Issue Title ${emptySlot}` as keyof EngagementData;
            const newLinkKey = `Issue Link ${emptySlot}` as keyof EngagementData;
            existingRecord[newTitleKey] = record[titleKey];
            existingRecord[newLinkKey] = record[linkKey];
          }
        }
      }
    }
  });
  
  return Array.from(userMap.values());
}