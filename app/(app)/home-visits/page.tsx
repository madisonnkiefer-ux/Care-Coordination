import Link from "next/link";
import { getHomeVisitsPageData } from "@/lib/data/home-visits";
import { PageHeader, Card, Badge } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requestHomeVisit, cancelHomeVisitRequest, logHomeVisit } from "@/app/actions/home-visits";
import { formatDate, formatDateTime } from "@/lib/format";
import { PERSON_CONTACTED_OPTIONS } from "@/components/care-plan/outreach-options";

const HOME_VISIT_PERSON_CONTACTED_OPTIONS = [...PERSON_CONTACTED_OPTIONS, "No one (no answer)"];

function isOverdue(r: { dueDate: Date | null }) {
  return r.dueDate !== null && r.dueDate.getTime() < Date.now();
}

function RequestRow({ r }: { r: Awaited<ReturnType<typeof getHomeVisitsPageData>>["openRequests"][number] }) {
  const overdue = isOverdue(r);
  return (
    <li className="flex items-center justify-between gap-3 py-3 text-sm">
      <div>
        <Link href={`/members/${r.member.id}`} className="font-medium text-stone-800 hover:underline">
          {r.member.firstName} {r.member.lastName}
        </Link>
        <p className="text-xs text-stone-500">
          Requested by {r.requestedBy.name} for {r.assignedCoordinator.name} · {formatDate(r.createdAt)}
        </p>
        {r.reason && <p className="mt-0.5 text-xs text-stone-600">{r.reason}</p>}
      </div>
      <div className="flex items-center gap-2">
        {r.dueDate && (
          <Badge color={overdue ? "red" : "slate"}>{overdue ? `Overdue · was due ${formatDate(r.dueDate)}` : `Due ${formatDate(r.dueDate)}`}</Badge>
        )}
        <form action={cancelHomeVisitRequest.bind(null, r.id)}>
          <SubmitButton
            pendingLabel="…"
            className="rounded-md border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50"
          >
            Cancel
          </SubmitButton>
        </form>
      </div>
    </li>
  );
}

export default async function HomeVisitsPage() {
  const { session, openRequests, recentVisits, members, coordinators } = await getHomeVisitsPageData();
  const canAssign = session.permissions.includes("ASSIGN_WORK_TO_OTHERS");
  const overdueCount = openRequests.filter(isOverdue).length;

  const requestsByCoordinator = canAssign
    ? openRequests.reduce((groups, r) => {
        const existing = groups.find((g) => g.coordinatorId === r.assignedCoordinator.id);
        if (existing) existing.requests.push(r);
        else groups.push({ coordinatorId: r.assignedCoordinator.id, coordinatorName: r.assignedCoordinator.name, requests: [r] });
        return groups;
      }, [] as { coordinatorId: string; coordinatorName: string; requests: typeof openRequests }[])
    : [];

  return (
    <div>
      <PageHeader title="Home Visiting" description="Document home visits and track outstanding visit requests." />

      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Open Requests"
            action={
              openRequests.length > 0 ? (
                <div className="flex items-center gap-2">
                  {overdueCount > 0 && <Badge color="red">{overdueCount} overdue</Badge>}
                  <Badge color="yellow">{openRequests.length} pending</Badge>
                </div>
              ) : undefined
            }
          >
            {openRequests.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">No open home visit requests.</p>
            ) : canAssign ? (
              <div className="divide-y divide-stone-200">
                {requestsByCoordinator.map((g) => (
                  <div key={g.coordinatorId} className="py-3 first:pt-0">
                    <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                      {g.coordinatorName}
                      <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[10px] font-normal normal-case text-stone-500">
                        {g.requests.length}
                      </span>
                    </p>
                    <ul className="divide-y divide-stone-100">
                      {g.requests.map((r) => (
                        <RequestRow key={r.id} r={r} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {openRequests.map((r) => (
                  <RequestRow key={r.id} r={r} />
                ))}
              </ul>
            )}
          </Card>

          <Card title="Recent Visits">
            {recentVisits.length === 0 ? (
              <p className="py-6 text-center text-sm text-stone-400">No home visits logged yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {recentVisits.map((v) => (
                  <li key={v.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/members/${v.member.id}`} className="font-medium text-stone-800 hover:underline">
                        {v.member.firstName} {v.member.lastName}
                      </Link>
                      <div className="flex items-center gap-2">
                        <Badge color={v.successful === true ? "green" : v.successful === false ? "red" : "slate"}>
                          {v.successful === true ? "Successful visit" : v.successful === false ? "Unsuccessful visit" : "Not noted"}
                        </Badge>
                        <span className="text-xs text-stone-500">{formatDate(v.visitedAt)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      Logged by {v.coordinator.name} · {formatDateTime(v.createdAt)}
                      {v.personContacted && ` · Spoke with: ${v.personContacted}`}
                      {v.leftCardOrNote !== null && (v.leftCardOrNote ? " · Left a card/note" : " · Did not leave a card/note")}
                    </p>
                    {v.notes && <p className="mt-1 text-stone-700">{v.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Log a Home Visit">
            <form action={logHomeVisit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Member</label>
                <select name="memberId" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                  <option value="" disabled defaultValue="">
                    Select a member...
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Date of Visit</label>
                <input
                  type="date"
                  name="visitedAt"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Was it a successful visit?</p>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="radio" name="successful" value="yes" className="h-4 w-4" />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="radio" name="successful" value="no" className="h-4 w-4" />
                    No
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Who did they talk to?</label>
                <select name="personContacted" defaultValue="" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                  <option value="">—</option>
                  {HOME_VISIT_PERSON_CONTACTED_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Did they leave a card/note?</p>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="radio" name="leftCardOrNote" value="yes" className="h-4 w-4" />
                    Yes
                  </label>
                  <label className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="radio" name="leftCardOrNote" value="no" className="h-4 w-4" />
                    No
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Notes</label>
                <textarea name="notes" rows={3} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <SubmitButton
                pendingLabel="Logging…"
                className="w-full rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                Log Visit
              </SubmitButton>
            </form>
          </Card>

          <Card title="Request a Home Visit">
            <form action={requestHomeVisit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Member</label>
                <select name="memberId" required className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                  <option value="" disabled defaultValue="">
                    Select a member...
                  </option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.firstName} {m.lastName}
                    </option>
                  ))}
                </select>
              </div>
              {canAssign && (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Assign To</label>
                  <select name="assignedCoordinatorId" defaultValue={session.userId} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm">
                    <option value={session.userId}>Myself</option>
                    {coordinators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Due By (optional)</label>
                <input type="date" name="dueDate" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Reason (optional)</label>
                <textarea name="reason" rows={2} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
              </div>
              <SubmitButton
                pendingLabel="Requesting…"
                className="w-full rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              >
                Request Visit
              </SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
