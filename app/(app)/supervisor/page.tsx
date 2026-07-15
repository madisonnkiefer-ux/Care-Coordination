import Link from "next/link";
import { getSupervisorData } from "@/lib/data/supervisor";
import { PageHeader, Card, StatTile, Badge } from "@/components/ui";

export default async function SupervisorDashboardPage() {
  const { totalMembers, cnaCompletionPct, hraCompletionPct, carePlanCompletionPct, coordinatorStats, highRiskMembers } =
    await getSupervisorData();

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
