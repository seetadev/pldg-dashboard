import { Button } from "@/components/ui/button";
import { Download, Mail, Calendar } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex gap-3 mb-6" role="group" aria-label="Quick actions">
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        aria-label="Export report as CSV or PDF"
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        Export Report
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        aria-label="Share dashboard insights via email"
      >
        <Mail className="w-4 h-4" aria-hidden="true" />
        Share Insights
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        aria-label="Schedule a review meeting"
      >
        <Calendar className="w-4 h-4" aria-hidden="true" />
        Schedule Review
      </Button>
    </div>
  );
} 