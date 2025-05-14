import { Button } from "@/components/ui/button";
import { Download, Mail, Calendar } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex gap-3 mb-6">
      <Button variant="outline" className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export Report
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Mail className="w-4 h-4" />
        Share Insights
      </Button>
      <Button variant="outline" className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Schedule Review
      </Button>
    </div>
  );
}
