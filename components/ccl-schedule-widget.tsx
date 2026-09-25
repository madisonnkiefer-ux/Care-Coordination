"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, ChevronUp } from "lucide-react";
import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { nextCclTask } from "@/lib/ccl-cadence";
import type { CclScheduleData } from "@/lib/data/ccl-schedule";
import type { CclTaskStatus } from "@/lib/ccl-cadence";

const STATUS_BADGE: Record<CclTaskStatus, { label: string; color: "green" | "red" | "slate" }> = {
  completed: { label: "Completed", color: "green" },
  overdue: { label: "Overdue", color: "red" },
  upcoming: { label: "Upcoming", color: "slate" },
};

const TYPE_LABELS: Record<string, string> = {
  quarterly_call: "Quarterly Telephone Contact",
  biannual_visit: "Bi-Annual In-Person Visit",
  cna_schedule: "CNA Scheduling",
  cna_complete: "CNA Completion",
};

// Compact "what's next" summary for a CCL1/CCL2 member's BCBSNM tasking
// schedule, shown on the main chart. This is the ONLY place the tasking
// tool appears — it no longer opens into a Care Plan tab, so the full
// task-by-task breakdown lives right here behind an inline expand toggle.
export function CclScheduleWidget({ data }: { data: CclScheduleData }) {
  const [expanded, setExpanded] = useState(false);

  if (!data.anchorDate || !data.tasks) {
    return (
      <Card className="border-2 border-amber-300 bg-amber-50" title={`${data.cclLevel} Schedule`}>
        <p className="text-sm text-amber-900">
          No completed CNA on file yet — the {data.cclLevel} task schedule can&apos;t be calculated until this
          member&apos;s Initial CNA is completed.
        </p>
      </Card>
    );
  }

  const next = nextCclTask(data.tasks);
  const overdue = next?.status === "overdue";

  const theme = !next
    ? { border: "border-emerald-300", bg: "bg-emerald-50", iconBg: "bg-emerald-500", text: "text-emerald-800", strong: "text-emerald-900", link: "text-emerald-700" }
    : overdue
      ? { border: "border-red-300", bg: "bg-red-50", iconBg: "bg-red-500", text: "text-red-700", strong: "text-red-800", link: "text-red-700" }
      : { border: "border-amber-300", bg: "bg-amber-50", iconBg: "bg-amber-500", text: "text-amber-800", strong: "text-amber-900", link: "text-amber-800" };

  return (
    <Card
      className={`border-2 ${theme.border} ${theme.bg}`}
      title={`${data.cclLevel} Schedule`}
      action={
        next ? (
          <span className={`flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold ${theme.text}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${theme.iconBg}`}>
              <CalendarClock className="h-3 w-3 text-white" />
            </span>
            {overdue ? "Overdue" : `Due by ${formatDate(next.completeNoLaterThan)}`}
          </span>
        ) : (
          <span className={`flex items-center gap-1.5 rounded-full bg-white/60 px-2.5 py-1 text-xs font-semibold ${theme.text}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full ${theme.iconBg}`}>
              <CalendarClock className="h-3 w-3 text-white" />
            </span>
            All caught up
          </span>
        )
      }
    >
      <p className={`mb-2 text-sm font-medium ${theme.strong}`}>
        {next ? (
          <>
            Next up: {next.label}
            {overdue && ` — was due ${formatDate(next.completeNoLaterThan)}`}
          </>
        ) : (
          "Every task in the current cycle is complete."
        )}
      </p>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={`flex items-center gap-1 text-xs font-semibold underline ${theme.link}`}
      >
        {expanded ? "Hide full schedule" : "View full schedule"}
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <p className={`text-xs ${theme.text}`}>
            Anchor date (most recent completed CNA): <span className="font-medium">{formatDate(data.anchorDate)}</span>
          </p>
          <div className="overflow-hidden rounded-xl border border-white/70 bg-white/60">
            <table className="w-full text-sm">
              <thead className="bg-white/70 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Window</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {data.tasks.map((task) => (
                  <tr key={task.key}>
                    <td className="px-3 py-2 text-stone-800">{task.label}</td>
                    <td className="px-3 py-2 text-stone-500">{TYPE_LABELS[task.type]}</td>
                    <td className="px-3 py-2 text-stone-600">
                      {formatDate(task.completeOnOrAfter)} – {formatDate(task.completeNoLaterThan)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge color={STATUS_BADGE[task.status].color}>{STATUS_BADGE[task.status].label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
