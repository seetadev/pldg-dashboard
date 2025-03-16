import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import _ from 'lodash'
import {
  IssueMetrics,
  RawIssueMetric,
  ProcessedData,
  EnhancedProcessedData,
  EngagementData,
  EnhancedTechPartnerData,
  TechPartnerPerformance,
  ContributorDetails,
  IssueTracking
} from '../types/dashboard'
import { processDataWithAI } from './ai';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function processEngagementData(rawData: EngagementData[]): Promise<EnhancedProcessedData> {
  // Sort data by week
  const sortedData = _.sortBy(rawData, 'Program Week');
  const engagementByWeek = _.groupBy(sortedData, 'Program Week');

  // Calculate NPS score
  const npsScore = calculateNPSScore(sortedData);

  // Process engagement trends
  const engagementTrends = Object.entries(engagementByWeek)
    .map(([week, entries]) => ({
      week: week.replace(/\(.*?\)/, '').trim(),
      'High Engagement': entries.filter(e => e['Engagement Participation ']?.includes('3 -')).length,
      'Medium Engagement': entries.filter(e => e['Engagement Participation ']?.includes('2 -')).length,
      'Low Engagement': entries.filter(e => e['Engagement Participation ']?.includes('1 -')).length,
      total: entries.length
    }));

  // Process tech partner performance
  const techPartnerPerformance = Array.from(new Set(sortedData.map(item => item['Which Tech Partner']))).map(partner => {
    const partnerStr = Array.isArray(partner) ? partner[0] : partner;
    const partnerData = sortedData.filter(item => {
      const techPartner = item['Which Tech Partner'];
      return Array.isArray(techPartner) ? techPartner[0] === partnerStr : techPartner === partnerStr;
    });
    return {
      partner: partnerStr,
      issues: partnerData.reduce((sum, item) =>
        sum + parseInt(item['How many issues, PRs, or projects this week?'] || '0'), 0),
      timeSeriesData: [],  // Will be populated later in enhanceTechPartnerData
      contributorDetails: [] // Will be populated later in enhanceTechPartnerData
    };
  });

  // Process tech partner metrics
  const techPartnerMetrics = _(sortedData)
    .groupBy('Which Tech Partner')
    .map((items, partner) => ({
      partner,
      totalIssues: _.sumBy(items, item => 
        parseInt(item['How many issues, PRs, or projects this week?'] || '0')
      ),
      activeContributors: new Set(items.map(item => item.Name)).size,
      avgIssuesPerContributor: 0,
      collaborationScore: 0
    }))
    .value();

  // Process feedback sentiment
  const feedbackSentiment = {
    positive: sortedData.filter(e => {
      const feedback = e['PLDG Feedback'];
      const feedbackStr = Array.isArray(feedback) ? feedback[0] : feedback;
      return typeof feedbackStr === 'string' &&
        (feedbackStr.toLowerCase().includes('great') || feedbackStr.toLowerCase().includes('good'));
    }).length,
    neutral: sortedData.filter(e => {
      const feedback = e['PLDG Feedback'];
      const feedbackStr = Array.isArray(feedback) ? feedback[0] : feedback;
      return typeof feedbackStr === 'string' &&
        !feedbackStr.toLowerCase().includes('great') &&
        !feedbackStr.toLowerCase().includes('good') &&
        !feedbackStr.toLowerCase().includes('bad');
    }).length,
    negative: sortedData.filter(e => {
      const feedback = e['PLDG Feedback'];
      const feedbackStr = Array.isArray(feedback) ? feedback[0] : feedback;
      return typeof feedbackStr === 'string' && feedbackStr.toLowerCase().includes('bad');
    }).length
  };

  // Process technical progress
  const technicalProgress = Object.entries(engagementByWeek)
    .map(([week, entries]) => ({
      week: week.replace(/\(.*?\)/, '').trim(),
      'Total Issues': _.sumBy(entries, entry => 
        parseInt(entry['How many issues, PRs, or projects this week?'] || '0')
      )
    }));

  // Calculate top performers
  const topPerformers = _(sortedData)
    .groupBy('Name')
    .map((entries, name) => ({
      name,
      totalIssues: _.sumBy(entries, e => parseInt(e['How many issues, PRs, or projects this week?'] || '0')),
      avgEngagement: _.meanBy(entries, e => {
        const participation = e['Engagement Participation ']?.trim() || '';
        return participation.startsWith('3') ? 3 :
               participation.startsWith('2') ? 2 :
               participation.startsWith('1') ? 1 : 0;
      })
    }))
    .filter(p => p.totalIssues > 0)
    .orderBy(['totalIssues', 'avgEngagement'], ['desc', 'desc'])
    .value();

  // Process issue metrics
  const issueMetrics = processRawIssueMetrics(sortedData);

  // Calculate program health metrics
  const techPartnerSet = new Set(
    sortedData.flatMap(entry =>
      Array.isArray(entry['Which Tech Partner'])
        ? entry['Which Tech Partner']
        : (entry['Which Tech Partner'] as string)?.split(',').map((p: string) => p.trim()) ?? []
    )
  );
  
  const programHealth = {
    npsScore,
    engagementRate: calculateEngagementRate(sortedData),
    activeTechPartners: Array.from(techPartnerSet).length
  };

  // Calculate key metrics before using them
  const contributorsSet = new Set(sortedData.map(e => e.Name));
  const activeContributors = Array.from(contributorsSet).length;
  
  const activeTechPartnersSet = new Set(
    sortedData.flatMap(entry =>
      Array.isArray(entry['Which Tech Partner'])
        ? entry['Which Tech Partner']
        : (entry['Which Tech Partner'] as string)?.split(',').map((p: string) => p.trim()) ?? []
    )
  );
  const activeTechPartners = Array.from(activeTechPartnersSet).length;

  const totalContributions = sortedData.reduce((sum, entry) => 
    sum + parseInt(entry['How many issues, PRs, or projects this week?'] || '0'), 0
  );

  const positiveFeedback = sortedData.filter(entry => {
    const feedback = entry['PLDG Feedback'];
    const feedbackStr = Array.isArray(feedback) ? feedback[0] : feedback;
    return typeof feedbackStr === 'string' &&
      (feedbackStr.toLowerCase().includes('great') || feedbackStr.toLowerCase().includes('good'));
  }).length;

  // Calculate weekly change
  const currentWeekData = sortedData.filter(entry => 
    entry['Program Week'] === sortedData[sortedData.length - 1]['Program Week']
  );
  const previousWeekData = sortedData.filter(entry => 
    entry['Program Week'] === sortedData[sortedData.length - 2]?.['Program Week']
  );

  const currentWeekContributions = currentWeekData.reduce((sum, entry) => 
    sum + parseInt(entry['How many issues, PRs, or projects this week?'] || '0'), 0
  );
  const previousWeekContributions = previousWeekData.reduce((sum, entry) => 
    sum + parseInt(entry['How many issues, PRs, or projects this week?'] || '0'), 0
  );

  const weeklyChange = previousWeekContributions 
    ? Math.round(((currentWeekContributions - previousWeekContributions) / previousWeekContributions) * 100)
    : 0;

  // Update baseProcessedData with calculated metrics
  const baseProcessedData: ProcessedData = {
    weeklyChange,
    activeContributors,
    totalContributions,
    keyHighlights: {
      activeContributorsAcrossTechPartners: `${activeContributors} across ${activeTechPartners}`,
      totalContributions: `${totalContributions} total`,
      positiveFeedback: `${positiveFeedback} positive`,
      weeklyContributions: `${weeklyChange}% change`
    },
    actionItems: [], // This will be populated later
    engagementTrends,
    techPartnerPerformance,
    techPartnerMetrics,
    topPerformers,
    technicalProgress,
    issueMetrics,
    feedbackSentiment,
    contributorGrowth: [],
    programHealth,
    rawEngagementData: sortedData // Add the raw engagement data
  };
  
  try {
    const enhancedData = await processDataWithAI(baseProcessedData);
    return {
      ...baseProcessedData,
      insights: {
        keyTrends: enhancedData.insights?.keyTrends || [],
        areasOfConcern: enhancedData.insights?.areasOfConcern || [],
        recommendations: enhancedData.insights?.recommendations || [],
        achievements: enhancedData.insights?.achievements || [],
        metrics: {
          engagementScore: enhancedData.insights?.metrics.engagementScore || 0,
          technicalProgress: enhancedData.insights?.metrics.technicalProgress || 0,
          collaborationIndex: enhancedData.insights?.metrics.collaborationIndex || 0,
        }
      }
    };
  } catch (error) {
    console.error('AI processing error:', error);
    // Return with default insights
    return {
      ...baseProcessedData,
      insights: {
        keyTrends: [],
        areasOfConcern: [],
        recommendations: [],
        achievements: [],
        metrics: {
          engagementScore: 0,
          technicalProgress: 0,
          collaborationIndex: 0
        }
      }
    };
  }
} 

