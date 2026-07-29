"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { changeMemberStatus } from "@/app/actions/member-status";
import { formatDate, formatDateTime, titleCase, toDateInputValue } from "@/lib/format";
import { ALL_STATUSES, isTerminalStatus, statusBadgeColor, CLOSURE_CHECKLIST_FIELDS } from "@/lib/member-status";
import type { MemberStatus } from "@/app/generated/prisma/client";

type StatusChange = {
  id: string;
  fromStatus: MemberStatus;
  toStatus: MemberStatus;
  effectiveDate: Date;
  reason: string;
  note: string | null;
  requiresApproval: boolean;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  changedBy: { name: string };
  approvedBy: { name: string } | null;
};

export function MemberStatusCard({
  memberId,
  currentStatus,
  history,
}: {
  memberId: string;
  currentStatus: MemberStatus;
  history: StatusChange[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [toStatus, setToStatus] = useState<MemberStatus>(currentStatus);

  const pending = history.find((h) => h.requiresApproval && !h.approvedAt && !h.rejectedAt);
  const showClosureChecklist = toStatus === "CLOSED";

  return (
    <Card title="Member Status">
      <div className="flex items-center justify-between">
        <Badge color={statusBadgeColor(currentStatus)}>{titleCase(currentStatus)}</Badge>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium text-charcoal hover:underline print:hidden"
        >
          {showForm ? "Cancel" : "Change Status"}
        </button>
      </div>

      {pending && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Change to <strong>{titleCase(pending.toStatus)}</strong> requested by {pending.changedBy.name} on{" "}
          {formatDate(pending.createdAt)} — awaiting supervisor approval.
        </div>
      )}

      {showForm && (
        <form
          action={async (formData) => {
            await changeMemberStatus(memberId, formData);
            setShowForm(false);
          }}
          className="mt-4 space-y-3 border-t border-stone-100 pt-4 print:hidden"
        >
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">New Status</label>
            <select
              name="toStatus"
              value={toStatus}
              onChange={(e) => setToStatus(e.target.value as MemberStatus)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {titleCase(s)}
                </option>
              ))}
            </select>
            {isTerminalStatus(toStatus) && (
              <p className="mt-1 text-xs text-amber-700">This status requires supervisor approval before it takes effect.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Effective Date</label>
              <input
                type="date"
                name="effectiveDate"
                defaultValue={toDateInputValue(new Date())}
                required
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Reason</label>
              <input
                type="text"
                name="reason"
                required
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">Supporting Note</label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>

          {showClosureChecklist && (
            <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                Closure checklist — all items required to close this member
              </p>
              <div className="space-y-1.5">
                {CLOSURE_CHECKLIST_FIELDS.map((field) => (
                  <label key={field.key} className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" name={field.key} required className="h-4 w-4 rounded border-stone-300" />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
            Submit Status Change
          </button>
        </form>
      )}

      {history.length > 0 && (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Status History</p>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-600">{titleCase(h.fromStatus)} → </span>
                  <Badge color={statusBadgeColor(h.toStatus)}>{titleCase(h.toStatus)}</Badge>
                  {h.requiresApproval && !h.approvedAt && !h.rejectedAt && <Badge color="yellow">Pending</Badge>}
                  {h.rejectedAt && <Badge color="red">Rejected</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-stone-500">
                  Effective {formatDate(h.effectiveDate)} · {h.reason} · by {h.changedBy.name} on {formatDateTime(h.createdAt)}
                </p>
                {h.note && <p className="mt-0.5 text-xs text-stone-400">{h.note}</p>}
                {h.approvedAt && h.approvedBy && (
                  <p className="mt-0.5 text-xs text-emerald-700">Approved by {h.approvedBy.name} on {formatDateTime(h.approvedAt)}</p>
                )}
                {h.rejectedAt && (
                  <p className="mt-0.5 text-xs text-red-700">Not approved: {h.rejectionReason}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
