'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { EngagementAlert, EngagementAlertSummary } from '@/types/dashboard';
import { ENGAGEMENT_ALERT_CONFIG } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

interface EngagementAlertsProps {
  alertSummary: EngagementAlertSummary;
  onResolveAlert?: (alertId: string, reason: string) => void;
  onDismissAlert?: (alertId: string) => void;
}

export function EngagementAlerts({ alertSummary, onResolveAlert, onDismissAlert }: EngagementAlertsProps) {
  const { alerts, criticalAlerts, warningAlerts } = alertSummary;
  const hasAlerts = alerts.length > 0;

  const getAlertDescription = (alert: EngagementAlert) => {
    if (alert.type === 'inactivity') {
      return `${alert.contributorName} has been inactive for ${alert.inactiveWeeks} weeks (last active: Week ${alert.lastActiveWeek})`;
    } else {
      return `${alert.contributorName}'s engagement dropped from level ${alert.previousEngagementLevel} to ${alert.currentEngagementLevel} in Week ${alert.lastActiveWeek}`;
    }
  };

  const getBadgeVariant = (severity: EngagementAlert['severity']): "default" | "secondary" | "destructive" | "outline" => {
    return severity === 'critical' ? 'destructive' : 'secondary';
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Engagement Alerts</h3>
        <div className="flex gap-2">
          {criticalAlerts > 0 && (
            <Badge variant="destructive">
              {criticalAlerts} Critical
            </Badge>
          )}
          {warningAlerts > 0 && (
            <Badge variant="secondary">
              {warningAlerts} Warning
            </Badge>
          )}
        </div>
      </div>

      {!hasAlerts ? (
        <p className="text-sm text-gray-500">No active alerts</p>
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, ENGAGEMENT_ALERT_CONFIG.maxDisplayAlerts).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${
                alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={getBadgeVariant(alert.severity)}
                      className="capitalize"
                    >
                      {alert.severity}
                    </Badge>
                    <span className="text-sm font-medium">
                      {alert.contributorName}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{getAlertDescription(alert)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Created {formatDistanceToNow(new Date(alert.createdAt))} ago
                  </p>
                </div>

                <div className="flex gap-2">
                  {onResolveAlert && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          Resolve
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <h4 className="font-medium">Resolve Alert</h4>
                          <textarea
                            className="w-full h-24 p-2 text-sm border rounded"
                            placeholder="Enter resolution reason..."
                            onChange={(e) => {
                              const reason = e.target.value;
                              if (reason.trim()) {
                                onResolveAlert(alert.id, reason);
                              }
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                  
                  {onDismissAlert && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismissAlert(alert.id)}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {alerts.length > ENGAGEMENT_ALERT_CONFIG.maxDisplayAlerts && (
            <p className="text-sm text-gray-500 text-center mt-2">
              Showing {ENGAGEMENT_ALERT_CONFIG.maxDisplayAlerts} of {alerts.length} alerts
            </p>
          )}
        </div>
      )}
    </Card>
  );
} 