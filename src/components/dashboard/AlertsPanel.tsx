// components/AlertsPanel.tsx
import { useAlertsStore } from "@/stores/alertsStore";
import { AlertItem } from "./AlertItem";

export function AlertsPanel() {
    const { alerts, updateAlertStatus } = useAlertsStore();
    const activeAlerts = alerts.filter(alert => alert.status !== "resolved");

    return (
        <div className="border rounded-lg p-4">
            <h2 className="text-xl font-bold mb-4">Engagement Alerts</h2>

            {activeAlerts.length === 0 ? (
                <p className="text-gray-500">No active alerts</p>
            ) : (
                <div className="space-y-3">
                    {activeAlerts.map((alert) => (
                        <AlertItem
                            key={alert.id}
                            alert={alert}
                            onAcknowledge={() => updateAlertStatus(alert.id, "acknowledged")}
                            onResolve={() => updateAlertStatus(alert.id, "resolved")}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}