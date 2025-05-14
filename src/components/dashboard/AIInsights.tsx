"use client";

import * as React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import { Brain } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { EnhancedProcessedData } from "@/types/dashboard";

const METRIC_EXPLANATIONS = {
  engagementScore:
    "Overall community engagement based on participation, NPS, and contribution metrics",
  technicalProgress:
    "Technical advancement measured through issue completion and partner diversity",
  collaborationIndex:
    "Level of cross-partner collaboration and community growth",
};

interface MetricCardProps {
  title: string;
  value: number;
  explanation: string;
}

function MetricCard({ title, value, explanation }: MetricCardProps) {
  return (
    <div className="p-4 border rounded-lg">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground capitalize">
              {title.replace(/([A-Z])/g, " $1").trim()}
            </h4>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          {explanation}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export default function AIInsights({ data }: { data: EnhancedProcessedData }) {
  if (!data.insights) {
    return null;
  }

  const { metrics, achievements, areasOfConcern, recommendations } =
    data.insights;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Analysis</CardTitle>
            <CardDescription>Performance Metrics & Insights</CardDescription>
          </div>
          <Brain className="w-5 h-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(metrics).map(([key, value]) => (
            <MetricCard
              key={key}
              title={key}
              value={value}
              explanation={
                METRIC_EXPLANATIONS[key as keyof typeof METRIC_EXPLANATIONS]
              }
            />
          ))}
        </div>

        {achievements.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Key Achievements</h4>
            <ul className="list-disc pl-5 space-y-1">
              {achievements.map((achievement, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {areasOfConcern.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Areas of Focus</h4>
            <ul className="list-disc pl-5 space-y-1">
              {areasOfConcern.map((concern, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {recommendations.map((recommendation, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
