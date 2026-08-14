"use client";

import { useState, useTransition } from "react";
import { updateGoalStatus } from "@/app/actions/care-plan";
import type { GoalStatus } from "@/app/generated/prisma/client";

const OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_TRACK", label: "On Track" },
  { value: "COMPLETE", label: "Complete" },
];

export function GoalStatusSelect({
  memberId,
  goalId,
  status,
}: {
  memberId: string;
  goalId: string;
  status: GoalStatus;
}) {
  // Retired NOT_STARTED goals (pre-existing data) display as In Progress —
  // the underlying record isn't rewritten until the user actually changes it.
  const [current, setCurrent] = useState<GoalStatus>(status === "NOT_STARTED" ? "IN_PROGRESS" : status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={current}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as GoalStatus;
          setError(null);
          startTransition(async () => {
            const result = await updateGoalStatus(memberId, goalId, next);
            if (result?.error) {
              setError(result.error);
            } else {
              setCurrent(next);
            }
          });
        }}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium disabled:opacity-50"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="max-w-[220px] text-right text-[11px] text-red-600" role="alert">{error}</p>}
    </div>
  );
}
