"use client";

import { useState } from "react";
import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui";

// Deliberately not window.confirm(): some embedded/webview browser contexts
// silently block or auto-dismiss native confirm()/alert() dialogs, which
// would make a delete button look like it does nothing at all when clicked.
function DeleteChipButton({ warnSigned, onConfirm }: { warnSigned?: boolean; onConfirm: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleConfirm() {
    setPending(true);
    setError(false);
    try {
      await onConfirm();
    } catch {
      setError(true);
      setPending(false);
    }
  }

  if (error) {
    return <span className="pl-1 text-red-600">Delete failed — try again</span>;
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-1 pl-1">
        <span className="text-red-600">{warnSigned ? "Signed — delete?" : "Delete?"}</span>
        <button
          type="button"
          disabled={pending}
          onClick={handleConfirm}
          className="rounded-full bg-red-600 px-1.5 py-0.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "…" : "Yes"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-full px-1.5 py-0.5 text-stone-400 hover:text-stone-600"
        >
          No
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      title="Delete this record (admin only)"
      onClick={() => setConfirming(true)}
      className="rounded-full px-1.5 py-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
    >
      ×
    </button>
  );
}

export type HistoryItem = {
  id: string;
  dateLabel: Date;
  status: "DRAFT" | "COMPLETED";
  signedAt: Date | null;
  signedByName: string | null;
};

export function HistoryBar({
  items,
  selectedId,
  onSelect,
  newAction,
  newLabel = "+ New",
  onDelete,
}: {
  items: HistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  newAction: () => Promise<void>;
  newLabel?: string;
  // Admin-only: parent passes this to enable the delete affordance on each
  // chip. Soft delete — the record is hidden and recoverable, not erased.
  onDelete?: (id: string) => Promise<void>;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4 print:hidden">
      {items.length === 0 && <p className="text-sm text-stone-400">No records yet.</p>}
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <div
            key={item.id}
            className={`flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-charcoal bg-stone-100 text-charcoal"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            <button type="button" onClick={() => onSelect(item.id)} className="flex items-center gap-1.5">
              {formatDate(item.dateLabel)}
              {item.signedAt ? (
                <span title={`Signed by ${item.signedByName ?? "unknown"} on ${formatDateTime(item.signedAt)}`}>🔒</span>
              ) : (
                <span className="text-stone-400">·{item.status === "COMPLETED" ? "Completed" : "Draft"}</span>
              )}
            </button>
            {onDelete && <DeleteChipButton warnSigned={Boolean(item.signedAt)} onConfirm={() => onDelete(item.id)} />}
          </div>
        );
      })}
      <form action={newAction}>
        <button
          type="submit"
          className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-charcoal"
        >
          {newLabel}
        </button>
      </form>
    </div>
  );
}

// Same look as HistoryBar, but for records with no draft/complete/sign concept
// (e.g. Care Plans, General Communication) — just a list of dated entries.
//
// newAction must return the new record's id so we can select it here on the
// client. Avoid redirect() in these actions: they're invoked via a plain
// onClick (not a native form submission), so a redirect's client-side
// refresh can race with the user's next edit and land a save on the wrong
// record.
export function SimpleHistoryBar({
  items,
  selectedId,
  onSelect,
  newAction,
  newLabel = "+ New",
  onDelete,
}: {
  items: { id: string; dateLabel: Date }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  newAction: () => Promise<string | void>;
  newLabel?: string;
  // Admin-only: parent passes this to enable the delete affordance on each
  // chip. Soft delete — the record is hidden and recoverable, not erased.
  onDelete?: (id: string) => Promise<void>;
}) {
  async function handleNew() {
    const newId = await newAction();
    if (typeof newId === "string") onSelect(newId);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4 print:hidden">
      {items.length === 0 && <p className="text-sm text-stone-400">No records yet.</p>}
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <div
            key={item.id}
            className={`flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-charcoal bg-stone-100 text-charcoal"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            <button type="button" onClick={() => onSelect(item.id)}>
              {formatDate(item.dateLabel)}
            </button>
            {onDelete && <DeleteChipButton onConfirm={() => onDelete(item.id)} />}
          </div>
        );
      })}
      <button
        type="button"
        onClick={handleNew}
        className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-charcoal"
      >
        {newLabel}
      </button>
    </div>
  );
}

export function SignedBanner({ signedByName, signedAt }: { signedByName: string | null; signedAt: Date }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
      <Badge color="slate">🔒 Signed &amp; Locked</Badge>
      <span>
        Signed by {signedByName ?? "unknown"} on {formatDateTime(signedAt)}. This record can no longer be edited.
      </span>
    </div>
  );
}

// Confirmed inline before submitting, same as DeleteChipButton above and for
// the same reason (no native confirm()) — but here it's warranted even more:
// there is no unsign action anywhere in the app, so this is genuinely
// irreversible, unlike Delete which is a recoverable soft-delete.
export function SignButton({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    await action();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 print:hidden">
        <span className="text-sm text-amber-800">Sign &amp; lock? This can&apos;t be undone.</span>
        <button
          type="button"
          disabled={pending}
          onClick={handleConfirm}
          className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {pending ? "Signing…" : "Yes, sign & lock"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setConfirming(false)}
          className="rounded-md px-3 py-1.5 text-sm text-stone-500 hover:text-stone-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 print:hidden"
    >
      Sign &amp; Lock
    </button>
  );
}
