// components/AlertItem.tsx
import { UserAlert } from "@/types/alert";

interface AlertItemProps {
    alert: UserAlert;
    onAcknowledge: () => void;
    onResolve: () => void;
}

export function AlertItem({ alert, onAcknowledge, onResolve }: AlertItemProps) {
    return (
        <div className="border p-4 rounded-lg mb-3">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-medium">{alert.userName}</h3>
                    <p className="text-sm text-gray-600">
                        Alert type: {alert.alertType}
                    </p>
                    {alert.githubUsername && (
                        <p className="text-sm text-gray-500">GitHub: {alert.githubUsername}</p>
                    )}
                </div>
                <span className={`px-2 py-1 rounded text-xs ${alert.status === "new" ? "bg-red-100 text-red-800" :
                    alert.status === "acknowledged" ? "bg-yellow-100 text-yellow-800" :
                        "bg-green-100 text-green-800"
                    }`}>
                    {alert.status}
                </span>
            </div>
            <div className="flex gap-2 mt-3">
                {alert.status === "new" && (
                    <button
                        onClick={onAcknowledge}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                        Acknowledge
                    </button>
                )}
                <button
                    onClick={onResolve}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                    Resolve
                </button>
            </div>
        </div>
    );
}