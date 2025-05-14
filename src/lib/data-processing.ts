import _ from "lodash";
import {
  EngagementData, ProcessedData,
  TechPartnerPerformance, ActionItem,
  GitHubData, IssueMetrics, EngagementTrend
} from '@/types/dashboard';
import { CohortId } from '@/types/cohort';
import { getCohortDataPath, COHORT_DATA } from "@/types/cohort";

// This may be useful. leaving it commented out.
// interface WeeklyEngagementEntry {
//   Name: string;
//   "Github Username"?: string;
//   "Email Address"?: string;
//   "Program Week": string;
//   "Engagement Tracking"?: string;
//   "Engagement Participation "?: string;
//   "Tech Partner Collaboration?": string;
//   "Which Tech Partner": string | string[];
//   "Describe your work with the tech partner"?: string;
//   "Did you work on an issue, PR, or project this week?": string;
//   "How many issues, PRs, or projects this week?": string;
//   "Issue Title 1"?: string;
//   "Issue Link 1"?: string;
//   "Issue Title 2"?: string;
//   "Issue Link 2"?: string;
//   "Issue Title 3"?: string;
//   "Issue Link 3"?: string;
//   "How likely are you to recommend the PLDG to others?": string;
//   "PLDG Feedback"?: string;
// }

// ditto
// interface ContributorDetail {
//   name: string;
//   githubUsername: string;
//   issuesCompleted: number;
//   engagementScore: number;
//   techPartners: Set<string>;
//   weeks: Set<string>;
//   recentContributions: Array<{
//     issueTitle: string;
//     issueLink: string;
//     week: string;
//     partner: string;
//   }>;
// }

// ditto
// interface WeeklyData {
//   issueCount: number;
//   contributors: Set<string>;
//   issues: IssueEntry[];
//   engagementLevel: number;
// }

// type TechPartnerField = string | string[] | undefined;

// function isTechPartnerString(value: TechPartnerField): value is string {
//   return typeof value === "string";
// }

// // Add helper function to normalize tech partner data
// function normalizeTechPartners(techPartner: TechPartnerField): string[] {
//   if (Array.isArray(techPartner)) {
//     return techPartner.map((p: string) => p.trim()).filter(Boolean);
//   }
//   if (isTechPartnerString(techPartner)) {
//     return techPartner
//       .split(",")
//       .map((p: string) => p.trim())
//       .filter(Boolean);
//   }
//   return [];
// }

// Helper function to parse tech partners consistently
function parseTechPartners(techPartner: string | string[]): string[] {
  if (Array.isArray(techPartner)) {
    return techPartner;
  }
  return techPartner?.split(",").map((p) => p.trim()) ?? [];
}

function parseWeekNumber(week: string): number {
  const match = week.match(/Week (\d+):/i)
  if (!match) {
    console.warn(`Invalid week format: ${week}`)
    return 0
  }
  return parseInt(match[1])
}

function formatWeekString(week: string): string {
  const match = week.match(/Week \d+/i)
  return match ? match[0] : week
}
// Add helper function to safely handle string or string[] fields
function getStringValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value[0] || "" : value;
}

// Calculate NPS Score
function calculateNPSScore(data: EngagementData[]): number {
  const scores = data
    .map((entry) =>
      parseInt(
        getStringValue(
          entry["How likely are you to recommend the PLDG to others?"],
        ) || "0",
      ),
    )
    .filter((score) => score > 0);

  if (scores.length === 0) return 0;

  const promoters = scores.filter((score) => score >= 9).length;
  const detractors = scores.filter((score) => score <= 6).length;

  return Math.round(((promoters - detractors) / scores.length) * 100);
}

// Calculate Engagement Rate
function calculateEngagementRate(data: EngagementData[]): number {
  const totalEntries = data.length;
  if (totalEntries === 0) return 0;

  const activeEntries = data.filter(
    (entry) =>
      entry["Engagement Participation "]?.includes("3 -") ||
      entry["Engagement Participation "]?.includes("2 -"),
  ).length;

  return Math.round((activeEntries / totalEntries) * 100);
}

