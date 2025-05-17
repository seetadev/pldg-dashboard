"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { ProcessedData } from "@/types/dashboard";
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  GitPullRequest,
  Star,
  Target,
  Activity,
  ThumbsUp,
  HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { exportDashboardAction } from "@/lib/actions";
import { toast } from "../ui/use-toast";

interface Props {
  data: ProcessedData;
}

const METRIC_EXPLANATIONS = {
  weeklyChange:
    "Percentage change in total contributions compared to last week. Calculated from both GitHub and Airtable data.",
  activeContributors:
    "Number of unique contributors who submitted at least one contribution in the current week.",
  totalContributions:
    "Total number of issues, PRs, and technical contributions across all tech partners.",
  npsScore:
    "Net Promoter Score (range: -100 to 100) calculated from weekly engagement surveys.",
  engagementRate:
    "Percentage of contributors actively participating in program activities and submissions.",
  activeTechPartners:
    "Number of tech partners with at least one active contribution or engagement this week.",
};

export default function ExecutiveSummary({ data }: Props) {
  const [isExporting, setIsExporting] = React.useState(false);

  const insights = React.useMemo(
    () => ({
      weeklyChange: {
        issues: data.weeklyChange,
        contributors: data.activeContributors,
        partners: data.programHealth.activeTechPartners,
      },
      programHealth: {
        nps: data.programHealth.npsScore,
        engagementRate: data.programHealth.engagementRate,
        totalContributions: data.totalContributions,
      },
      keyHighlights: [
        `${data.activeContributors} active contributors across ${data.programHealth.activeTechPartners} tech partners`,
        `${data.feedbackSentiment.positive} positive feedback responses`,
        `${Math.abs(data.weeklyChange)}% ${data.weeklyChange >= 0 ? "increase" : "decrease"} in weekly contributions`,
      ],
    }),
    [data],
  );

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const result = await exportDashboardAction(data);

      if (result.success && result.data) {
        console.log("Export data received, creating blob...");

        try {
          const buffer = Buffer.from(result.data, "base64");
          if (buffer.length === 0) {
            throw new Error("Empty buffer received");
          }

          const blob = new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });

          if (blob.size === 0) {
            throw new Error("Empty blob created");
          }

          console.log("Blob created, initiating download...");

          // Create and trigger download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download =
            result.filename ||
            `PLDG_Dashboard_${new Date().toISOString().split("T")[0]}.xlsx`;

          // Append, click, and cleanup
          document.body.appendChild(a);
          a.click();

          // Cleanup with delay to ensure download starts
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          }, 100);

          toast({
            title: "Export successful",
            description: "Dashboard data has been downloaded.",
          });

          console.log("Download initiated successfully");
        } catch (blobError) {
          console.error("Blob creation/download failed:", blobError);
          throw new Error("Failed to create downloadable file");
        }
      } else {
        throw new Error(result.error || "Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to export dashboard data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>PLDG Cohort Performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Key metrics and program health indicators
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center xl:gap-2 max-lg:py-5 gap-2"
          >
            <Download
              className={`w-4 h-4 ${isExporting ? "animate-spin" : ""}`}
            />
            <p className='w-full  text-xs'>Export Report</p>


          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Weekly Performance Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Weekly Performance</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {insights.weeklyChange.issues >= 0 ? (
                    <TrendingUp className="text-green-500" size={20} />
                  ) : (
                    <TrendingDown className="text-red-500" size={20} />
                  )}
                  <span>{Math.abs(insights.weeklyChange.issues)}% WoW</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {METRIC_EXPLANATIONS.weeklyChange}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="text-blue-500" size={20} />
                <span>
                  {insights.weeklyChange.contributors} Active Contributors
                </span>
              </div>
              <div className="flex items-center gap-3">
                <GitPullRequest className="text-purple-500" size={20} />
                <span>
                  {insights.programHealth.totalContributions} Total
                  Contributions
                </span>
              </div>
            </div>
          </div>

          {/* Program Health Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Program Health</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Star className="text-yellow-500" size={20} />
                  <span>NPS Score: {insights.programHealth.nps}</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {METRIC_EXPLANATIONS.npsScore}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Activity className="text-green-500" size={20} />
                <span>
                  Engagement Rate: {insights.programHealth.engagementRate}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Target className="text-blue-500" size={20} />
                <span>
                  Active Tech Partners: {insights.weeklyChange.partners}
                </span>
              </div>
            </div>
          </div>

          {/* Key Highlights Section */}
          <div className="space-y-4">
            <h3 className="font-semibold">Key Highlights</h3>
            <div className="space-y-3">
              {insights.keyHighlights.map((highlight, index) => (
                <div key={index} className="flex items-center gap-3">
                  {index === 0 && <Users className="text-blue-500" size={20} />}
                  {index === 1 && (
                    <ThumbsUp className="text-green-500" size={20} />
                  )}
                  {index === 2 &&
                    (insights.weeklyChange.issues >= 0 ? (
                      <TrendingUp className="text-green-500" size={20} />
                    ) : (
                      <TrendingDown className="text-red-500" size={20} />
                    ))}
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
