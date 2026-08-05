"use client";

import { formatDate, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui";

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
            {onDelete && (
              <button
                type="button"
                title="Delete this record (admin only)"
                onClick={() => {
                  const confirmMsg = item.signedAt
                    ? "This record is signed and locked. Delete it anyway? It's recoverable, but this hides it everywhere immediately."
                    : "Delete this record? It's recoverable, but this hides it everywhere immediately.";
                  if (window.confirm(confirmMsg)) onDelete(item.id);
                }}
                className="rounded-full px-1.5 py-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            )}
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
            {onDelete && (
              <button
                type="button"
                title="Delete this record (admin only)"
                onClick={() => {
                  if (window.confirm("Delete this record? It's recoverable, but this hides it everywhere immediately.")) {
                    onDelete(item.id);
                  }
                }}
                className="rounded-full px-1.5 py-0.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            )}
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

export function SignButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="print:hidden">
      <button
        type="submit"
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        Sign &amp; Lock
      </button>
    </form>
  );
}