export function calculateTechnicalProgress(data: ProcessedData): number {
  if (!data.issueMetrics.length) return 0;
  
  const latestMetrics = data.issueMetrics[data.issueMetrics.length - 1];
  return latestMetrics.total > 0 
    ? Math.round((latestMetrics.closed / latestMetrics.total) * 100) 
    : 0;
}

// Convert raw metrics to IssueMetrics format
function processIssueMetrics(rawMetrics: RawIssueMetric[]): IssueMetrics[] {
  const currentDate = new Date();
  const weekStr = currentDate.toISOString().split('T')[0];
  
  return rawMetrics.map(metric => ({
    week: weekStr,
    open: Math.round(metric.count * (1 - metric.percentComplete / 100)),
    closed: Math.round(metric.count * (metric.percentComplete / 100)),
    total: metric.count
  }));
}

// Update the processData function to use the correct issue metrics processing
export function processData(rawData: any): ProcessedData {
  const processedIssueMetrics = processIssueMetrics(rawData.issueMetrics || []);

  return {
    weeklyChange: rawData.weeklyChange || 0,
    activeContributors: rawData.activeContributors || 0,
    totalContributions: rawData.totalContributions || 0,
    keyHighlights: rawData.keyHighlights || {
      activeContributorsAcrossTechPartners: '0 across 0',
      totalContributions: '0 total',
      positiveFeedback: '0 positive',
      weeklyContributions: '0% change'
    },
    actionItems: rawData.actionItems || [],
    engagementTrends: rawData.engagementTrends || [],
    techPartnerPerformance: rawData.techPartnerPerformance || [],
    techPartnerMetrics: rawData.techPartnerMetrics || [],
    topPerformers: rawData.topPerformers || [],
    technicalProgress: rawData.technicalProgress || [],
    issueMetrics: processedIssueMetrics,
    feedbackSentiment: rawData.feedbackSentiment || { positive: 0, neutral: 0, negative: 0 },
    contributorGrowth: rawData.contributorGrowth || [],
    programHealth: {
      npsScore: rawData.programHealth?.npsScore || 0,
      engagementRate: rawData.programHealth?.engagementRate || 0,
      activeTechPartners: rawData.programHealth?.activeTechPartners || 0
    },
    rawEngagementData: rawData.rawEngagementData || [] // Add the raw engagement data
  };
}

