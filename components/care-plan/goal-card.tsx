"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { saveGoal, addProgressNote } from "@/app/actions/care-plan";
import { GoalStatusSelect } from "@/components/goal-status-select";
import { TextField, TextArea, DateField, SelectField, Checkbox } from "@/components/intake/form-fields";
import { GOAL_PRIORITY_OPTIONS } from "@/components/intake/options";
import type { CarePlanGoal, CarePlanProgressNote, GoalStatus } from "@/app/generated/prisma/client";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";

type Goal = CarePlanGoal & { progressNotes: CarePlanProgressNote[] };

export function GoalCard({
  memberId,
  carePlanId,
  goal,
  fields,
}: {
  memberId: string;
  carePlanId: string;
  goal: Goal;
  fields: ResolvedFormFields;
}) {
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
          {goal.priority && <p className="text-xs text-stone-600">{goal.priority}</p>}
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

      {/* Hidden via CSS rather than unmounted when collapsed — the page's
          single "Save Care Plan" button finds this form by id and submits it
          with requestSubmit(), which would silently skip a collapsed goal
          (and drop its edits) if the form weren't still in the DOM. */}
      <div hidden={!expanded} className="mt-5 space-y-6 border-t border-stone-100 pt-5">
          {/* No submit button here — the page's single "Save Care Plan" button submits this
              (and every other goal's form, plus the coordinator-action fields below that
              point back at this id via `form=`) together via requestSubmit(). */}
          <form
            key={`${goal.id}-${goal.updatedAt.getTime()}`}
            id={`goal-form-${goal.id}`}
            action={saveGoal.bind(null, memberId, carePlanId, goal.id)}
            className="space-y-5"
          >
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">Opportunity</p>
              <TextField id={`${goal.id}-opportunity`} name="opportunity" label="Opportunity" defaultValue={goal.opportunity} />
              <div className="mt-2 max-w-xs">
                <SelectField
                  id={`${goal.id}-priority`}
                  name="priority"
                  label={fields["ccp.priority"]?.label ?? "Priority"}
                  options={fields["ccp.priority"]?.options ?? GOAL_PRIORITY_OPTIONS}
                  defaultValue={goal.priority}
                />
              </div>
              <div className="mt-2">
                <Checkbox
                  name="hasAllocationTool"
                  label="Member has an Allocation Tool for Community Benefit Personal Care Services (PCS)"
                  defaultChecked={goal.hasAllocationTool ?? false}
                />
              </div>
            </div>

            <div className="space-y-4">
              <TextArea id={`${goal.id}-strengths`} name="strengths" label="Strengths" defaultValue={goal.strengths} rows={3} />
              <TextArea id={`${goal.id}-barriers`} name="barriers" label="Barriers" defaultValue={goal.barriers} rows={3} />
            </div>

            <div className="space-y-4">
              <div>
                <Checkbox name="memberDeferredDiscussion" label="Member deferred discussion" defaultChecked={goal.memberDeferredDiscussion ?? false} />
                <div className="mt-2">
                  <TextField id={`${goal.id}-deferredReason`} name="deferredReason" label="Reason deferred (if stated)" defaultValue={goal.deferredReason} />
                </div>
              </div>
              <div>
                <Checkbox name="memberDeclinedDiscussion" label="Member declined discussion" defaultChecked={goal.memberDeclinedDiscussion ?? false} />
                <div className="mt-2">
                  <TextField id={`${goal.id}-declinedReason`} name="declinedReason" label="Reason declined (if stated)" defaultValue={goal.declinedReason} />
                </div>
              </div>
            </div>

            <TextArea id={`${goal.id}-goalText`} name="goalText" label="Goal" defaultValue={goal.goalText} rows={8} />

            <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Action I will take (Member)</p>
              <TextArea
                id={`${goal.id}-memberActionText`}
                name="memberActionText"
                label="Action I will take to achieve this goal"
                defaultValue={goal.memberActionText}
                rows={2}
              />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <DateField id={`${goal.id}-memberActionBeginDate`} name="memberActionBeginDate" label="Begin Date" defaultValue={toInputDate(goal.memberActionBeginDate)} />
                <DateField id={`${goal.id}-memberActionTargetEndDate`} name="memberActionTargetEndDate" label="Target End Date" defaultValue={toInputDate(goal.memberActionTargetEndDate)} />
                <DateField id={`${goal.id}-memberActionAccomplishedDate`} name="memberActionAccomplishedDate" label="Date Completed" defaultValue={toInputDate(goal.memberActionAccomplishedDate)} />
              </div>
            </div>
          </form>

          <div className="border-t border-stone-100 pt-5">
            <ProgressNoteColumn
              idPrefix={`${goal.id}-member`}
              label="Member Progress Updates"
              notes={memberNotes}
              action={addProgressNote.bind(null, memberId, carePlanId, goal.id)}
              track="MEMBER"
            />
          </div>

          <div className="rounded-lg border border-stone-100 bg-stone-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-600">Action my care coordinator will take</p>
            <TextArea
              id={`${goal.id}-coordinatorActionText`}
              name="coordinatorActionText"
              label="Action my care coordinator will take to help me achieve this goal"
              defaultValue={goal.coordinatorActionText}
              rows={2}
              form={`goal-form-${goal.id}`}
            />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DateField
                id={`${goal.id}-coordinatorActionBeginDate`}
                name="coordinatorActionBeginDate"
                label="Begin Date"
                defaultValue={toInputDate(goal.coordinatorActionBeginDate)}
                form={`goal-form-${goal.id}`}
              />
              <DateField
                id={`${goal.id}-coordinatorActionTargetEndDate`}
                name="coordinatorActionTargetEndDate"
                label="Target End Date"
                defaultValue={toInputDate(goal.coordinatorActionTargetEndDate)}
                form={`goal-form-${goal.id}`}
              />
              <DateField
                id={`${goal.id}-coordinatorActionAccomplishedDate`}
                name="coordinatorActionAccomplishedDate"
                label="Date Completed"
                defaultValue={toInputDate(goal.coordinatorActionAccomplishedDate)}
                form={`goal-form-${goal.id}`}
              />
            </div>
          </div>

          <ProgressNoteColumn
            idPrefix={`${goal.id}-coordinator`}
            label="Care Coordinator Progress Updates"
            notes={coordinatorNotes}
            action={addProgressNote.bind(null, memberId, carePlanId, goal.id)}
            track="COORDINATOR"
          />
      </div>
    </Card>
  );
}

