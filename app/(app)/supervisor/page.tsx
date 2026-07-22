import Link from "next/link";
import { getSupervisorData } from "@/lib/data/supervisor";
import { getPendingStatusChanges } from "@/lib/data/member-status";
import { approveStatusChange, rejectStatusChange } from "@/app/actions/member-status";
import { PageHeader, Card, StatTile, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";

export default async function SupervisorDashboardPage() {
  const [{ totalMembers, cnaCompletionPct, hraCompletionPct, carePlanCompletionPct, coordinatorStats, highRiskMembers }, pendingStatusChanges] =
    await Promise.all([getSupervisorData(), getPendingStatusChanges()]);

  return (
    <div>
      <PageHeader title="Supervisor Dashboard" description="Clinic-wide performance across all care coordinators" />

      <div className="space-y-6 p-8">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Total Members" value={totalMembers} />
          <StatTile label="CNA Completion" value={`${cnaCompletionPct}%`} />
          <StatTile label="HRA Completion" value={`${hraCompletionPct}%`} />
          <StatTile label="Care Plans in Place" value={`${carePlanCompletionPct}%`} />
        </div>

        {pendingStatusChanges.length > 0 && (
          <Card title="Pending Status Change Approvals">
            <ul className="divide-y divide-stone-100">
              {pendingStatusChanges.map((change) => (
                <li key={change.id} className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <Link href={`/members/${change.member.id}`} className="font-medium text-stone-800 hover:underline">
                        {change.member.firstName} {change.member.lastName}
                      </Link>
                      <p className="text-xs text-stone-500">
                        {titleCase(change.fromStatus)} → {titleCase(change.toStatus)} · requested by {change.changedBy.name} on{" "}
                        {formatDate(change.createdAt)}
                      </p>
                      <p className="text-xs text-stone-400">{change.reason}</p>
                    </div>
                    <form action={approveStatusChange.bind(null, change.member.id, change.id)}>
                      <button
                        type="submit"
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                      >
                        Approve
                      </button>
                    </form>
                  </div>
                  <form action={rejectStatusChange.bind(null, change.member.id, change.id)} className="mt-2 flex gap-2">
                    <input
                      type="text"
                      name="rejectionReason"
                      required
                      placeholder="Reason for rejecting (required)"
                      className="flex-1 rounded-md border border-stone-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="CNA Completion by Coordinator">
            {coordinatorStats.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No care coordinators yet.</p>
            ) : (
              <ul className="space-y-3">
                {coordinatorStats.map((c) => (
                  <li key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">{c.name}</span>
                      <span className="text-slate-500">
                        {c.completed}/{c.total} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-fuchsia-500" style={{ width: `${c.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="High Risk Members">
            {highRiskMembers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">No high-risk members flagged.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {highRiskMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/members/${m.id}`} className="font-medium text-slate-800 hover:text-fuchsia-600">
                      {m.firstName} {m.lastName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{m.assignedCoordinator?.name ?? "Unassigned"}</span>
                      <Badge color="red">High Risk</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