// Helper function to combine and prioritize insights
export function combineAndPrioritize(insights1: string[] = [], insights2: string[] = []): string[] {
  const uniqueInsights = new Set([...insights1, ...insights2]);
  const combined = Array.from(uniqueInsights);
  return combined.slice(0, 5); // Return top 5 insights
}

// Calculate engagement score based on engagement trends and NPS
export function calculateEngagementScore(data: ProcessedData): number {
  // Get the most recent week's data
  const recentEngagement = data.engagementTrends[data.engagementTrends.length - 1];
  
  if (!recentEngagement) {
    console.warn('No engagement data available for score calculation');
    return 0;
  }

  // Calculate engagement rate based on active contributors
  // Compare to the average number of contributors across all weeks
  const averageContributors = data.engagementTrends.reduce((sum, week) => sum + week.total, 0) / 
    data.engagementTrends.length;
  
  const engagementRate = (recentEngagement.total / averageContributors) * 100;

  // Combine with NPS score for overall health metric
  const score = Math.round((engagementRate + data.programHealth.npsScore) / 2);

  // Debug logging
  console.log('Engagement Score Calculation:', {
    recentWeekTotal: recentEngagement.total,
    averageContributors,
    engagementRate,
    npsScore: data.programHealth.npsScore,
    finalScore: score
  });

  return score;
}

