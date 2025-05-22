// components/AlertSettings.tsx
import { useAlertsStore } from "@/stores/alertsStore";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { AlertThresholdSchema } from "@/types/alert";

export function AlertSettings() {
    const { thresholds, setThresholds } = useAlertsStore();

    return (
        <div className="space-y-4">
            <div>
                <Label htmlFor="inactiveWeeks">Weeks Before Alert</Label>
                <Input
                    id="inactiveWeeks"
                    type="number"
                    min="1"
                    value={thresholds.inactiveWeeks}
                    onChange={(e) =>
                        setThresholds({ inactiveWeeks: parseInt(e.target.value) || 2 })
                    }
                />
            </div>
            <div>
                <Label htmlFor="dropPercentage">Engagement Drop % Threshold</Label>
                <Input
                    id="dropPercentage"
                    type="number"
                    min="0"
                    max="100"
                    value={thresholds.engagementDropPercentage}
                    onChange={(e) =>
                        setThresholds({ engagementDropPercentage: parseInt(e.target.value) || 50 })
                    }
                />
            </div>
        </div>
    );
}