function ProgressNoteColumn({
  idPrefix,
  label,
  notes,
  action,
  track,
}: {
  idPrefix: string;
  label: string;
  notes: CarePlanProgressNote[];
  action: (formData: FormData) => Promise<void>;
  track: "MEMBER" | "COORDINATOR";
}) {
  // "+ Add Update" adds another blank note/date row rather than submitting —
  // the page's single "Save Care Plan" button submits this form (like every
  // other goal-form and progress-form), same as the CCP's other repeatable
  // sections (Team Members, Medications). Every row shares the same "note"/
  // "date" field names; addProgressNote zips them by position and skips any
  // left blank.
  const [rowCount, setRowCount] = useState(1);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-600">{label}</p>
      <ul className="mb-3 space-y-2">
        {notes.length === 0 && <li className="text-sm text-stone-500">No progress updates yet.</li>}
        {notes.map((n) => (
          <li key={n.id} className="rounded-md border border-stone-100 bg-white p-2 text-sm text-stone-700">
            <p>{n.note}</p>
            {n.date && <p className="mt-1 text-xs text-stone-500">{formatDate(n.date)}</p>}
          </li>
        ))}
      </ul>
      <form id={`${idPrefix}-progress-form`} action={action} className="space-y-3 print:hidden">
        <input type="hidden" name="track" value={track} />
        {Array.from({ length: rowCount }, (_, i) => (
          <div key={i} className="space-y-2 rounded-lg border border-stone-100 bg-stone-50 p-3">
            <TextArea id={`${idPrefix}-note-${i}`} name="note" label="Progress Update" rows={2} />
            <DateField id={`${idPrefix}-date-${i}`} name="date" label="Date" />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRowCount((c) => c + 1)}
          className="rounded-md border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 hover:border-stone-400 hover:text-charcoal"
        >
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
