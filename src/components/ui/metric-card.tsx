"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  items: Array<{
    label: string;
    value: string | number;
  }>;
  className?: string;
}

export function MetricCard({ title, items, className }: MetricCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4 text-lg">{title}</h3>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
