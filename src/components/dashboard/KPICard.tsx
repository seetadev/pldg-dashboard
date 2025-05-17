import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  status?: "positive" | "neutral" | "negative";
  description?: string;
}

export function KPICard({
  title,
  value,
  trend,
  status = "neutral",
  description,
}: KPICardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {trend !== undefined && (
          <span
            className={cn(
              "text-sm font-medium",
              status === "positive" && "text-green-600",
              status === "negative" && "text-red-600",
              status === "neutral" && "text-blue-600"
            )}
          >
            {trend > 0 ? "+" : ""}
            {trend}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
