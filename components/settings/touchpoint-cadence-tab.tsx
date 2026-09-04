"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui";
import { setTouchpointCadence, resetTouchpointCadence } from "@/app/actions/touchpoint-cadence";
import type { CadenceSettingsRow } from "@/lib/data/touchpoint-cadence";
import type { CadenceProgramKey, ComplianceUnit } from "@/lib/touchpoint-compliance";

const PROGRAM_LABELS: Record<CadenceProgramKey, string> = {
  Prenatal: "Pre-natal",
  Postpartum: "Postpartum",
  GYN: "GYN",
  Default: "Default (no program set)",
};

export function TouchpointCadenceTab({ rows }: { rows: CadenceSettingsRow[] }) {
  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        How often each program needs a member contacted before they&apos;re flagged as under-contacted — the
        &quot;Contacted&quot; status badge, the Supervisor Dashboard&apos;s outreach gaps, and the Monthly Performance
        reports all use these same rules. A member is considered compliant once they&apos;ve reached the required
        number of successful contacts, or hit the required number of attempts (successful or not) — whichever comes
        first — within the window.
      </p>

      <div className="overflow-hidden rounded-xl border border-stone-200">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Program</th>
              <th className="px-4 py-3 font-medium">Window</th>
              <th className="px-4 py-3 font-medium">Required Successful</th>
              <th className="px-4 py-3 font-medium">Required Attempts</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <CadenceRow key={row.program} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CadenceRow({ row }: { row: CadenceSettingsRow }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(setTouchpointCadence.bind(null, row.program), undefined);

  if (editing) {
    return (
      <tr>
        <td colSpan={5} className="px-4 py-3">
          <form action={formAction} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Program</label>
              <p className="px-1 py-1.5 text-sm text-stone-800">{PROGRAM_LABELS[row.program]}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Window</label>
              <select
                name="unit"
                defaultValue={row.unit}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              >
                <option value="month">Every month</option>
                <option value="quarter">Every quarter (rolling, from enrollment)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Required Successful
              </label>
              <input
                type="number"
                name="requiredSuccessful"
                min={1}
                defaultValue={row.requiredSuccessful}
                className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">
                Required Attempts
              </label>
              <input
                type="number"
                name="requiredAttempts"
                min={1}
                defaultValue={row.requiredAttempts}
                className="w-24 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {pending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </div>
            {state?.error && (
              <p className="w-full text-sm text-red-600" role="alert">
                {state.error}
              </p>
            )}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="px-4 py-2.5 text-stone-800">{PROGRAM_LABELS[row.program]}</td>
      <td className="px-4 py-2.5 text-stone-600">{unitLabel(row.unit)}</td>
      <td className="px-4 py-2.5 text-stone-600">{row.requiredSuccessful}</td>
      <td className="px-4 py-2.5 text-stone-600">
        {row.requiredAttempts}
        {row.isDefault && (
          <span className="ml-2">
            <Badge color="slate">Default</Badge>
          </span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
          >
            Edit
          </button>
          {!row.isDefault && (
            <form action={resetTouchpointCadence.bind(null, row.program)}>
              <button
                type="submit"
                className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Reset to Default
              </button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}

function unitLabel(unit: ComplianceUnit) {
  return unit === "month" ? "Every month" : "Every quarter (rolling, from enrollment)";
}