// Calculate collaboration index based on tech partner interactions
export function calculateCollaborationIndex(data: ProcessedData): number {
  const partnersSet = new Set(data.techPartnerMetrics.map(m => m.partner));
  const activePartners = Array.from(partnersSet).length;
  const totalContributors = data.topPerformers.length;
  return Math.round((activePartners / totalContributors) * 100);
}

// Helper function to fetch and process insights
export async function generateEnhancedInsights(data: ProcessedData): Promise<EnhancedProcessedData> {
  try {
    const metricsResponse = await fetch('/api/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engagementMetrics: {
          trends: data.engagementTrends,
          npsScore: data.programHealth.npsScore,
          feedbackSentiment: data.feedbackSentiment
        },
        techPartnerMetrics: data.techPartnerPerformance,
        contributorMetrics: {
          topPerformers: data.topPerformers,
          growth: data.contributorGrowth
        },
        githubMetrics: data.issueMetrics
      })
    });

    const [metricsResult, programResult] = await Promise.all([
      metricsResponse.json(),
      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).then(res => res.json())
    ]);

    const enhancedData: EnhancedProcessedData = {
      ...data,
      insights: {
        keyTrends: metricsResult.insights?.keyTrends || [],
        areasOfConcern: combineAndPrioritize(
          metricsResult.insights?.areasOfConcern || [],
          programResult.insights?.riskFactors || []
        ),
        recommendations: combineAndPrioritize(
          metricsResult.insights?.recommendations || [],
          programResult.insights?.strategicRecommendations || []
        ),
        achievements: combineAndPrioritize(
          metricsResult.insights?.achievements || [],
          programResult.insights?.successStories || []
        ),
        metrics: {
          engagementScore: calculateEngagementScore(data),
          technicalProgress: calculateTechnicalProgress(data),
          collaborationIndex: calculateCollaborationIndex(data)
        }
      }
    };

    return enhancedData;
  } catch (error) {
    console.error('Error generating enhanced insights:', error);
    // Return with default insights structure
    return {
      ...data,
      insights: {
        keyTrends: [],
        areasOfConcern: [],
        recommendations: [],
        achievements: [],
        metrics: {
          engagementScore: 0,
          technicalProgress: 0,
          collaborationIndex: 0
        }
      }
    };
  }
}

// Type guard for insights
export function isValidInsights(insights: any): insights is {
  keyTrends: string[];
  areasOfConcern: string[];
  recommendations: string[];
  achievements: string[];
} {
  return (
    Array.isArray(insights?.keyTrends) &&
    Array.isArray(insights?.areasOfConcern) &&
    Array.isArray(insights?.recommendations) &&
    Array.isArray(insights?.achievements)
  );
}

// Fix the issue metrics processing
function processRawIssueMetrics(entries: EngagementData[]): IssueMetrics[] {
  const currentDate = new Date();
  const weekStr = currentDate.toISOString().split('T')[0];
  
  const metrics = _(entries)
    .flatMap(entry => {
      if (!entry['Issue Title 1']) return [];
      return [{
        week: weekStr,
        open: entry['Issue Link 1']?.includes('closed') ? 0 : 1,
        closed: entry['Issue Link 1']?.includes('closed') ? 1 : 0,
        total: 1
      }];
    })
    .groupBy('week')
    .map((items, week) => ({
      week,
      open: _.sumBy(items, 'open'),
      closed: _.sumBy(items, 'closed'),
      total: items.length
    }))
    .value();

  return metrics;
}

export function formatMetricName(key: string): string {
  return key
    .split(/(?=[A-Z])/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseWeekNumber(weekString: string): number {
  if (!weekString) return 0;

  // Handle CSV format: "Week X (Month Day - Month Day, Year)"
  const csvMatch = weekString.match(/Week (\d+)(?:\s*\(.*?\))?/i);
  if (csvMatch) {
    const weekNum = parseInt(csvMatch[1], 10);
    if (!isNaN(weekNum) && weekNum > 0) {
      return weekNum;
    }
  }

  // Handle Airtable format: just the number
  const weekNum = parseInt(weekString, 10);
  if (!isNaN(weekNum) && weekNum > 0) {
    return weekNum;
  }

  console.warn(`Invalid week number found: ${weekString}, using current date`);
  return new Date().getWeek() || 1;
}

// Helper function to get the current week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function(): number {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

// Add helper functions for program health calculations
function calculateEngagementRate(data: EngagementData[]): number {
  const totalEntries = data.length;
  if (totalEntries === 0) return 0;

  const activeEntries = data.filter(entry => 
    entry['Engagement Participation ']?.includes('3 -') || 
    entry['Engagement Participation ']?.includes('2 -')
  ).length;

  return Math.round((activeEntries / totalEntries) * 100);
}

function calculateNPSScore(data: EngagementData[]): number {
  const scores = data
    .map(entry => {
      const score = entry['How likely are you to recommend the PLDG to others?'];
      return parseInt(Array.isArray(score) ? score[0] || '0' : score || '0');
    })
    .filter(score => score > 0);

  if (scores.length === 0) return 0;

  const promoters = scores.filter(score => score >= 9).length;
  const detractors = scores.filter(score => score <= 6).length;

  return Math.round(((promoters - detractors) / scores.length) * 100);
}

function parseTechPartners(techPartner: string | string[]): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner;
  }
  return techPartner?.split(',').map(p => p.trim()) ?? [];
}

