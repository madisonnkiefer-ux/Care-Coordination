import Link from "next/link";
import { CheckSquare, Square, ListTree, FileSignature, ArrowRightLeft } from "lucide-react";
import { getMemberChart } from "@/lib/data/members";
import { getStatusHistory } from "@/lib/data/member-status";
import { getChartHistorySummary } from "@/lib/data/intake";
import { getCarePlanHistorySummary } from "@/lib/data/care-plan";
import { getTocHistorySummary } from "@/lib/data/toc";
import { PageHeader, Card, Badge } from "@/components/ui";
import { GoalDonut } from "@/components/goal-donut";
import { DocumentUpload } from "@/components/document-upload";
import { MemberStatusCard } from "@/components/member-status-card";
import { formatDate, formatDateTime, titleCase, toDateInputValue } from "@/lib/format";
import { toggleTask, createTask } from "@/app/actions/tasks";
import { saveQuickNote } from "@/app/actions/notes";
import { createAppointment } from "@/app/actions/appointments";
import { updateMemberOverview } from "@/app/actions/member-details";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";
import { statusBadgeColor } from "@/lib/member-status";
import { QuickActionsBar } from "@/components/quick-actions-bar";
import { AlertBanner } from "@/components/alert-banner";
import { getPatientSnapshot } from "@/lib/data/patient-snapshot";
import { getMemberGraduationInfo } from "@/lib/data/graduation";
import { GraduationAlertCard } from "@/components/graduation-alert-card";
import { PrintButton } from "@/components/print-button";
import { DeleteMemberButton } from "@/components/delete-member-button";
import { SaveButton } from "@/components/save-button";
import { getAmendmentRequestsForMember } from "@/lib/data/amendment-requests";
import { AmendmentRequestsCard } from "@/components/amendment-requests-card";

