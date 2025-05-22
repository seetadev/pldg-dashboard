// services/engagementAnalyzer.ts
import { EngagementData } from "@/types/dashboard";
import {
  UserAlert,
  CohortAlert,
  AlertThreshold,
  CohortAlertSchema,
} from "@/types/alert";
import { UserAlertSchema } from "@/types/alert";

interface WeeklyMetrics {
  week: string;
  contributorCount: number;
  totalContributions: number;
  contributors: Record<string, number>; // user -> contributions
}

export class EngagementAnalyzer {
  private weeklyMetrics: WeeklyMetrics[] = [];
  private thresholds: AlertThreshold;

  constructor(
    private cohortId: string,
    private currentWeek: string,
    thresholds?: Partial<AlertThreshold>
  ) {
    this.thresholds = {
      inactiveWeeks: 2,
      contributionDropPercentage: 30,
      contributorDropCount: 2,
      ...thresholds,
    };
  }

  public analyze(data: EngagementData[]): {
    userAlerts: UserAlert[];
    cohortAlerts: CohortAlert[];
  } {
    this.calculateWeeklyMetrics(data);
    return {
      userAlerts: this.detectUserAlerts(),
      cohortAlerts: this.detectCohortAlerts(),
    };
  }

  private calculateWeeklyMetrics(data: EngagementData[]) {
    const weeklyMap = new Map<string, WeeklyMetrics>();

    data.forEach((entry) => {
      const week = entry["Program Week"];
      if (!weeklyMap.has(week)) {
        weeklyMap.set(week, {
          week,
          contributorCount: 0,
          totalContributions: 0,
          contributors: {},
        });
      }

      const weekData = weeklyMap.get(week)!;
      const contributions = this.countContributions(entry);

      if (contributions > 0) {
        if (!weekData.contributors[entry.Name]) {
          weekData.contributorCount++;
        }
        weekData.contributors[entry.Name] = contributions;
        weekData.totalContributions += contributions;
      }
    });

    this.weeklyMetrics = Array.from(weeklyMap.values()).sort((a, b) =>
      this.compareWeeks(a.week, b.week)
    );
  }

  private detectUserAlerts(): UserAlert[] {
    if (this.weeklyMetrics.length < 2) return [];

    const currentWeekIndex = this.weeklyMetrics.findIndex(
      (m) => m.week === this.currentWeek
    );
    if (currentWeekIndex < 1) return [];

    const currentWeek = this.weeklyMetrics[currentWeekIndex];
    const previousWeek = this.weeklyMetrics[currentWeekIndex - 1];

    const alerts: UserAlert[] = [];

    // Detect inactive users
    Object.keys(previousWeek.contributors).forEach((user) => {
      if (!currentWeek.contributors[user]) {
        alerts.push(
          UserAlertSchema.parse({
            userId: user,
            userName: user,
            cohortId: this.cohortId,
            alertType: "inactivity",
            metric: "contributions",
            currentValue: 0,
            previousValue: previousWeek.contributors[user],
            percentageChange: -100,
            week: this.currentWeek,
          })
        );
      }
    });

    // Detect contribution drops
    Object.keys(currentWeek.contributors).forEach((user) => {
      if (previousWeek.contributors[user]) {
        const prevContributions = previousWeek.contributors[user];
        const currentContributions = currentWeek.contributors[user];
        const dropPercentage =
          ((prevContributions - currentContributions) / prevContributions) *
          100;

        if (dropPercentage >= this.thresholds.contributionDropPercentage) {
          alerts.push(
            UserAlertSchema.parse({
              userId: user,
              userName: user,
              cohortId: this.cohortId,
              alertType: "contribution-drop",
              metric: "contributions",
              currentValue: currentContributions,
              previousValue: prevContributions,
              percentageChange: dropPercentage,
              week: this.currentWeek,
            })
          );
        }
      }
    });

    return alerts;
  }

  private detectCohortAlerts(): CohortAlert[] {
    if (this.weeklyMetrics.length < 2) return [];

    const currentWeekIndex = this.weeklyMetrics.findIndex(
      (m) => m.week === this.currentWeek
    );
    if (currentWeekIndex < 1) return [];

    const currentWeek = this.weeklyMetrics[currentWeekIndex];
    const previousWeek = this.weeklyMetrics[currentWeekIndex - 1];
    const alerts: CohortAlert[] = [];

    // Detect contributor drop
    const contributorDrop =
      previousWeek.contributorCount - currentWeek.contributorCount;
    if (contributorDrop >= this.thresholds.contributorDropCount) {
      const inactiveUsers = Object.keys(previousWeek.contributors).filter(
        (user) => !currentWeek.contributors[user]
      );

      alerts.push(
        CohortAlertSchema.parse({
          cohortId: this.cohortId,
          alertType: "contributor-drop",
          metric: "active_contributors",
          currentValue: currentWeek.contributorCount,
          previousValue: previousWeek.contributorCount,
          percentageChange:
            (contributorDrop / previousWeek.contributorCount) * 100,
          week: this.currentWeek,
          affectedUsers: inactiveUsers,
        })
      );
    }

    // Detect engagement drop
    const contributionDrop =
      previousWeek.totalContributions - currentWeek.totalContributions;
    const contributionDropPercentage =
      (contributionDrop / previousWeek.totalContributions) * 100;

    if (
      contributionDropPercentage >= this.thresholds.contributionDropPercentage
    ) {
      alerts.push(
        CohortAlertSchema.parse({
          cohortId: this.cohortId,
          alertType: "engagement-drop",
          metric: "total_contributions",
          currentValue: currentWeek.totalContributions,
          previousValue: previousWeek.totalContributions,
          percentageChange: contributionDropPercentage,
          week: this.currentWeek,
        })
      );
    }

    return alerts;
  }

  private countContributions(entry: EngagementData): number {
    let count = 0;

    // Count issues/PRs worked on
    for (let i = 1; i <= 3; i++) {
      if (entry[`Issue Title ${i}`] || entry[`Issue Link ${i}`]) {
        count++;
      }
    }

    // Count additional issues if specified
    const additionalIssues = parseInt(
      entry["How many issues, PRs, or projects this week?"] || "0"
    );
    if (!isNaN(additionalIssues)) {
      count += Math.max(0, additionalIssues - 3); // Subtract the 3 we already counted
    }

    return count;
  }

  private compareWeeks(a: string, b: string): number {
    const aNum = parseInt(a.replace("Week ", ""));
    const bNum = parseInt(b.replace("Week ", ""));
    return aNum - bNum;
  }
}
