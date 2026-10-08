"use client";

import { useState } from "react";

// Client-side "add/remove row" UI for repeatable child records (team
// members, medications, backup/disaster contacts). Every row renders the
// same field names, read back on save via zipRows() (lib/form-rows.ts).
// Rows start populated from `initialRows`; "+ Add Row" appends one more
// blank row, and each row can be removed (e.g. to undo an accidental add)
// independently of its position.
//
// Rows are keyed by a stable id, not array index — removing a row from the
// middle must not cause React to reuse a surviving row's DOM node (and the
// uncontrolled inputs inside it) for a different row's data.
export function RepeatableRows<T extends Record<string, string | null>>({
  initialRows,
  minRows = 1,
  renderRow,
  addLabel = "+ Add Row",
}: {
  initialRows: T[];
  minRows?: number;
  renderRow: (row: Partial<T>, index: number) => React.ReactNode;
  addLabel?: string;
}) {
  const [rows, setRows] = useState<{ key: number; data: Partial<T> }[]>(() => {
    const count = Math.max(initialRows.length, minRows);
    return Array.from({ length: count }, (_, i) => ({ key: i, data: initialRows[i] ?? {} }));
  });

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.key} className="relative rounded-lg border border-stone-100 bg-stone-50 p-3">
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
            aria-label="Remove row"
            title="Remove row"
            className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-xs font-medium text-stone-400 hover:bg-red-50 hover:text-red-600 print:hidden"
          >
            ✕
          </button>
          <div className="pr-6">{renderRow(row.data, i)}</div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          setRows((prev) => {
            const key = prev.length ? Math.max(...prev.map((r) => r.key)) + 1 : 0;
            return [...prev, { key, data: {} }];
          })
        }
        className="rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-charcoal print:hidden"
      >
        {addLabel}
      </button>
    </div>
  );
}
