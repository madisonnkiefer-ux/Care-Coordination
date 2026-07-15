"use client";

import { useTransition } from "react";
import { updateGoalStatus } from "@/app/actions/care-plan";
import type { GoalStatus } from "@/app/generated/prisma/client";

const OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "NOT_STARTED", label: "Not Started" },
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
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as GoalStatus;
        startTransition(() => {
          updateGoalStatus(memberId, goalId, next);
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
  );
}
