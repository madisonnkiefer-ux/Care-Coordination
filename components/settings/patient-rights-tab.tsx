"use client";

import { useActionState } from "react";
import { Card, Badge } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { resolveAmendmentRequest } from "@/app/actions/amendment-requests";
import { AMENDMENT_RESPONSE_DAYS } from "@/lib/amendment-requests-shared";

type AmendmentRequest = {
  id: string;
  description: string;
  status: "OPEN" | "ACCEPTED" | "DENIED";
  resolution: string | null;
  createdAt: Date;
  member: { id: string; firstName: string; lastName: string };
  requestedBy: { name: string };
  resolvedBy: { name: string } | null;
};

type ExportLogEntry = {
  id: string;
  createdAt: Date;
  user: { name: string } | null;
  member: { firstName: string; lastName: string } | null;
};

function dueByInfo(request: AmendmentRequest) {
  const dueBy = new Date(request.createdAt.getTime() + AMENDMENT_RESPONSE_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((dueBy.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  const color = daysLeft < 0 ? "red" : daysLeft <= 14 ? "yellow" : "slate";
  const label = daysLeft < 0 ? `Overdue (due ${formatDate(dueBy)})` : `Due ${formatDate(dueBy)}`;
  return { color, label } as const;
}

export function PatientRightsTab({ requests, exportLog }: { requests: AmendmentRequest[]; exportLog: ExportLogEntry[] }) {
  const openRequests = requests.filter((r) => r.status === "OPEN");
  const resolvedRequests = requests.filter((r) => r.status !== "OPEN");
  const overdueCount = openRequests.filter((r) => dueByInfo(r).color === "red").length;

  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        Tools for fulfilling HIPAA patient-rights requests: tracking requests to amend a record (45 CFR §164.526)
        against the {AMENDMENT_RESPONSE_DAYS}-day response clock, and a log of full-record releases (45 CFR
        §164.524) for accounting-of-disclosures purposes. Full-record exports are triggered from a member&apos;s
        chart page (&quot;Export Full Record&quot;, supervisor/admin only).
      </p>

      {overdueCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-700">
            {overdueCount} amendment request{overdueCount === 1 ? "" : "s"} past the {AMENDMENT_RESPONSE_DAYS}-day
            response window.
          </p>
        </Card>
      )}

      <Card title="Open Amendment Requests">
        {openRequests.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No open requests.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {openRequests.map((r) => (
              <AmendmentRequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}
      </Card>

      {resolvedRequests.length > 0 && (
        <Card title="Resolved Amendment Requests">
          <div className="overflow-hidden rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {resolvedRequests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-stone-800">
                      {r.member.firstName} {r.member.lastName}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <Badge color={r.status === "ACCEPTED" ? "green" : "slate"}>{r.status === "ACCEPTED" ? "Accepted" : "Denied"}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{r.resolution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Full-Record Export Log (Accounting of Disclosures)">
        {exportLog.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">No full-record exports yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Released By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {exportLog.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap text-stone-500">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-2.5 text-stone-800">
                      {entry.member ? `${entry.member.firstName} ${entry.member.lastName}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-stone-600">{entry.user?.name ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AmendmentRequestRow({ request }: { request: AmendmentRequest }) {
  const [state, formAction, pending] = useActionState(resolveAmendmentRequest.bind(null, request.id), undefined);
  const due = dueByInfo(request);

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-800">
            {request.member.firstName} {request.member.lastName}
          </p>
          <p className="text-sm text-stone-600">{request.description}</p>
          <p className="mt-0.5 text-xs text-stone-400">
            Logged by {request.requestedBy.name} · {formatDate(request.createdAt)}
          </p>
        </div>
        <Badge color={due.color}>{due.label}</Badge>
      </div>

      <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
            Resolution Note
          </label>
          <input
            name="resolution"
            required
            placeholder="What was corrected, or why the request was denied"
            className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <button
          type="submit"
          name="status"
          value="ACCEPTED"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Accept
        </button>
        <button
          type="submit"
          name="status"
          value="DENIED"
          disabled={pending}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Deny
        </button>
      </form>
      {state?.error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </li>
  );
}