export default async function MemberChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [
    { session, member, tasks, recentContacts, appointments, documents, notes, goalTotals },
    statusHistory,
    snapshot,
    chartHistory,
    carePlanHistory,
    tocHistory,
    graduationInfo,
    amendmentRequests,
  ] = await Promise.all([
    getMemberChart(id),
    getStatusHistory(id),
    getPatientSnapshot(id),
    getChartHistorySummary(id),
    getCarePlanHistorySummary(id),
    getTocHistorySummary(id),
    getMemberGraduationInfo(id),
    getAmendmentRequestsForMember(id),
  ]);

  const returnPath = `/members/${id}`;

  const chartEntries = [
    ...chartHistory.map((v) => {
      const allComplete = [v.demographics, v.hra, v.cna, v.note].every((s) => s?.status === "COMPLETED");
      return {
        key: `enrollment-${v.id}`,
        type: "internal" as const,
        date: v.createdAt,
        href: `/members/${id}/intake?version=${v.id}`,
        name: "Enrollment",
        badge: v.signedAt
          ? { label: "🔒 Signed", color: "slate" as const }
          : allComplete
            ? { label: "Completed", color: "green" as const }
            : { label: "Draft", color: "yellow" as const },
      };
    }),
    ...carePlanHistory.map((cp) => ({
      key: `careplan-${cp.id}`,
      type: "internal" as const,
      date: cp.createdAt,
      href: `/members/${id}/care-plan?tab=ccp&version=${cp.id}`,
      name: "Care Plan",
      badge:
        cp.status === "COMPLETED" ? { label: "Completed", color: "green" as const } : { label: "Draft", color: "yellow" as const },
    })),
    ...tocHistory.map((t) => ({
      key: `toc-${t.id}`,
      type: "internal" as const,
      date: t.createdAt,
      href: `/members/${id}/toc?version=${t.id}`,
      name: "Transition of Care",
      badge: t.signedAt
        ? { label: "🔒 Signed", color: "slate" as const }
        : t.status === "COMPLETED"
          ? { label: "Completed", color: "green" as const }
          : { label: "Draft", color: "yellow" as const },
    })),
    ...documents.map((doc) => ({
      key: `document-${doc.id}`,
      type: "external" as const,
      date: doc.createdAt,
      href: doc.storageKey ?? "#",
      name: doc.name,
      badge: { label: "Document", color: "slate" as const },
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div>
      <PageHeader
        title={`${member.firstName} ${member.lastName}`}
        description={`Medicaid ID: ${member.medicaidId ?? "—"} · Assigned CC: ${
          member.assignedCoordinator?.name ?? "Unassigned"
        }`}
        action={
          <div className="flex items-center gap-3">
            <PrintButton label="Print Full Chart" />
            {session.role !== "CARE_COORDINATOR" && (
              <a
                href={`/api/members/${id}/export`}
                className="flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 print:hidden"
                title="Full designated record set export, for a right-to-access request"
              >
                Export Full Record
              </a>
            )}
            <Badge color={statusBadgeColor(member.status)}>{titleCase(member.status)}</Badge>
            {session.role === "ADMIN" && (
              <DeleteMemberButton memberId={id} memberName={`${member.firstName} ${member.lastName}`} />
            )}
          </div>
        }
      />
      <div className="print:hidden">
        <AlertBanner alerts={snapshot?.alerts ?? []} />
        <QuickActionsBar memberId={id} />
      </div>

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Overview">
            <form
              key={member.updatedAt.getTime()}
              action={updateMemberOverview.bind(null, id)}
              className="grid grid-cols-1 gap-4 sm:grid-cols-3"
            >
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  First Name
                </label>
                <input
                  name="firstName"
                  required
                  defaultValue={member.firstName}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Last Name
                </label>
                <input
                  name="lastName"
                  required
                  defaultValue={member.lastName}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  defaultValue={toDateInputValue(member.dateOfBirth)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Phone</label>
                <input
                  name="phone"
                  defaultValue={member.phone ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Medicaid ID
                </label>
                <input
                  name="medicaidId"
                  defaultValue={member.medicaidId ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Chart ID
                </label>
                <input
                  name="memberIdExternal"
                  defaultValue={member.memberIdExternal ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Subscriber ID
                </label>
                <input
                  name="subscriberId"
                  defaultValue={member.subscriberId ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Type of Patient
                </label>
                <select
                  name="program"
                  defaultValue={member.program ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                >
                  <option value="">—</option>
                  {PATIENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Language
                </label>
                <input
                  name="language"
                  defaultValue={member.language ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  Due Date (if prenatal)
                </label>
                <input
                  type="date"
                  name="edd"
                  defaultValue={toDateInputValue(member.edd)}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                  CCL Level
                </label>
                <select
                  name="cclLevel"
                  defaultValue={member.cclLevel ?? ""}
                  className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                >
                  <option value="">—</option>
                  <option value="CCL1">CCL1</option>
                  <option value="CCL2">CCL2</option>
                  <option value="CCL3">CCL3</option>
                  <option value="HIGH_RISK">High Risk</option>
                </select>
              </div>
              <div className="flex items-end justify-end print:hidden">
                <SaveButton />
              </div>
            </form>
          </Card>

          {graduationInfo && <GraduationAlertCard info={graduationInfo} />}

          <MemberStatusCard
            memberId={id}
            currentStatus={member.status}
            history={statusHistory}
            canEditDirectly={session.role !== "CARE_COORDINATOR"}
          />

          <Card title="Quick Access" className="print:hidden">
            <div className="grid grid-cols-2 gap-3">
              <QuickAccessTile
                href={`/members/${id}/intake`}
                icon={FileSignature}
                label="Enrollment (Demographics, HRA, CNA, Notes)"
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

          <Card title="Charts" className="print:hidden">
            {chartEntries.length === 0 ? (
              <EmptyState label="No charts yet." />
            ) : (
              <ul className="divide-y divide-stone-100">
                {chartEntries.map((entry) =>
                  entry.type === "external" ? (
                    <li key={entry.key}>
                      <a
                        href={entry.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 py-2 text-sm text-stone-700 hover:text-charcoal"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-stone-400">{formatDate(entry.date)}</span>
                          <span className="ml-2 font-medium">{entry.name}</span>
                        </span>
                        <Badge color={entry.badge.color}>{entry.badge.label}</Badge>
                      </a>
                    </li>
                  ) : (
                    <li key={entry.key}>
                      <Link
                        href={entry.href}
                        className="flex items-center justify-between gap-3 py-2 text-sm text-stone-700 hover:text-charcoal"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-stone-400">{formatDate(entry.date)}</span>
                          <span className="ml-2 font-medium">{entry.name}</span>
                        </span>
                        <Badge color={entry.badge.color}>{entry.badge.label}</Badge>
                      </Link>
                    </li>
                  )
                )}
              </ul>
            )}
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
          <Card id="tasks" title="Tasks">
            {tasks.length === 0 ? (
              <EmptyState label="No tasks for this member." />
            ) : (
              <ul className="mb-3 space-y-1">
                {tasks.map((task) => {
                  const toggle = toggleTask.bind(null, task.id, returnPath);
                  return (
                    <li key={task.id} className="flex items-center gap-2 py-1.5 text-sm">
                      <form action={toggle}>
                        <button type="submit" className="text-stone-400 hover:text-charcoal" aria-label="Toggle complete">
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
            <form action={createTask} className="flex gap-2 border-t border-stone-100 pt-3 print:hidden">
              <input type="hidden" name="memberId" value={id} />
              <input type="hidden" name="returnPath" value={returnPath} />
              <input
                name="title"
                required
                placeholder="Add a task..."
                className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              <button
                type="submit"
                className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                Add
              </button>
            </form>
          </Card>

          <Card id="quick-notes" title="Quick Notes">
            <form action={saveQuickNote} className="space-y-2 print:hidden">
              <input type="hidden" name="memberId" value={id} />
              <textarea
                name="body"
                rows={3}
                placeholder="Type note here..."
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              <button
                type="submit"
                className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                Save Note
              </button>
            </form>
            {notes.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3">
                {notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <p className="whitespace-pre-wrap text-stone-700">{n.body}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {n.author.name} · {formatDateTime(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Appointments">
            {appointments.length === 0 ? (
              <EmptyState label="Nothing scheduled." />
            ) : (
              <ul className="mb-3 space-y-2 text-sm">
                {appointments.map((appt) => (
                  <li key={appt.id}>
                    <p className="font-medium text-stone-800">{appt.title}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(appt.startsAt)} {appt.location ? `· ${appt.location}` : ""}
                      {appt.isVirtual ? " · Virtual" : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <form
              action={createAppointment.bind(null, id)}
              className="space-y-2 border-t border-stone-100 pt-3 print:hidden"
            >
              <input
                name="title"
                required
                placeholder="Appointment title..."
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              <input
                type="datetime-local"
                name="startsAt"
                required
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              <input
                name="location"
                placeholder="Location (optional)"
                className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
              <label className="flex items-center gap-2 text-xs text-stone-600">
                <input type="checkbox" name="isVirtual" className="rounded border-stone-300" />
                Virtual visit
              </label>
              <button
                type="submit"
                className="w-full rounded-md bg-charcoal px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800"
              >
                Add Appointment
              </button>
            </form>
          </Card>

          <Card id="documents" title="Documents">
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
                      className="truncate text-stone-700 hover:text-charcoal hover:underline"
                    >
                      {doc.name}
                    </a>
                    <span className="shrink-0 text-xs text-stone-400">{formatDate(doc.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <AmendmentRequestsCard memberId={id} requests={amendmentRequests} />
        </div>
      </div>
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
