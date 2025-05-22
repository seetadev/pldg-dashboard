// lib/engagementDetection.ts
import { EngagementData } from "@/types/dashboard";
import { AlertThreshold, UserAlert } from "@/types/alert";
import { UserAlertSchema } from "@/types/alert";

export function detectEngagementDrop(
  users: EngagementData[],
  cohortId: string,
  currentWeek: string,
  threshold: AlertThreshold = {
    inactiveWeeks: 2,
    contributionDropPercentage: 30,
    contributorDropCount: 2,
  }
): UserAlert[] {
  const alerts: UserAlert[] = [];
  const currentWeekNum = parseInt(currentWeek.split(" ")[1]);

  // Group data by user
  const userDataMap = new Map<string, EngagementData[]>();
  users.forEach((user) => {
    if (!userDataMap.has(user.Name)) {
      userDataMap.set(user.Name, []);
    }
    userDataMap.get(user.Name)?.push(user);
  });

  // Analyze each user's engagement
  userDataMap.forEach((userEngagement, userName) => {
    const sortedEngagement = [...userEngagement].sort(
      (a, b) =>
        parseInt(a["Program Week"].split(" ")[1]) -
        parseInt(b["Program Week"].split(" ")[1])
    );

    const latestEngagement = sortedEngagement[sortedEngagement.length - 1];
    const latestWeek = latestEngagement["Program Week"];
    const latestWeekNum = parseInt(latestWeek.split(" ")[1]);
    const weeksInactive = currentWeekNum - latestWeekNum;

    if (weeksInactive >= threshold.inactiveWeeks) {
      const alert = UserAlertSchema.parse({
        userId: userName,
        userName,
        githubUsername: latestEngagement["Github Username"],
        cohortId,
        alertType: "inactivity",
        metric: "engagement",
        currentValue: 0,
        previousValue: 1, // Assuming they were active before
        percentageChange: -100,
        week: currentWeek,
        firstDetected: new Date().toISOString(),
        status: "new",
        // Add lastActiveWeek to the alert description
        description: `Inactive for ${weeksInactive} weeks (last active: ${latestWeek})`,
      });

      alerts.push(alert);
    }
  });

  return alerts;
}
