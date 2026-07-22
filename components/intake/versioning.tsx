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
}: {
  items: HistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  newAction: () => Promise<void>;
  newLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
      {items.length === 0 && <p className="text-sm text-stone-400">No records yet.</p>}
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-stone-900 bg-stone-100 text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {formatDate(item.dateLabel)}
            {item.signedAt ? (
              <span title={`Signed by ${item.signedByName ?? "unknown"} on ${formatDateTime(item.signedAt)}`}>🔒</span>
            ) : (
              <span className="text-stone-400">·{item.status === "COMPLETED" ? "Completed" : "Draft"}</span>
            )}
          </button>
        );
      })}
      <form action={newAction}>
        <button
          type="submit"
          className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-stone-900"
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
// newAction may optionally return the new record's id. Some callers (e.g.
// createNewCarePlan) redirect() instead, which forces a full remount that
// naturally re-selects the new record — for those, a returned id isn't
// needed. Callers that can't redirect() (e.g. General Communication, which
// would otherwise snap back to the first tab) must return the new id so we
// can select it here on the client instead.
export function SimpleHistoryBar({
  items,
  selectedId,
  onSelect,
  newAction,
  newLabel = "+ New",
}: {
  items: { id: string; dateLabel: Date }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  newAction: () => Promise<string | void>;
  newLabel?: string;
}) {
  async function handleNew() {
    const newId = await newAction();
    if (typeof newId === "string") onSelect(newId);
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-4">
      {items.length === 0 && <p className="text-sm text-stone-400">No records yet.</p>}
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-stone-900 bg-stone-100 text-stone-900"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            {formatDate(item.dateLabel)}
          </button>
        );
      })}
      <button
        type="button"
        onClick={handleNew}
        className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-stone-900"
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
    <form action={action}>
      <button
        type="submit"
        className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
      >
        Sign &amp; Lock
      </button>
    </form>
  );
}
