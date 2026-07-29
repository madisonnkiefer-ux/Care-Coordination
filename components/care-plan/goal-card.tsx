"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { saveGoal, addProgressNote } from "@/app/actions/care-plan";
import { GoalStatusSelect } from "@/components/goal-status-select";
import { TextField, TextArea, DateField, SelectField, Checkbox } from "@/components/intake/form-fields";
import { GOAL_PRIORITY_OPTIONS } from "@/components/intake/options";
import type { CarePlanGoal, CarePlanProgressNote, GoalStatus } from "@/app/generated/prisma/client";

type Goal = CarePlanGoal & { progressNotes: CarePlanProgressNote[] };

export function GoalCard({ memberId, carePlanId, goal }: { memberId: string; carePlanId: string; goal: Goal }) {
  // Defaults to expanded so a full CCP print picks up every goal's detail
  // without the coordinator having to click through each one first.
  const [expanded, setExpanded] = useState(true);
  const memberNotes = goal.progressNotes.filter((n) => n.track === "MEMBER");
  const coordinatorNotes = goal.progressNotes.filter((n) => n.track === "COORDINATOR");

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex-1 text-left">
          <p className="text-sm font-semibold text-charcoal">{goal.opportunity || goal.goalText || "Untitled goal"}</p>
          {goal.priority && <p className="text-xs text-stone-500">{goal.priority}</p>}
        </button>
        <GoalStatusSelect memberId={memberId} goalId={goal.id} status={goal.status as GoalStatus} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-charcoal hover:underline print:hidden"
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-6 border-t border-stone-100 pt-5">
          <form
            key={`${goal.id}-${goal.updatedAt.getTime()}`}
            action={saveGoal.bind(null, memberId, carePlanId, goal.id)}
            className="space-y-5"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Opportunity</p>
              <TextField name="opportunity" label="Opportunity" defaultValue={goal.opportunity} />
              <div className="mt-2 max-w-xs">
                <SelectField name="priority" label="Priority" options={GOAL_PRIORITY_OPTIONS} defaultValue={goal.priority} />
              </div>
              <div className="mt-2">
                <Checkbox
                  name="hasAllocationTool"
                  label="Member has an Allocation Tool for Community Benefit Personal Care Services (PCS)"
                  defaultChecked={goal.hasAllocationTool ?? false}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextArea name="strengths" label="Strengths" defaultValue={goal.strengths} rows={3} />
              <TextArea name="barriers" label="Barriers" defaultValue={goal.barriers} rows={3} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Checkbox name="memberDeferredDiscussion" label="Member deferred discussion" defaultChecked={goal.memberDeferredDiscussion ?? false} />
                <div className="mt-2">
                  <TextField name="deferredReason" label="Reason deferred (if stated)" defaultValue={goal.deferredReason} />
                </div>
              </div>
              <div>
                <Checkbox name="memberDeclinedDiscussion" label="Member declined discussion" defaultChecked={goal.memberDeclinedDiscussion ?? false} />
                <div className="mt-2">
                  <TextField name="declinedReason" label="Reason declined (if stated)" defaultValue={goal.declinedReason} />
                </div>
              </div>
            </div>

            <TextArea name="goalText" label="Goal" defaultValue={goal.goalText} rows={3} />

            <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Action I will take (Member)</p>
              <TextArea name="memberActionText" label="Action I will take to achieve this goal" defaultValue={goal.memberActionText} rows={2} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DateField name="memberActionBeginDate" label="Begin Date" defaultValue={toInputDate(goal.memberActionBeginDate)} />
                <DateField name="memberActionTargetEndDate" label="Target End Date" defaultValue={toInputDate(goal.memberActionTargetEndDate)} />
                <DateField name="memberActionAccomplishedDate" label="Date Goal Accomplished" defaultValue={toInputDate(goal.memberActionAccomplishedDate)} />
              </div>
            </div>

            <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Action my care coordinator will take</p>
              <TextArea name="coordinatorActionText" label="Action my care coordinator will take to help me achieve this goal" defaultValue={goal.coordinatorActionText} rows={2} />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DateField name="coordinatorActionBeginDate" label="Begin Date" defaultValue={toInputDate(goal.coordinatorActionBeginDate)} />
                <DateField name="coordinatorActionTargetEndDate" label="Target End Date" defaultValue={toInputDate(goal.coordinatorActionTargetEndDate)} />
                <DateField name="coordinatorActionAccomplishedDate" label="Date Goal Accomplished" defaultValue={toInputDate(goal.coordinatorActionAccomplishedDate)} />
              </div>
            </div>

            <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 print:hidden">
              Save Goal
            </button>
          </form>

          <div className="grid grid-cols-1 gap-6 border-t border-stone-100 pt-5 sm:grid-cols-2">
            <ProgressNoteColumn
              label="Member Progress Updates"
              notes={memberNotes}
              action={addProgressNote.bind(null, memberId, carePlanId, goal.id)}
              track="MEMBER"
            />
            <ProgressNoteColumn
              label="Care Coordinator Progress Updates"
              notes={coordinatorNotes}
              action={addProgressNote.bind(null, memberId, carePlanId, goal.id)}
              track="COORDINATOR"
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function ProgressNoteColumn({
  label,
  notes,
  action,
  track,
}: {
  label: string;
  notes: CarePlanProgressNote[];
  action: (formData: FormData) => Promise<void>;
  track: "MEMBER" | "COORDINATOR";
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <ul className="mb-3 space-y-2">
        {notes.length === 0 && <li className="text-sm text-stone-400">No progress updates yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-stone-100 bg-white p-2 text-sm text-stone-700">
            <p>{n.note}</p>
            {n.date && <p className="mt-1 text-xs text-stone-400">{formatDate(n.date)}</p>}
          </li>
        ))}
      </ul>
      <form action={action} className="space-y-2 print:hidden">
        <input type="hidden" name="track" value={track} />
        <TextArea name="note" label="Progress Update" rows={2} />
        <DateField name="date" label="Date" />
        <button type="submit" className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
          + Add Update
        </button>
      </form>
    </div>
  );
}

function toInputDate(d: Date | null): string | null {
  if (!d) return null;
  return new Date(d).toISOString().slice(0, 10);
}
