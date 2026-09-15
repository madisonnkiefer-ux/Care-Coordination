import { Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
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

export function CclScheduleTab({ data }: { data: CclScheduleData }) {
  const now = new Date();

  return (
    <div className="max-w-3xl space-y-4 p-8">
      <p className="text-sm text-stone-500">
        {data.cclLevel} contractual task schedule, per the BCBSNM DCCE Tasking Tool — every window below is calculated
        from this member&apos;s most recently completed CNA, not a fixed calendar date. Read-only: task status is
        derived from logged General Communication entries, Home Visits, and CNA assessments.
      </p>

      {!data.anchorDate || !data.tasks ? (
        <Card>
          <p className="py-6 text-center text-sm text-stone-400">
            No completed CNA on file yet — this schedule can&apos;t be calculated until this member&apos;s Initial CNA
            is completed.
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <p className="text-sm text-stone-600">
              Anchor date (most recent completed CNA): <span className="font-medium text-stone-800">{formatDate(data.anchorDate)}</span>
            </p>
          </Card>

          <div className="overflow-hidden rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Task</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Complete On or After</th>
                  <th className="px-4 py-3 font-medium">Complete No Later Than</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {data.tasks.map((task) => {
                  const isCurrent = now >= task.completeOnOrAfter && now <= task.completeNoLaterThan;
                  return (
                    <tr key={task.key} className={isCurrent ? "bg-amber-50/40" : undefined}>
                      <td className="px-4 py-2.5 text-stone-800">{task.label}</td>
                      <td className="px-4 py-2.5 text-stone-500">{TYPE_LABELS[task.type]}</td>
                      <td className="px-4 py-2.5 text-stone-600">{formatDate(task.completeOnOrAfter)}</td>
                      <td className="px-4 py-2.5 text-stone-600">{formatDate(task.completeNoLaterThan)}</td>
                      <td className="px-4 py-2.5">
                        <Badge color={STATUS_BADGE[task.status].color}>{STATUS_BADGE[task.status].label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
