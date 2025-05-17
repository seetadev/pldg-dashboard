import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";

interface ActionItem {
  type: "warning" | "success" | "opportunity";
  title: string;
  description: string;
  action: string;
}

export function ActionItems({ items }: { items: ActionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
        <CardDescription>Key areas requiring attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                item.type === "warning"
                  ? "bg-yellow-50 border-yellow-200"
                  : item.type === "success"
                    ? "bg-green-50 border-green-200"
                    : "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {item.type === "warning" && (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                )}
                {item.type === "success" && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {item.type === "opportunity" && (
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                )}
                <div>
                  <h4 className="font-medium mb-1">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.description}
                  </p>
                  <p className="text-sm font-medium">
                    Recommended Action: {item.action}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
