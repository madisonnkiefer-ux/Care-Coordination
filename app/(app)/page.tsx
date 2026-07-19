import Link from "next/link";
import { Users, ListChecks, FileText, ClipboardList, ClipboardCheck } from "lucide-react";
import { getDashboardData } from "@/lib/data/dashboard";
import { PageHeader, Card, StatTile, Badge } from "@/components/ui";
import { GoalDonut } from "@/components/goal-donut";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";

export default async function DashboardPage() {
  const { session, stats, myTasks, upcomingAppointments, goalTotals, recentContacts, annualCnaDue, notContactedThisQuarter } =
    await getDashboardData();

  return (
    <div>
      <PageHeader title={`Good morning, ${session.name.split(" ")[0]}!`} description="Here's what's happening today." />

      <div className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="My Members" value={stats.myMembers} icon={Users} />
          <StatTile label="Tasks Due" value={stats.tasksDue} icon={ListChecks} />
          <StatTile label="CNA Drafts Open" value={stats.cnaDue} icon={FileText} />
          <StatTile label="Care Plans Tracked" value={stats.carePlansTracked} icon={ClipboardList} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card
            title="My Tasks"
            action={
              <Link href="/tasks" className="text-xs font-medium text-stone-900 hover:underline">
                View my tasks →
              </Link>
            }
          >
            {myTasks.length === 0 ? (
              <EmptyState label="No open tasks." sub="You're all caught up." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {myTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-stone-800">{task.title}</p>
                      {task.member && (
                        <p className="text-xs text-stone-500">
                          {task.member.firstName} {task.member.lastName}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <span className="text-xs text-stone-500">{formatDate(task.dueDate)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Annual CNAs Due This Month">
            {annualCnaDue.length === 0 ? (
              <EmptyState label="Nothing due this month." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {annualCnaDue.map((m) => {
                  const overdue = m.dueDate ? m.dueDate < new Date() : true;
                  return (
                    <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                      <Link href={`/members/${m.id}/intake`} className="font-medium text-stone-800 hover:text-stone-900 hover:underline">
                        {m.firstName} {m.lastName}
                      </Link>
                      <Badge color={overdue ? "red" : "yellow"}>{m.dueDate ? formatDate(m.dueDate) : "Never completed"}</Badge>
                    </li>
                  );
                })}
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
                    <p className="font-medium text-stone-800">{appt.title}</p>
                    <p className="text-xs text-stone-500">
                      {appt.member.firstName} {appt.member.lastName} · {formatDateTime(appt.startsAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card title="Care Plan Goals Overview">
            <GoalDonut totals={goalTotals} />
          </Card>

          <Card title="Not Contacted This Quarter">
            {notContactedThisQuarter.length === 0 ? (
              <EmptyState label="Everyone's been reached this quarter." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {notContactedThisQuarter.map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/members/${m.id}/care-plan`} className="font-medium text-stone-800 hover:text-stone-900 hover:underline">
                      {m.firstName} {m.lastName}
                    </Link>
                    <Badge color={m.lastSuccessfulContactDate ? "yellow" : "red"}>
                      {m.lastSuccessfulContactDate ? formatDate(m.lastSuccessfulContactDate) : "Never contacted"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent Contact Attempts">
            {recentContacts.length === 0 ? (
              <EmptyState label="No contact attempts logged yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Member</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentContacts.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 text-stone-600">{formatDate(c.createdAt)}</td>
                      <td className="py-2 text-stone-800">
                        {c.member.firstName} {c.member.lastName}
                      </td>
                      <td className="py-2 text-stone-600">{c.contactMethod ?? "—"}</td>
                      <td className="py-2">
                        {c.successful === null ? (
                          <Badge color="slate">—</Badge>
                        ) : (
                          <Badge color={c.successful ? "green" : "yellow"}>{c.successful ? "Successful" : "Unsuccessful"}</Badge>
                        )}
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

function EmptyState({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
        <ClipboardCheck className="h-4 w-4 text-stone-500" />
      </div>
      <div>
        <p className="text-sm font-medium text-stone-700">{label}</p>
        {sub && <p className="text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  );
}
