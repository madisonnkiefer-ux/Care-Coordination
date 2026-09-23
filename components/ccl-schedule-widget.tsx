import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { nextCclTask } from "@/lib/ccl-cadence";
import type { CclScheduleData } from "@/lib/data/ccl-schedule";

// Compact "what's next" summary for a CCL1/CCL2 member's BCBSNM tasking
// schedule, shown on the main chart — the full task-by-task breakdown
// lives on Care Plan's own CCL Schedule tab (see ccl-schedule-tab.tsx).
export function CclScheduleWidget({ memberId, data }: { memberId: string; data: CclScheduleData }) {
  const href = `/members/${memberId}/care-plan?tab=ccl-schedule`;

  if (!data.anchorDate || !data.tasks) {
    return (
      <Card className="border-amber-200 bg-amber-50" title={`${data.cclLevel} Schedule`}>
        <p className="text-sm text-amber-900">
          No completed CNA on file yet — the {data.cclLevel} task schedule can&apos;t be calculated until this
          member&apos;s Initial CNA is completed.
        </p>
      </Card>
    );
  }

  const next = nextCclTask(data.tasks);

  if (!next) {
    return (
      <Card className="border-emerald-200 bg-emerald-50" title={`${data.cclLevel} Schedule`}>
        <p className="text-sm text-emerald-800">
          Every task in the current cycle is complete.{" "}
          <Link href={href} className="font-medium underline">
            View full schedule
          </Link>
        </p>
      </Card>
    );
  }

  const overdue = next.status === "overdue";

  return (
    <Card
      className={overdue ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}
      title={`${data.cclLevel} Schedule`}
      action={
        <span className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-700" : "text-amber-800"}`}>
          <CalendarClock className="h-3.5 w-3.5" />
          {overdue ? "Overdue" : `Due by ${formatDate(next.completeNoLaterThan)}`}
        </span>
      }
    >
      <p className={`mb-2 text-sm font-medium ${overdue ? "text-red-800" : "text-amber-900"}`}>
        Next up: {next.label}
        {overdue && ` — was due ${formatDate(next.completeNoLaterThan)}`}
      </p>
      <Link href={href} className={`text-xs font-medium underline ${overdue ? "text-red-700" : "text-amber-800"}`}>
        View full schedule
      </Link>
    </Card>
  );
}