// Helper functions for enhanced tech partner data processing
function processEngagementLevels(items: EngagementData[]) {
  return _(items)
    .groupBy('Program Week')
    .map((weekItems, week) => ({
      week: week.replace(/\(.*?\)/, '').trim(),
      highEngagement: weekItems.filter(e => e['Engagement Participation ']?.includes('3 -')).length,
      mediumEngagement: weekItems.filter(e => e['Engagement Participation ']?.includes('2 -')).length,
      lowEngagement: weekItems.filter(e => e['Engagement Participation ']?.includes('1 -')).length
    }))
    .value();
}

function processCollaborationDetails(items: EngagementData[]) {
  return items
    .filter(item => item['Tech Partner Collaboration?'] === 'Yes')
    .map(item => {
      const sessions = item['Which session(s) did you find most informative or impactful, and why?'];
      const sessionStr = Array.isArray(sessions) ? sessions[0] : sessions;
      return {
        description: item['Describe your work with the tech partner'] || '',
        additionalCalls: sessionStr ? sessionStr.split(',').map(s => s.trim()) : [],
        weeklyFeedback: Array.isArray(item['PLDG Feedback']) ? item['PLDG Feedback'][0] : (item['PLDG Feedback'] || '')
      };
    });
}

function processIssueData(items: EngagementData[]): number {
  return _.sumBy(items, item =>
    parseInt(item['How many issues, PRs, or projects this week?'] || '0')
  );
}

// Add type for issue status
type IssueStatus = 'open' | 'closed';

// Helper functions for enhanced tech partner data processing
function processTimeSeriesData(engagementData: EngagementData[]): EnhancedTechPartnerData['timeSeriesData'] {
  const weeklyData = _.groupBy(engagementData, 'Program Week');

  return Object.entries(weeklyData)
    .map(([week, entries]) => {
      // Don't try to calculate dates, just use the week string as is
      return {
        week,
        weekEndDate: new Date().toISOString(), // This is just for type satisfaction
        issueCount: _.sumBy(entries, entry =>
          parseInt(entry['How many issues, PRs, or projects this week?'] || '0')
        ),
        contributors: Array.from(new Set(entries.map(entry => entry.Name))),
        engagementLevel: _.meanBy(entries, entry => {
          const participation = entry['Engagement Participation ']?.trim() || '';
          return participation.includes('3 -') ? 3 :
                 participation.includes('2 -') ? 2 :
                 participation.includes('1 -') ? 1 : 0;
        }),
        issues: entries
          .filter(entry => entry['Issue Title 1'] && entry['Issue Link 1'])
          .map(entry => ({
            title: String(entry['Issue Title 1']),
            url: String(entry['Issue Link 1']),
            status: 'open' as IssueStatus, // Explicitly type the status
            lastUpdated: new Date().toISOString(),
            contributor: entry.Name
          }))
      };
    })
    .sort((a, b) => {
      // Sort by week number
      const weekA = parseInt(a.week.match(/Week (\d+)/)?.[1] || '0');
      const weekB = parseInt(b.week.match(/Week (\d+)/)?.[1] || '0');
      return weekA - weekB;
    });
}

