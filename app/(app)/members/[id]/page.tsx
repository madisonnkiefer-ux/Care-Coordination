import Link from "next/link";
import { CheckSquare, Square, ListTree, FileSignature, ArrowRightLeft } from "lucide-react";
import { getMemberChart } from "@/lib/data/members";
import { getStatusHistory } from "@/lib/data/member-status";
import { PageHeader, Card, Badge } from "@/components/ui";
import { GoalDonut } from "@/components/goal-donut";
import { DocumentUpload } from "@/components/document-upload";
import { MemberStatusCard } from "@/components/member-status-card";
import { formatDate, formatDateTime, titleCase } from "@/lib/format";
import { saveQuickNote } from "@/app/actions/notes";
import { toggleTask } from "@/app/actions/tasks";
import { updateMemberDetails } from "@/app/actions/member-details";
import { statusBadgeColor } from "@/lib/member-status";

export default async function MemberChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ member, tasks, recentContacts, appointments, documents, notes, goalTotals }, statusHistory] = await Promise.all([
    getMemberChart(id),
    getStatusHistory(id),
  ]);

  const returnPath = `/members/${id}`;

  return (
    <div>
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description={`Medicaid ID: ${member.medicaidId ?? "—"} · Assigned CC: ${
          member.assignedCoordinator?.name ?? "Unassigned"
        }`}
        action={<Badge color={statusBadgeColor(member.status)}>{titleCase(member.status)}</Badge>}
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

          <MemberStatusCard memberId={id} currentStatus={member.status} history={statusHistory} />

          <Card title="Insurance &amp; Provider">
            <form
              key={member.updatedAt.getTime()}
              action={updateMemberDetails.bind(null, id)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Chart ID</label>
                <input
                  name="memberIdExternal"
                  defaultValue={member.memberIdExternal ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Subscriber ID</label>
                <input
                  name="subscriberId"
                  defaultValue={member.subscriberId ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Availity ID</label>
                <input
                  name="availityId"
                  defaultValue={member.availityId ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Provider</label>
                <input
                  name="provider"
                  placeholder="Member's outside doctor"
                  defaultValue={member.provider ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="medicaidEligibilityVerified"
                  defaultChecked={member.medicaidEligibilityVerified ?? false}
                  className="h-4 w-4 rounded border-stone-300"
                />
                Medicaid Eligibility Verified
              </label>
              <div className="flex items-end justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
                >
                  Save
                </button>
              </div>
            </form>
          </Card>

          <Card title="Quick Access">
            <div className="grid grid-cols-2 gap-3">
              <QuickAccessTile
                href={`/members/${id}/intake`}
                icon={FileSignature}
                label="Intake (Demographics, HRA, CNA, Notes)"
              />
              <QuickAccessTile
                href={`/members/${id}/care-plan`}
                icon={ListTree}
                label="Comprehensive Care Plan"
              />
              <QuickAccessTile
                href={`/members/${id}/toc`}
                icon={ArrowRightLeft}
                label="Transition of Care (TOC)"
              />
            </div>
          </Card>

          <Card title="Care Plan Goals">
            <GoalDonut totals={goalTotals} />
          </Card>

          <Card title="Recent Contact Attempts">
            {recentContacts.length === 0 ? (
              <EmptyState label="No contact attempts logged yet." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-stone-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Method</th>
                    <th className="pb-2 font-medium">By</th>
                    <th className="pb-2 font-medium">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentContacts.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2 text-stone-600">{formatDate(c.createdAt)}</td>
                      <td className="py-2 text-stone-600">{c.contactMethod ?? "—"}</td>
                      <td className="py-2 text-stone-600">{c.author?.name ?? "—"}</td>
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
                        <button type="submit" className="text-stone-400 hover:text-stone-900" aria-label="Toggle complete">
                          {task.status === "COMPLETED" ? (
                            <CheckSquare className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </form>
                      <span className={task.status === "COMPLETED" ? "flex-1 text-stone-400 line-through" : "flex-1 text-stone-700"}>
                        {task.title}
                      </span>
                      <span className="text-xs text-stone-400">{formatDate(task.dueDate)}</span>
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
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
              <button
                type="submit"
                className="rounded-md bg-stone-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                Save Note
              </button>
            </form>
            {notes && (
              <p className="mt-3 border-t border-stone-100 pt-3 text-xs text-stone-400">
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
                    <p className="font-medium text-stone-800">{appt.title}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(appt.startsAt)} {appt.location ? `· ${appt.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Documents">
            <DocumentUpload memberId={id} />
            {documents.length === 0 ? (
              <EmptyState label="No documents uploaded." />
            ) : (
              <ul className="space-y-2 text-sm">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <a
                      href={doc.storageKey ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-stone-700 hover:text-stone-900 hover:underline"
                    >
                      {doc.name}
                    </a>
                    <span className="shrink-0 text-xs text-stone-400">{formatDate(doc.createdAt)}</span>
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
      <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="text-stone-800">{value || "—"}</dd>
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
      className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 text-sm font-medium text-stone-700 hover:border-stone-300 hover:bg-stone-100"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-stone-700">
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Link>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-4 text-center text-sm text-stone-400">{label}</p>;
}