function calculateWeeklyChange(data: EngagementData[]): number {
  if (!data || data.length === 0) {
    console.log("No data available for weekly change calculation");
    return 0;
  }

  const weekGroups = data.reduce((groups, entry) => {
    const weekText = entry["Program Week"];
    if (!weekText) return groups;

    const weekNumber = parseWeekNumber(weekText);
    if (!weekNumber) return groups;

    if (!groups[weekNumber]) groups[weekNumber] = [];
    groups[weekNumber].push(entry);
    return groups;
  }, {} as Record<number, EngagementData[]>);

  const weekNumbers = Object.keys(weekGroups)
    .map(Number)
    .sort((a, b) => a - b);

  if (weekNumbers.length < 2) {
    console.log("Not enough weeks for comparison:", weekNumbers);
    return 0;
  }

  const currentWeekNum = weekNumbers[weekNumbers.length - 1];
  const previousWeekNum = weekNumbers[weekNumbers.length - 2];

  const currentWeek = weekGroups[currentWeekNum];
  const previousWeek = weekGroups[previousWeekNum];

  console.log(`Comparing Week ${currentWeekNum} (${currentWeek.length} entries) vs Week ${previousWeekNum} (${previousWeek.length} entries)`);

  const currentTotal = currentWeek.reduce((sum, entry) => {
    const value = parseInt(
      entry["How many issues, PRs, or projects this week?"] || "0",
    );
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  const previousTotal = previousWeek.reduce((sum, entry) => {
    const value = parseInt(
      entry["How many issues, PRs, or projects this week?"] || "0",
    );
    return sum + (isNaN(value) ? 0 : value);
  }, 0);

  console.log(`Totals: Current Week ${currentTotal}, Previous Week ${previousTotal}`);

  if (previousTotal === 0) return currentTotal > 0 ? 100 : 0;
  return Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
}

// Calculate Positive Feedback
function calculatePositiveFeedback(data: EngagementData[]): number {
  return data.filter((entry) => {
    const feedback = getStringValue(entry["PLDG Feedback"]);
    return (
      feedback.toLowerCase().includes("great") ||
      feedback.toLowerCase().includes("good")
    );
  }).length;
}

// Calculate Top Performers
function calculateTopPerformers(data: EngagementData[]) {
  return _(data)
    .groupBy("Github Username")
    .map((entries, name) => ({
      name,
      totalIssues: _.sumBy(entries, (e) => {
        const value = e["How many issues, PRs, or projects this week?"];
        return value === "4+" ? 4 : parseInt(value || "0");
      }),
      avgEngagement: _.meanBy(entries, (e) => {
        const participation = e["Engagement Participation "]?.trim() || "";
        return participation.startsWith("3")
          ? 3
          : participation.startsWith("2")
            ? 2
            : participation.startsWith("1")
              ? 1
              : 0;
      }),
    }))
    .orderBy(["totalIssues", "avgEngagement"], ["desc", "desc"])
    .value();
}

// Calculate Tech Partner Metrics
function calculateTechPartnerMetrics(data: EngagementData[]) {
  return _(data)
    .groupBy("Which Tech Partner")
    .map((items, partner) => ({
      partner,
      totalIssues: _.sumBy(items, (item) => {
        const value = item["How many issues, PRs, or projects this week?"];
        return value === "4+" ? 4 : parseInt(value || "0");
      }),
      activeContributors: new Set(items.map((item) => item.Name)).size,
      avgIssuesPerContributor: 0,
      collaborationScore: 0,
    }))
    .value();
}

// although, unused, this may be useful in the future so i'm leaving it commented
// function calculateTechPartnerPerformance(
//   data: EngagementData[] | WeeklyEngagementEntry[],
// ): TechPartnerPerformance[] {
//   // Type guard to check if we're working with WeeklyEngagementEntry
//   const isWeeklyEntry = (
//     entry: EngagementData | WeeklyEngagementEntry,
//   ): entry is WeeklyEngagementEntry => {
//     return "Name" in entry && "Program Week" in entry;
//   };

//   // First, process all entries by contributor
//   const contributorMap = new Map<string, ContributorDetail>();

//   data.forEach((entry) => {
//     if (entry["Tech Partner Collaboration?"] !== "Yes") return;

//     const name = isWeeklyEntry(entry) ? entry.Name : entry.Name;
//     const githubUsername = isWeeklyEntry(entry)
//       ? entry["Github Username"]
//       : entry["Github Username"];

//     const key = `${name}-${githubUsername}`;
//     if (!contributorMap.has(key)) {
//       contributorMap.set(key, {
//         name,
//         githubUsername: githubUsername || "",
//         issuesCompleted: 0,
//         engagementScore: 0,
//         techPartners: new Set(),
//         weeks: new Set(),
//         recentContributions: [],
//       });
//     }

//     const contributor = contributorMap.get(key)!;
//     const partners = normalizeTechPartners(entry["Which Tech Partner"]);

//     // Add week and partners
//     contributor.weeks.add(entry["Program Week"]);
//     partners.forEach((p) => contributor.techPartners.add(p));

//     // Process all issues for this entry
//     const processIssue = (
//       title: string | string[] | undefined,
//       link: string | string[] | undefined,
//     ) => {
//       const titleStr = Array.isArray(title) ? title[0] : title;
//       const linkStr = Array.isArray(link) ? link[0] : link;

//       if (titleStr && linkStr) {
//         partners.forEach((partner) => {
//           contributor.recentContributions.push({
//             issueTitle: titleStr,
//             issueLink: linkStr,
//             week: entry["Program Week"],
//             partner,
//           });
//         });
//       }
//     };

//     processIssue(entry["Issue Title 1"], entry["Issue Link 1"]);
//     processIssue(entry["Issue Title 2"], entry["Issue Link 2"]);
//     processIssue(entry["Issue Title 3"], entry["Issue Link 3"]);

//     // Update metrics
//     const issueCount =
//       entry["How many issues, PRs, or projects this week?"] === "4+"
//         ? 4
//         : parseInt(
//             entry["How many issues, PRs, or projects this week?"] || "0",
//           );

//     contributor.issuesCompleted += issueCount;

//     const engagement = entry["Engagement Participation "]?.includes("3 -")
//       ? 3
//       : entry["Engagement Participation "]?.includes("2 -")
//         ? 2
//         : entry["Engagement Participation "]?.includes("1 -")
//           ? 1
//           : 0;
//     contributor.engagementScore = Math.max(
//       contributor.engagementScore,
//       engagement,
//     );
//   });

//   // Now group by tech partner
//   const partnerMap = new Map<
//     string,
//     {
//       weeklyData: Map<string, WeeklyData>;
//       contributors: ContributorDetail[];
//     }
//   >();

//   // Process contributor data into partner structure
//   Array.from(contributorMap.values()).forEach((contributor) => {
//     contributor.techPartners.forEach((partner) => {
//       if (!partnerMap.has(partner)) {
//         partnerMap.set(partner, {
//           weeklyData: new Map(),
//           contributors: [],
//         });
//       }

//       const partnerData = partnerMap.get(partner)!;
//       partnerData.contributors.push(contributor);

//       // Add weekly data
//       contributor.weeks.forEach((week) => {
//         if (!partnerData.weeklyData.has(week)) {
//           partnerData.weeklyData.set(week, {
//             issueCount: 0,
//             contributors: new Set(),
//             issues: [],
//             engagementLevel: 0,
//           });
//         }

//         const weekData = partnerData.weeklyData.get(week)!;
//         weekData.contributors.add(contributor.name);

//         // Add relevant issues
//         const weekIssues = contributor.recentContributions
//           .filter((c) => c.week === week && c.partner === partner)
//           .map((issue) => ({
//             title: issue.issueTitle,
//             url: issue.issueLink,
//             status: "open",
//             lastUpdated: new Date().toISOString(),
//             partner,
//             contributor: contributor.name,
//             week,
//           }));

//         weekData.issues.push(...weekIssues);
//         weekData.issueCount += weekIssues.length;
//         weekData.engagementLevel = Math.max(
//           weekData.engagementLevel,
//           contributor.engagementScore,
//         );
//       });
//     });
//   });

//   // Convert to final TechPartnerPerformance format
//   return Array.from(partnerMap.entries()).map(([partner, data]) => ({
//     partner,
//     timeSeriesData: Array.from(data.weeklyData.entries())
//       .sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]))
//       .map(([week, weekData]) => ({
//         week,
//         weekEndDate: new Date().toISOString(),
//         issueCount: weekData.issueCount,
//         contributors: Array.from(weekData.contributors),
//         engagementLevel: 0,
//         issues: weekData.issues.map((issue) => ({
//           title: issue.title,
//           url: issue.url,
//           status: "open",
//           lastUpdated: new Date().toISOString(),
//           contributor: issue.contributor, // Add contributor field
//         })),
//       })),
//     contributorDetails: data.contributors.map((c) => ({
//       name: c.name,
//       githubUsername: c.githubUsername,
//       issuesCompleted: c.issuesCompleted,
//       engagementScore: c.engagementScore,
//     })),
//     issues: data.contributors.reduce((sum, c) => sum + c.issuesCompleted, 0),
//   }));
// }

// Calculate Action Items
function calculateActionItems(data: EngagementData[]): ActionItem[] {
  const actionItems: ActionItem[] = [];

  // Check for engagement drops
  const weeklyEngagement = Object.entries(_.groupBy(data, "Program Week"))
    .map(([week, entries]) => ({
      week,
      highEngagement: entries.filter((e) =>
        e["Engagement Participation "]?.includes("3 -"),
      ).length,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  if (weeklyEngagement.length >= 2) {
    const lastTwo = weeklyEngagement.slice(-2);
    if (lastTwo[1].highEngagement < lastTwo[0].highEngagement) {
      actionItems.push({
        type: "warning",
        title: "Engagement Drop Detected",
        description: "High engagement decreased from last week",
        action: "Review recent program changes and gather feedback",
      });
    }
  }

  // Process tech partners
  const techPartners = new Set(
    data.flatMap((entry) => parseTechPartners(entry["Which Tech Partner"])),
  );

  const activeTechPartners = new Set(
    data
      .filter((e) => e["Tech Partner Collaboration?"] === "Yes")
      .flatMap((entry) => parseTechPartners(entry["Which Tech Partner"])),
  );

  // Fix Set iteration by converting to Array first
  const inactivePartners = Array.from(techPartners).filter(
    (partner) => !activeTechPartners.has(partner),
  );

  if (inactivePartners.length > 0) {
    actionItems.push({
      type: "opportunity",
      title: "Partner Engagement Opportunity",
      description: `${inactivePartners.length} tech partners need attention`,
      action: "Schedule check-ins with inactive partners",
    });
  }

  return actionItems;
}

// Process Raw Issue Metrics
function processRawIssueMetrics(entries: EngagementData[]): IssueMetrics[] {
  const weeklyMetrics = _.groupBy(entries, "Program Week");

  return Object.entries(weeklyMetrics).map(([week, weekEntries]) => {
    const totalIssues = weekEntries.reduce((sum, entry) => {
      const value = entry["How many issues, PRs, or projects this week?"];
      return sum + (value === "4+" ? 4 : parseInt(value || "0"));
    }, 0);

    const hasGitHubLink = weekEntries.some((entry) => entry["Issue Link 1"]);
    const closedIssues = hasGitHubLink
      ? weekEntries.filter((entry) => entry["Issue Link 1"]?.includes("closed"))
          .length
      : Math.round(totalIssues * 0.7);

    return {
      week: week.replace(/\(.*?\)/, "").trim(),
      open: totalIssues - closedIssues,
      closed: closedIssues,
      total: totalIssues,
    };
  });
}

type TechPartner = string;

/* eslint-disable @typescript-eslint/no-explicit-any */
function processCSVData(csvData: any[]): TechPartnerPerformance[] {
  const partnerData = new Map<
    TechPartner,
    {
      weeklyData: Map<
        string,
        {
          issues: any[];
          contributors: Set<string>;
          issueCount: number;
          engagementLevel: number;
        }
      >;
      contributors: Map<
        string,
        {
          issuesCompleted: number;
          engagementScore: number;
          githubUsername: string;
        }
      >;
    }
  >();

  csvData.forEach((row) => {
    if (row["Tech Partner Collaboration?"] !== "Yes") return;

    // Handle multiple tech partners
    const partners: TechPartner[] = (row["Which Tech Partner"] || "")
      .toString()
      .split(",")
      .map((p: string): string => p.trim())
      .filter(Boolean);

    partners.forEach((partner: TechPartner) => {
      if (!partnerData.has(partner)) {
        partnerData.set(partner, {
          weeklyData: new Map(),
          contributors: new Map(),
        });
      }

      const data = partnerData.get(partner)!;
      // Keep the original week format from CSV
      const week = row["Program Week"];

      if (!data.weeklyData.has(week)) {
        data.weeklyData.set(week, {
          issues: [],
          contributors: new Set(),
          issueCount: 0,
          engagementLevel: 0,
        });
      }

      const weekData = data.weeklyData.get(week)!;
      weekData.contributors.add(row.Name);

      // Process issues
      const issueCount =
        row["How many issues, PRs, or projects this week?"] === "4+"
          ? 4
          : parseInt(
              row["How many issues, PRs, or projects this week?"] || "0",
            );
      weekData.issueCount += issueCount;

      // Add specific issues
      for (let i = 1; i <= 3; i++) {
        const title = row[`Issue Title ${i}`];
        const url = row[`Issue Link ${i}`];
        if (title && url) {
          weekData.issues.push({
            title,
            url,
            status: "open",
            lastUpdated: new Date().toISOString(),
            contributor: row.Name,
          });
        }
      }

      // Update contributor data
      if (!data.contributors.has(row.Name)) {
        data.contributors.set(row.Name, {
          issuesCompleted: 0,
          engagementScore: 0,
          githubUsername: row["Github Username"] || "",
        });
      }

      const contributor = data.contributors.get(row.Name)!;
      contributor.issuesCompleted += issueCount;

      const engagement = row["Engagement Participation "]?.includes("3 -")
        ? 3
        : row["Engagement Participation "]?.includes("2 -")
          ? 2
          : row["Engagement Participation "]?.includes("1 -")
            ? 1
            : 0;
      contributor.engagementScore = Math.max(
        contributor.engagementScore,
        engagement,
      );
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
        issues: weekData.issues,
      })),
    contributorDetails: Array.from(data.contributors.entries()).map(
      ([name, details]) => ({
        name,
        githubUsername: details.githubUsername,
        issuesCompleted: details.issuesCompleted,
        engagementScore: details.engagementScore,
      }),
    ),
    issues: Array.from(data.contributors.values()).reduce(
      (sum, c) => sum + c.issuesCompleted,
      0,
    ),
  }));
  return result;
}

// Add the missing calculateTotalContributions function
/* eslint-disable @typescript-eslint/no-explicit-any */
function calculateTotalContributions(csvData: any[]): number {
  return csvData.reduce((sum, row) => {
    const count = row["How many issues, PRs, or projects this week?"];
    return sum + (count === "4+" ? 4 : parseInt(count || "0"));
  }, 0);
}

// Update the processData function to return all required ProcessedData fields
/* eslint-disable @typescript-eslint/no-explicit-any */
export function processData(
  csvData: any[],
  githubData?: GitHubData | null,
  cohortId?: CohortId,
): ProcessedData {
  const techPartnerPerformance = processCSVData(csvData);
  // Calculate core metrics with validation
  const activeContributors = new Set(
    csvData
      .filter((row) => row["Github Username"])
      .map((row) => row["Github Username"]),
  ).size;
  const totalContributions = calculateTotalContributions(csvData);

  // Calculate tech partners
  const techPartners = new Set(
    csvData.flatMap((row) =>
      (row["Which Tech Partner"] || "")
        .toString()
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean),
    ),
  );

  // Add cohort metadata to processed data
  const cohortInfo = cohortId ? COHORT_DATA[cohortId] : null;

  console.log('Cohort Info:', cohortInfo);

  // const cohortDataFiltered = cohortId && cohortInfo ? csvData.filter(row => {
  //   const programWeek = row['Program Week'];
  //   if (!programWeek) return false;
  
  //   let parsedStartDate: Date | null = null;
  
  //   if (cohortId === '1') {
  //     // Format: "Week 2 (October 7 - October 11, 2024)"
  //     const matchCohort1 = programWeek.match(/\(([^)]+)\)/)?.[1]; // Extract "October 7 - October 11, 2024"
  //     if (matchCohort1) {
  //       const [startPart] = matchCohort1.split('-'); // "October 7"
  //       const cleanedStart = startPart.trim().replace(/(st|nd|rd|th)/g, ''); // Remove ordinal suffixes
  //       const yearMatch = matchCohort1.match(/\d{4}/);
  //       const year = yearMatch ? yearMatch[0] : new Date(cohortInfo.startDate).getFullYear();
  //       parsedStartDate = new Date(`${cleanedStart}, ${year}`);
  //     }
  //   } else {
  //     // Format: "Week 2: January 20, 2025 (Monday) – January 26, 2025 (Sunday)"
  //     const matchCohort2 = programWeek.match(/:\s*([A-Za-z]+\s\d{1,2},\s\d{4})/); // Extract "January 20, 2025"
  //     if (matchCohort2) {
  //       parsedStartDate = new Date(matchCohort2[1].trim());
  //     }
  //   }
  
  //   if (!parsedStartDate || isNaN(parsedStartDate.getTime())) return false;
  
  //   const cohortStart = new Date(cohortInfo.startDate);
  //   const cohortEnd = new Date(cohortInfo.endDate);
  
  //   return parsedStartDate >= cohortStart && parsedStartDate <= cohortEnd;
  // }) : csvData;
  
  
  return {
    weeklyChange: calculateWeeklyChange(csvData),
    activeContributors,
    totalContributions,
    programHealth: {
      npsScore: calculateNPSScore(csvData),
      engagementRate: calculateEngagementRate(csvData),
      activeTechPartners: techPartners.size,
    },
    keyHighlights: {
      activeContributorsAcrossTechPartners: `${activeContributors} across ${techPartners.size}`,
      totalContributions: `${totalContributions} total`,
      positiveFeedback: `${calculatePositiveFeedback(csvData)} positive`,
      weeklyContributions: `${calculateWeeklyChange(csvData)}% change`,
    },
    topPerformers: calculateTopPerformers(csvData),
    techPartnerMetrics: calculateTechPartnerMetrics(csvData),
    techPartnerPerformance,
    engagementTrends: calculateEngagementTrends(csvData),
    technicalProgress: calculateTechnicalProgress(
      csvData,
      githubData,
    ),
    issueMetrics: processRawIssueMetrics(csvData),
    actionItems: calculateActionItems(csvData),
    feedbackSentiment: {
      positive: calculatePositiveFeedback(csvData),
      neutral: 0,
      negative: 0,
    },
    contributorGrowth: [
      {
        week: new Date().toISOString().split("T")[0],
        newContributors: activeContributors,
        returningContributors: 0,
        totalActive: activeContributors,
      },
    ],
    rawEngagementData: csvData,
    cohortId: cohortId || "",
    cohortInfo: cohortInfo
      ? {
          id: cohortInfo.id,
          name: cohortInfo.name,
          startDate: cohortInfo.startDate,
          endDate: cohortInfo.endDate,
          description: cohortInfo.description,
        }
      : null,
  };
}

// Add helper functions for the new calculations
function calculateEngagementTrends(csvData: any[]): EngagementTrend[] {
  // First, get all unique weeks and sort them
  const allWeeks = Array.from(
    new Set(csvData.map((row) => row["Program Week"])),
  ).sort((a, b) => parseWeekNumber(a) - parseWeekNumber(b));

  // Create a map of week data
  const weeklyData = _.groupBy(csvData, "Program Week");

  // Process each week
  return allWeeks.map((week) => {
    const entries = weeklyData[week] || [];

    // Count unique contributors for this week
    const activeContributors = new Set(entries.map((e) => e["Github Username"]))
      .size;

    return {
      week: `Week ${parseWeekNumber(week)}`,
      total: activeContributors,
      // Add zero values for backward compatibility
      "High Engagement": 0,
      "Medium Engagement": 0,
      "Low Engagement": 0,
    };
  });
}

function calculateTechnicalProgress(
  csvData: any[],
  githubData?: GitHubData | null,
) {
  return Object.entries(_.groupBy(csvData, "Program Week"))
    .sort((a, b) => parseWeekNumber(a[0]) - parseWeekNumber(b[0]))
    .map(([week, entries]) => ({
      week: formatWeekString(week),
      "Total Issues": entries.reduce(
        (sum, entry) =>
          sum +
          parseInt(
            entry["How many issues, PRs, or projects this week?"] || "0",
          ),
        0,
      ),
      "In Progress": githubData?.statusGroups?.inProgress || 0,
      Done: githubData?.statusGroups?.done || 0,
    }));
}

// interface ContributorDetail {
//   name: string;
//   githubUsername: string;
//   issuesCompleted: number;
//   engagementScore: number;
//   techPartners: Set<string>;
//   weeks: Set<string>;
//   recentContributions: Array<{
//     issueTitle: string;
//     issueLink: string;
//     week: string;
//     partner: string;
//   }>;
// }

// function processContributorData(
//   csvData: Array<{
//     Name: string;
//     "Github Username": string;
//     "Program Week": string;
//     "How many issues, PRs, or projects this week?": string;
//     "Engagement Participation "?: string;
//     "Issue Title 1"?: string;
//     "Issue Link 1"?: string;
//     "Issue Title 2"?: string;
//     "Issue Link 2"?: string;
//     "Issue Title 3"?: string;
//     "Issue Link 3"?: string;
//     "Which Tech Partner"?: string;
//   }>,
// ): ContributorDetail[] {
//   const contributorMap = new Map<string, ContributorDetail>();

//   csvData.forEach((row) => {
//     const key = `${row.Name}-${row["Github Username"]}`;

//     if (!contributorMap.has(key)) {
//       contributorMap.set(key, {
//         name: row.Name,
//         githubUsername: row["Github Username"],
//         issuesCompleted: 0,
//         engagementScore: 0,
//         techPartners: new Set(),
//         weeks: new Set(),
//         recentContributions: [],
//       });
//     }

//     const contributor = contributorMap.get(key)!;
//     const partners = row["Which Tech Partner"]
//       ?.split(",")
//       .map((p) => p.trim()) || [""];

//     contributor.weeks.add(row["Program Week"]);
//     partners.forEach((partner) => {
//       if (partner) contributor.techPartners.add(partner);
//     });

//     // Add contributions with partner info
//     if (row["Issue Title 1"] && row["Issue Link 1"]) {
//       partners.forEach((partner) => {
//         contributor.recentContributions.push({
//           issueTitle: row["Issue Title 1"]!,
//           issueLink: row["Issue Link 1"]!,
//           week: row["Program Week"],
//           partner: partner || "Unknown",
//         });
//       });
//     }

//     // Similar updates for Issue 2 and 3...
//     if (row["Issue Title 2"] && row["Issue Link 2"]) {
//       partners.forEach((partner) => {
//         contributor.recentContributions.push({
//           issueTitle: row["Issue Title 2"]!,
//           issueLink: row["Issue Link 2"]!,
//           week: row["Program Week"],
//           partner: partner || "Unknown",
//         });
//       });
//     }

//     if (row["Issue Title 3"] && row["Issue Link 3"]) {
//       partners.forEach((partner) => {
//         contributor.recentContributions.push({
//           issueTitle: row["Issue Title 3"]!,
//           issueLink: row["Issue Link 3"]!,
//           week: row["Program Week"],
//           partner: partner || "Unknown",
//         });
//       });
//     }

//     // Update metrics
//     const issueCount = row["How many issues, PRs, or projects this week?"];
//     contributor.issuesCompleted +=
//       issueCount === "4+" ? 4 : parseInt(issueCount || "0");

//     const engagement = row["Engagement Participation "]?.includes("3 -")
//       ? 3
//       : row["Engagement Participation "]?.includes("2 -")
//         ? 2
//         : row["Engagement Participation "]?.includes("1 -")
//           ? 1
//           : 0;
//     contributor.engagementScore = Math.max(
//       contributor.engagementScore,
//       engagement,
//     );
//   });

//   return Array.from(contributorMap.values());
// }

export async function loadCohortData(cohortId: CohortId) {
  try {
    const path = getCohortDataPath(cohortId);
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch CSV for cohort ${cohortId}: ${response.statusText}`,
      );
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error(`Error loading cohort ${cohortId} data:`, error);
    throw error;
  }
}