function processContributorDetails(engagementData: EngagementData[]): ContributorDetails[] {
  const contributorMap = new Map<string, EngagementData[]>();

  engagementData.forEach(entry => {
    const entries = contributorMap.get(entry.Name) || [];
    entries.push(entry);
    contributorMap.set(entry.Name, entries);
  });

  return Array.from(contributorMap.entries()).map(([name, entries]) => {
    const email = entries[0]['Email Address'];
    const emailStr = Array.isArray(email) ? email[0] : email;

    // Calculate issues completed
    const issuesCompleted = entries.reduce((sum: number, entry) => {
      const issueCount = entry['How many issues, PRs, or projects this week?'];
      return sum + (typeof issueCount === 'string' ? parseInt(issueCount || '0') : 0);
    }, 0);

    // Calculate engagement score
    const engagementScore = entries.reduce((sum: number, entry) => {
      const participation = entry['Engagement Participation ']?.trim() || '';
      return sum + (participation.startsWith('3') ? 3 :
                   participation.startsWith('2') ? 2 :
                   participation.startsWith('1') ? 1 : 0);
    }, 0) / entries.length;

    // Process recent issues
    const recentIssues = entries
      .filter(entry => entry['GitHub Issue Title'] && entry['GitHub Issue URL'])
      .map(entry => {
        const title = entry['GitHub Issue Title'];
        const link = entry['GitHub Issue URL'];
        const description = entry['Describe your work with the tech partner'];
        return {
          title: Array.isArray(title) ? title[0] || '' : title || '',
          link: Array.isArray(link) ? link[0] : link,
          description: Array.isArray(description) ? description[0] || '' : description || ''
        };
      });

    return {
      name,
      githubUsername: entries[0]['Github Username'] || name.toLowerCase().replace(/\s+/g, '-'),
      email: emailStr || '',
      issuesCompleted,
      engagementScore,
      recentIssues
    };
  });
}




export function enhanceTechPartnerData(
  baseData: TechPartnerPerformance[] | undefined,
  engagementData: EngagementData[] | undefined
): EnhancedTechPartnerData[] {
  if (!baseData || !engagementData) {
    console.log('enhanceTechPartnerData: Missing data', { hasBaseData: !!baseData, hasEngagementData: !!engagementData });
    return [];
  }

  console.log('enhanceTechPartnerData: Processing', {
    baseDataCount: baseData.length,
    engagementDataCount: engagementData.length,
    sampleBaseData: baseData[0],
    sampleEngagementData: engagementData[0]
  });

  return baseData.map(partner => {
    if (!partner.partner) {
      console.log('enhanceTechPartnerData: Partner missing name', partner);
      return {
        ...partner,
        timeSeriesData: [],
        contributorDetails: [],
        issueTracking: [],
        mostActiveIssue: { title: '', url: '' },
        staleIssue: { title: '', url: '' }
      };
    }

    const partnerEngagements = engagementData.filter(
      entry => entry['Which Tech Partner'] &&
      (Array.isArray(entry['Which Tech Partner'])
        ? entry['Which Tech Partner'].includes(partner.partner)
        : (entry['Which Tech Partner'] as string)?.split(',').map((p: string) => p.trim()).includes(partner.partner)
      )
    );

    console.log(`enhanceTechPartnerData: Processing partner ${partner.partner}`, {
      engagementCount: partnerEngagements.length,
      sampleEngagement: partnerEngagements[0]
    });

    const timeSeriesData = processTimeSeriesData(partnerEngagements);
    const mostRecentIssue = timeSeriesData
      .flatMap(week => week.issues)
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())[0];

    const staleIssues = timeSeriesData
      .flatMap(week => week.issues)
      .filter(issue =>
        issue.status === 'open' &&
        new Date(issue.lastUpdated) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );

    const result: EnhancedTechPartnerData = {
      ...partner,
      timeSeriesData,
      contributorDetails: processContributorDetails(partnerEngagements),
      issueTracking: timeSeriesData.flatMap(week => week.issues.map(issue => ({
        title: issue.title,
        link: issue.url,
        status: issue.status,
        engagement: 0,
        week: week.week,
        contributor: issue.contributor
      }))),
      mostActiveIssue: mostRecentIssue
        ? { title: mostRecentIssue.title, url: mostRecentIssue.url }
        : { title: '', url: '' },
      staleIssue: staleIssues[0]
        ? { title: staleIssues[0].title, url: staleIssues[0].url }
        : { title: '', url: '' }
    };

    return result;
  });
}
