// stores/alertsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserAlert, AlertThresholdSchema, AlertThreshold } from "@/types/alert";

interface AlertsState {
  alerts: UserAlert[];
  thresholds: {
    inactiveWeeks: number;
    engagementDropPercentage?: number;
  };
  addAlert: (alert: UserAlert) => void;
  updateAlertStatus: (userId: string, status: UserAlert["status"]) => void;
  setThresholds: (thresholds: Partial<AlertThreshold>) => void;
  clearResolvedAlerts: () => void;
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set) => ({
      alerts: [],
      thresholds: {
        inactiveWeeks: 2,
        engagementDropPercentage: 50,
      },
      addAlert: (alert) =>
        set((state) => {
          // Prevent duplicates
          const exists = state.alerts.some(
            (a) => a.userId === alert.userId && a.status !== "resolved"
          );
          return exists ? state : { alerts: [...state.alerts, alert] };
        }),
      updateAlertStatus: (userId, status) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.userId === userId ? { ...alert, status } : alert
          ),
        })),
      setThresholds: (thresholds) =>
        set((state) => ({
          thresholds: AlertThresholdSchema.parse({
            ...state.thresholds,
            ...thresholds,
          }),
        })),
      clearResolvedAlerts: () =>
        set((state) => ({
          alerts: state.alerts.filter((alert) => alert.status !== "resolved"),
        })),
    }),
    {
      name: "alerts-storage",
    }
  )
);
