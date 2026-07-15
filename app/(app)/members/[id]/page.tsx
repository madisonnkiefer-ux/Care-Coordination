import Link from "next/link";
import { CheckSquare, Square, ClipboardList, HeartPulse, ListTree, FileSignature } from "lucide-react";
import { getMemberChart } from "@/lib/data/members";
import { PageHeader, Card, Badge } from "@/components/ui";
import { GoalDonut } from "@/components/goal-donut";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { saveQuickNote } from "@/app/actions/notes";
import { toggleTask } from "@/app/actions/tasks";

export default async function MemberChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member, tasks, touchpoints, appointments, documents, notes, goalTotals } = await getMemberChart(id);

  const returnPath = `/members/${id}`;

  return (
    <div>
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description={`Medicaid ID: ${member.medicaidId ?? "—"} · Assigned CC: ${
          member.assignedCoordinator?.name ?? "Unassigned"
        }`}
        action={<Badge color={member.status === "ACTIVE" ? "green" : "slate"}>{titleCase(member.status)}</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Overview">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <Field label="Phone" value={member.phone} />
              <Field label="Date of Birth" value={formatDate(member.dateOfBirth)} />
              <Field label="EDD" value={member.edd ? formatDate(member.edd) : "—"} />
              <Field label="CCL Level" value={member.cclLevel ? titleCase(member.cclLevel) : "—"} />
              <Field label="Program" value={member.program ?? "—"} />
              <Field label="Language" value={member.language ?? "—"} />
            </dl>
          </Card>

          <Card title="Quick Access">
            <div className="grid grid-cols-2 gap-3">
              <QuickAccessTile
                href={`/members/${id}/demographics`}
                icon={FileSignature}
                label="Demographics"
              />
              <QuickAccessTile
                href={`/members/${id}/hra`}
                icon={HeartPulse}
                label="Health Risk Assessment"
              />
              <QuickAccessTile
                href={`/members/${id}/cna`}
                icon={ClipboardList}
                label="Comprehensive Needs Assessment"
              />
              <QuickAccessTile
                href={`/members/${id}/care-plan`}
                icon={ListTree}
                label="Comprehensive Care Plan"
              />
            </div>
          </Card>

          <Card title="Care Plan Goals">
            <GoalDonut totals={goalTotals} />
          </Card>

          <Card title="Recent Touchpoints">
            {touchpoints.length === 0 ? (
              <EmptyState label="No touchpoints logged yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">By</th>
                    <th className="pb-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {touchpoints.map((tp) => (
                    <tr key={tp.id}>
                      <td className="py-2 text-slate-600">{formatDate(tp.date)}</td>
                      <td className="py-2 text-slate-600">{titleCase(tp.type)}</td>
                      <td className="py-2 text-slate-600">{tp.user.name}</td>
                      <td className="py-2">
                        <Badge color={tp.outcome === "COMPLETED" ? "green" : "yellow"}>{titleCase(tp.outcome)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Tasks">
            {tasks.length === 0 ? (
              <EmptyState label="No tasks for this member." />
            ) : (
              <ul className="space-y-1">
                {tasks.map((task) => {
                  const toggle = toggleTask.bind(null, task.id, returnPath);
                  return (
                    <li key={task.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <form action={toggle}>
                        <button type="submit" className="text-slate-400 hover:text-fuchsia-600" aria-label="Toggle complete">
                          {task.status === "COMPLETED" ? (
                            <CheckSquare className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </form>
                      <span className={task.status === "COMPLETED" ? "flex-1 text-slate-400 line-through" : "flex-1 text-slate-700"}>
                        {task.title}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(task.dueDate)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title="Quick Notes">
            <form action={saveQuickNote.bind(null, id)} className="space-y-2">
              <textarea
                name="body"
                rows={3}
                placeholder="Type note here..."
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
              <button
                type="submit"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                Save Note
              </button>
            </form>
            {notes && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-400">
                Last updated: {formatDateTime(notes.updatedAt)}
              </p>
            )}
          </Card>

          <Card title="Upcoming Appointments">
            {appointments.length === 0 ? (
              <EmptyState label="Nothing scheduled." />
            ) : (
              <ul className="space-y-2 text-sm">
                {appointments.map((appt) => (
                  <li key={appt.id}>
                    <p className="font-medium text-slate-800">{appt.title}</p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(appt.startsAt)} {appt.location ? `· ${appt.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Documents">
            {documents.length === 0 ? (
              <EmptyState label="No documents uploaded." />
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <span className="text-slate-700">{doc.name}</span>
                    <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function QuickAccessTile({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-fuchsia-300 hover:bg-fuchsia-50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-fuchsia-100 to-orange-100 text-fuchsia-600">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-4 text-center text-sm text-slate-400">{label}</p>;
}
