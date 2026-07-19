"use client";

import { useState } from "react";

// Client-side "add row" UI for repeatable child records (team members,
// medications, backup/disaster contacts). Every row renders the same field
// names, read back on save via zipRows() (lib/form-rows.ts). Rows start
// populated from `initialRows`; "+ Add Row" appends one more blank row.
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
  const [count, setCount] = useState(Math.max(initialRows.length, minRows));

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-lg border border-stone-100 bg-stone-50 p-3">
          {renderRow(initialRows[i] ?? {}, i)}
        </div>
      ))}
      <button
        type="button"
        onClick={() => setCount((c) => c + 1)}
        className="rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-stone-900"
      >
        {addLabel}
      </button>
    </div>
  );
}
