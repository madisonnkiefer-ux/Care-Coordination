"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { saveGeneralCommunication, createGeneralCommunicationEntry, deleteGeneralCommunicationEntry } from "@/app/actions/general-communication";
import type { CclLevel, GeneralCommunication } from "@/app/generated/prisma/client";
import { DateField } from "@/components/intake/form-fields";
import { formatDateTime, toDateInputValue } from "@/lib/format";
import { getComplianceCadence, getWindowStart, isTouchpointCompliant, type CadenceOverrides, type ContactRecord } from "@/lib/touchpoint-compliance";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import { mergeCustomQuestions, type CustomQuestionDef } from "@/lib/custom-questions-shared";

type CommRecord = GeneralCommunication & { author: { name: string } | null };

export function GeneralCommunicationTab({
  memberId,
  records,
  progressNoteContacts,
  program,
  cclLevel,
  lastCnaCompletedDate,
  enrollmentDate,
  cadenceOverrides,
  fields,
  customQuestionDefs,
  customAnswersByRecord,
}: {
  memberId: string;
  records: CommRecord[];
  progressNoteContacts: ContactRecord[];
  program: string | null;
  cclLevel?: CclLevel | null;
  lastCnaCompletedDate?: Date | null;
  enrollmentDate: Date;
  cadenceOverrides?: CadenceOverrides;
  fields: ResolvedFormFields;
  customQuestionDefs: CustomQuestionDef[];
  customAnswersByRecord: Record<string, Record<string, unknown>>;
}) {
  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [records]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Compliance counts both logged General Communication entries and the
  // member's own ("Member Progress Updates") care plan goal notes — same
  // two sources every other compliance surface in the app combines (see
  // lib/touchpoint-compliance.ts's progressNotesToContacts). Judging it off
  // General Communication alone made a member contacted only via progress
  // notes look non-compliant here while every other view correctly showed
  // them compliant.
  const { daysSinceLastSuccessful, cadence, attemptsInWindow, successfulInWindow, compliant } = useMemo(() => {
    const now = new Date();
    const allContacts: ContactRecord[] = [...records, ...progressNoteContacts];
    const successfulDates = allContacts.filter((r) => r.successful).map((r) => r.createdAt);
    const lastSuccessful = successfulDates.length ? new Date(Math.max(...successfulDates.map((d) => d.getTime()))) : null;
    const days = lastSuccessful ? Math.floor((now.getTime() - lastSuccessful.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const windowCadence = getComplianceCadence(program, cadenceOverrides);
    const windowStart = getWindowStart(windowCadence.unit, now, enrollmentDate);
    const inWindow = allContacts.filter((r) => r.createdAt >= windowStart);

    return {
      daysSinceLastSuccessful: days,
      cadence: windowCadence,
      attemptsInWindow: inWindow.length,
      successfulInWindow: inWindow.filter((r) => r.successful).length,
      compliant: isTouchpointCompliant(allContacts, program, enrollmentDate, now, cadenceOverrides, {
        cclLevel,
        lastCnaCompletedDate: lastCnaCompletedDate ?? null,
      }),
    };
  }, [records, progressNoteContacts, program, enrollmentDate, cadenceOverrides, cclLevel, lastCnaCompletedDate]);

  return (
    <FormFieldsProvider form="generalComm" fields={fields}>
    <div className="p-8">
      {records.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-stone-500">
          <span>
            <span className="font-semibold text-stone-700">
              {daysSinceLastSuccessful === null ? "No successful contact yet" : `${daysSinceLastSuccessful} day${daysSinceLastSuccessful === 1 ? "" : "s"}`}
            </span>{" "}
            since last successful contact
          </span>
          <span>
            <span className="font-semibold text-stone-700">{successfulInWindow}</span> successful ·{" "}
            <span className="font-semibold text-stone-700">{attemptsInWindow}</span>/{cadence.requiredAttempts} attempts this{" "}
            {cadence.unit}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-medium ${compliant ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
            {compliant ? "Compliant" : "Not compliant"}
          </span>
        </div>
      )}

      <div className="max-w-4xl space-y-3">
        <NewEntryComposer key={records.length} memberId={memberId} />

        {sortedRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No notes yet — add one above.</p>
        ) : (
          sortedRecords.map((record) =>
            editingId === record.id ? (
              <GeneralCommunicationEntryForm
                key={record.id}
                memberId={memberId}
                record={record}
                customQuestions={mergeCustomQuestions(customQuestionDefs, customAnswersByRecord[record.id])}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <CommunicationNote
                key={record.id}
                record={record}
                onEdit={() => setEditingId(record.id)}
                onDelete={() => deleteGeneralCommunicationEntry(memberId, record.id)}
              />
            )
          )
        )}
      </div>
    </div>
    </FormFieldsProvider>
  );
}

// One textarea, one Save button — just a running log of notes. No
// separate "outreach attempt" workflow with its own fields to fill in;
// coordinators just write down what happened and when.
function NewEntryComposer({ memberId }: { memberId: string }) {
  return (
    <form action={createGeneralCommunicationEntry.bind(null, memberId)} className="space-y-3">
      <Card>
        {/* Left blank by default so a fresh note's timestamp is "right now" (to
            the second) — multiple notes added back-to-back on the same day
            still sort and delete correctly. Only fill this in to backdate a
            note that documents something that happened earlier. */}
        <div className="mb-3 max-w-xs">
          <DateField name="contactDate" label="Date (leave blank for now)" defaultValue={null} />
        </div>
        <textarea
          name="body"
          placeholder="Write a note…"
          rows={6}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
      </Card>
      <div className="flex justify-end print:hidden">
        <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          Save
        </button>
      </div>
    </form>
  );
}

// Every note is editable/deletable inline, right in the list — no
// clicking into a separate full-page form. Nothing here should ever feel
// write-once.
function CommunicationNote({
  record,
  onEdit,
  onDelete,
}: {
  record: CommRecord;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-stone-500">
          {formatDateTime(record.createdAt)} · {record.author?.name ?? "unknown"}
          {record.updatedAt > record.createdAt && ` · edited ${formatDateTime(record.updatedAt)}`}
        </span>
        <div className="flex gap-3 text-xs font-medium print:hidden">
          <button type="button" onClick={onEdit} className="text-stone-500 hover:text-charcoal">
            Edit
          </button>
          <form
            action={async () => {
              if (!confirm("Delete this note? This cannot be undone.")) return;
              await onDelete();
            }}
          >
            <button type="submit" className="text-red-500 hover:text-red-700">
              Delete
            </button>
          </form>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{record.body || "No notes entered."}</p>
    </div>
  );
}

function GeneralCommunicationEntryForm({
  memberId,
  record,
  customQuestions,
  onDone,
}: {
  memberId: string;
  record: CommRecord;
  customQuestions: ReturnType<typeof mergeCustomQuestions>;
  onDone: () => void;
}) {
  return (
    <form
      key={`${record.id}-${record.updatedAt.getTime()}`}
      action={saveGeneralCommunication.bind(null, memberId, record.id)}
      onSubmit={onDone}
      className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="_expectedUpdatedAt" value={record.updatedAt.getTime()} />
      <div className="max-w-xs">
        <DateField name="contactDate" label="Date" defaultValue={toDateInputValue(record.createdAt)} />
      </div>
      <textarea
        name="body"
        defaultValue={record.body ?? ""}
        rows={8}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />

      <CustomQuestionsSection questions={customQuestions} />

      <div className="flex justify-end gap-2 print:hidden">
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          Save
        </button>
      </div>
    </form>
  );
}
