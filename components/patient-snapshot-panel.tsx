import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { getPatientSnapshot } from "@/lib/data/patient-snapshot";

type Snapshot = NonNullable<Awaited<ReturnType<typeof getPatientSnapshot>>>;

function daysAgo(date: Date | null) {
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function PatientSnapshotPanel({ snapshot }: { snapshot: Snapshot }) {
  const { member, pregnancy, nextTouchpointDue, ccpDueDate, ccpLastUpdated, lastContactDate, activeGoalsCount, topBarriers, openTasksCount, alerts } =
    snapshot;

  return (
    <aside className="sticky top-0 h-screen w-72 shrink-0 space-y-4 overflow-y-auto border-l border-stone-200 bg-white p-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">Snapshot</p>
        <p className="font-serif text-lg text-stone-900">
          {member.firstName} {member.lastName}
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                alert.level === "high" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
              }`}
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {alert.text}
            </div>
          ))}
        </div>
      )}

      <dl className="space-y-3 text-sm">
        {pregnancy && (
          <SnapshotRow
            label={pregnancy.kind === "pregnant" ? "Pregnancy" : "Postpartum"}
            value={pregnancy.kind === "pregnant" ? `${pregnancy.weeks} weeks (EDD ${formatDate(pregnancy.edd)})` : `${pregnancy.weeks} weeks`}
          />
        )}
        <SnapshotRow
          label="Next Touchpoint Due"
          value={nextTouchpointDue ? formatDate(nextTouchpointDue) : "—"}
          warn={!!nextTouchpointDue && nextTouchpointDue < new Date()}
        />
        <SnapshotRow
          label="CCP Due"
          value={ccpDueDate ? formatDate(ccpDueDate) : "No care plan"}
          warn={!ccpDueDate || ccpDueDate < new Date()}
        />
        {ccpLastUpdated && <SnapshotRow label="CCP Last Updated" value={formatDate(ccpLastUpdated)} />}
        <SnapshotRow label="Last Contact" value={daysAgo(lastContactDate) ?? "Never"} />
      </dl>

      <div className="border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-500">Active Goals</span>
          <span className="font-medium text-stone-900">{activeGoalsCount}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-sm">
          <span className="text-stone-500">Open Tasks</span>
          <span className="font-medium text-stone-900">{openTasksCount}</span>
        </div>
      </div>

      {topBarriers.length > 0 && (
        <div className="border-t border-stone-100 pt-3">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-stone-400">Top Barriers</p>
          <div className="flex flex-wrap gap-1.5">
            {topBarriers.map((b, i) => (
              <span key={i} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {b}
              </span>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/members/${member.id}`}
        className="block border-t border-stone-100 pt-3 text-xs font-medium text-stone-900 hover:underline"
      >
        Open full chart →
      </Link>
    </aside>
  );
}

function SnapshotRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className={`text-right font-medium ${warn ? "text-red-600" : "text-stone-900"}`}>{value}</dd>
    </div>
  );
}
