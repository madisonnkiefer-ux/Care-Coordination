import { AlertTriangle, AlertCircle } from "lucide-react";

export function AlertBanner({ alerts }: { alerts: { text: string; level: "high" | "warning" }[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-b border-stone-200 bg-stone-50 px-8 py-3">
      {alerts.map((alert, i) => {
        const Icon = alert.level === "high" ? AlertCircle : AlertTriangle;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              alert.level === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {alert.text}
          </span>
        );
      })}
    </div>
  );
}
