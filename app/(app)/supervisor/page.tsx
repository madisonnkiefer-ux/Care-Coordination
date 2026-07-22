import Link from "next/link";
import { getSupervisorData, getCaseloadForReassignment } from "@/lib/data/supervisor";
import { getPendingStatusChanges } from "@/lib/data/member-status";
import { approveStatusChange, rejectStatusChange } from "@/app/actions/member-status";
import { reassignMember } from "@/app/actions/member-assignment";
import { PageHeader, Card, StatTile, Badge } from "@/components/ui";
import { formatDate, titleCase } from "@/lib/format";

export default async function SupervisorDashboardPage() {
  const [
    {
      totalMembers,
      cnaCompletionPct,
      hraCompletionPct,
      carePlanCompletionPct,
      coordinatorStats,
      highRiskMembers,
      declinationsCount,
      graduationsCount,
      terminationsCount,
      draftOrUnsignedNotesCount,
      openTocCasesCount,
      annualCnaDueThisQuarter,
      annualCnaPastDue,
    },
    pendingStatusChanges,
    { members: caseloadMembers, coordinators: caseloadCoordinators },
  ] = await Promise.all([getSupervisorData(), getPendingStatusChanges(), getCaseloadForReassignment()]);

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

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatTile label="Declinations" value={declinationsCount} />
          <StatTile label="Graduations" value={graduationsCount} />
          <StatTile label="Terminations" value={terminationsCount} />
          <StatTile label="Draft/Unsigned Notes" value={draftOrUnsignedNotesCount} />
          <StatTile label="Open TOC Cases" value={openTocCasesCount} />
        </div>

        <p className="text-sm text-stone-500">
          For caseload distribution, outreach compliance, annual CNA status, and CCP completion breakdowns, see{" "}
          <Link href="/reports" className="font-medium text-stone-900 hover:underline">
            Reports →
          </Link>
        </p>

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
              <p className="py-4 text-center text-sm text-stone-400">No care coordinators yet.</p>
            ) : (
              <ul className="space-y-3">
                {coordinatorStats.map((c) => (
                  <li key={c.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-stone-800">{c.name}</span>
                      <span className="text-stone-500">
                        {c.completed}/{c.total} · {c.pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
                      <div className="h-full rounded-full bg-stone-900" style={{ width: `${c.pct}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="High Risk Members">
            {highRiskMembers.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">No high-risk members flagged.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {highRiskMembers.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/members/${m.id}`} className="font-medium text-stone-800 hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">{m.assignedCoordinator?.name ?? "Unassigned"}</span>
                      <Badge color="red">High Risk</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Annual CNAs Due This Quarter">
            {annualCnaDueThisQuarter.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">Nothing due this quarter.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {annualCnaDueThisQuarter.map((m) => {
                  const overdue = m.dueDate ? m.dueDate < new Date() : true;
                  return (
                    <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                      <Link href={`/members/${m.id}`} className="font-medium text-stone-800 hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">{m.coordinatorName}</span>
                        <Badge color={overdue ? "red" : "yellow"}>{m.dueDate ? formatDate(m.dueDate) : "—"}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Annual CNAs Past Due">
            {annualCnaPastDue.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-400">Nothing past due.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {annualCnaPastDue.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <Link href={`/members/${m.id}`} className="font-medium text-stone-800 hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">{m.coordinatorName}</span>
                      <Badge color="red">{m.dueDate ? formatDate(m.dueDate) : "Never completed"}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Caseload Management">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-stone-400">
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium">Assigned Coordinator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {caseloadMembers.map((m) => (
                <tr key={m.id}>
                  <td className="py-2">
                    <Link href={`/members/${m.id}`} className="font-medium text-stone-800 hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                  </td>
                  <td className="py-2">
                    <form key={m.assignedCoordinatorId ?? "unassigned"} action={reassignMember.bind(null, m.id)} className="flex items-center gap-2">
                      <select
                        name="coordinatorId"
                        defaultValue={m.assignedCoordinatorId ?? ""}
                        className="rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                      >
                        <option value="">Unassigned</option>
                        {caseloadCoordinators.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
