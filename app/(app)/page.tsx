import Link from "next/link";
import { getDashboardData } from "@/lib/data/dashboard";
import { PageHeader, Card, StatTile, Badge } from "@/components/ui";
import { GoalDonut } from "@/components/goal-donut";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export default async function DashboardPage() {
  const { session, stats, myTasks, upcomingAppointments, goalTotals, recentTouchpoints } =
    await getDashboardData();

  return (
    <div>
      <PageHeader title={`Good morning, ${session.name.split(" ")[0]}!`} description="Here's what's happening today." />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="My Members" value={stats.myMembers} />
          <StatTile label="Tasks Due" value={stats.tasksDue} />
          <StatTile label="CNA Drafts Open" value={stats.cnaDue} />
          <StatTile label="Care Plans Tracked" value={stats.carePlansTracked} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card
            title="My Tasks"
            className="lg:col-span-2"
            action={
              <Link href="/tasks" className="text-xs font-medium text-fuchsia-600 hover:underline">
                View my tasks →
              </Link>
            }
          >
            {myTasks.length === 0 ? (
              <EmptyState label="No open tasks. Nice work." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {myTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{task.title}</p>
                      {task.member && (
                        <p className="text-xs text-slate-500">
                          {task.member.firstName} {task.member.lastName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs text-slate-500">{formatDate(task.dueDate)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Appointments">
            {upcomingAppointments.length === 0 ? (
              <EmptyState label="Nothing scheduled." />
            ) : (
              <ul className="space-y-3">
                {upcomingAppointments.map((appt) => (
                  <li key={appt.id} className="text-sm">
                    <p className="font-medium text-slate-800">{appt.title}</p>
                    <p className="text-xs text-slate-500">
                      {appt.member.firstName} {appt.member.lastName} · {formatDateTime(appt.startsAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Care Plan Goals Overview">
            <GoalDonut totals={goalTotals} />
          </Card>

          <Card title="Recent Touchpoints">
            {recentTouchpoints.length === 0 ? (
              <EmptyState label="No touchpoints logged yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTouchpoints.map((tp) => (
                    <tr key={tp.id}>
                      <td className="py-2 text-slate-600">{formatDate(tp.date)}</td>
                      <td className="py-2 text-slate-800">
                        {tp.member.firstName} {tp.member.lastName}
                      </td>
                      <td className="py-2 text-slate-600">{titleCase(tp.type)}</td>
                      <td className="py-2">
                        <OutcomeBadge outcome={tp.outcome} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: "LOW" | "MEDIUM" | "HIGH" }) {
  const color = priority === "HIGH" ? "red" : priority === "MEDIUM" ? "yellow" : "slate";
  return <Badge color={color}>{titleCase(priority)}</Badge>;
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const color = outcome === "COMPLETED" ? "green" : outcome === "ATTEMPTED" ? "yellow" : "red";
  return <Badge color={color}>{titleCase(outcome)}</Badge>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-slate-400">{label}</p>;
}
