"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { FloatingSaveBar } from "@/components/floating-save-bar";
import { saveGeneralCommunication, createNewGeneralCommunication } from "@/app/actions/general-communication";
import type { GeneralCommunication } from "@/app/generated/prisma/client";
import { SelectField, DateField } from "@/components/intake/form-fields";
import { CONTACT_METHOD_OPTIONS, PERSON_CONTACTED_OPTIONS, UNSUCCESSFUL_REASON_OPTIONS } from "@/components/care-plan/outreach-options";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";
import { getComplianceCadence, getWindowStart, isTouchpointCompliant } from "@/lib/touchpoint-compliance";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import { mergeCustomQuestions, type CustomQuestionDef } from "@/lib/custom-questions-shared";
import { OrderedStack } from "@/components/intake/ordered-items";

type CommRecord = GeneralCommunication & { author: { name: string } | null };

export function GeneralCommunicationTab({
  memberId,
  records,
  program,
  enrollmentDate,
  fields,
  fieldOrder,
  customQuestionDefs,
  customAnswersByRecord,
}: {
  memberId: string;
  records: CommRecord[];
  program: string | null;
  enrollmentDate: Date;
  fields: ResolvedFormFields;
  fieldOrder: string[];
  customQuestionDefs: CustomQuestionDef[];
  customAnswersByRecord: Record<string, Record<string, unknown>>;
}) {
  // Newest first, and newly-created entries have nothing documented yet, so
  // open one automatically instead of leaving the coordinator to find it.
  const sortedRecords = useMemo(() => [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()), [records]);
  const [expandedId, setExpandedId] = useState<string | null>(sortedRecords[0]?.id ?? null);

  const { daysSinceLastSuccessful, cadence, attemptsInWindow, successfulInWindow, compliant } = useMemo(() => {
    const now = new Date();
    const successfulDates = records.filter((r) => r.successful).map((r) => r.createdAt);
    const lastSuccessful = successfulDates.length ? new Date(Math.max(...successfulDates.map((d) => d.getTime()))) : null;
    const days = lastSuccessful ? Math.floor((now.getTime() - lastSuccessful.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const windowCadence = getComplianceCadence(program);
    const windowStart = getWindowStart(windowCadence.unit, now, enrollmentDate);
    const inWindow = records.filter((r) => r.createdAt >= windowStart);

    return {
      daysSinceLastSuccessful: days,
      cadence: windowCadence,
      attemptsInWindow: inWindow.length,
      successfulInWindow: inWindow.filter((r) => r.successful).length,
      compliant: isTouchpointCompliant(records, program, enrollmentDate, now),
    };
  }, [records, program, enrollmentDate]);

  async function handleNewEntry() {
    const newId = await createNewGeneralCommunication(memberId);
    if (typeof newId === "string") setExpandedId(newId);
  }

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

      <div className="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={handleNewEntry}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
        >
          + New Entry
        </button>
      </div>

      {sortedRecords.length === 0 ? (
        <p className="text-sm text-slate-500">No General Communication entries yet — click &quot;+ New Entry&quot; to start one.</p>
      ) : (
        <div className="max-w-4xl space-y-3">
          {sortedRecords.map((record) =>
            expandedId === record.id ? (
              <GeneralCommunicationEntryForm
                key={record.id}
                memberId={memberId}
                record={record}
                fields={fields}
                fieldOrder={fieldOrder}
                customQuestions={mergeCustomQuestions(customQuestionDefs, customAnswersByRecord[record.id])}
                onCollapse={() => setExpandedId(null)}
              />
            ) : (
              <CollapsedEntry key={record.id} record={record} onExpand={() => setExpandedId(record.id)} />
            )
          )}
        </div>
      )}
    </div>
    </FormFieldsProvider>
  );
}

function CollapsedEntry({ record, onExpand }: { record: CommRecord; onExpand: () => void }) {
  const statusLabel = record.successful === true ? "Successful" : record.successful === false ? "Unsuccessful" : "Not noted";
  const statusClass =
    record.successful === true
      ? "bg-emerald-100 text-emerald-700"
      : record.successful === false
        ? "bg-red-100 text-red-700"
        : "bg-stone-100 text-stone-500";

  return (
    <button
      type="button"
      onClick={onExpand}
      className="w-full rounded-2xl border border-stone-100 bg-white p-4 text-left shadow-sm hover:border-stone-300 print:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-stone-500">{formatDate(record.createdAt)}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>{statusLabel}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-stone-700">{record.body || "No notes entered."}</p>
    </button>
  );
}

function GeneralCommunicationEntryForm({
  memberId,
  record,
  fields,
  fieldOrder,
  customQuestions,
  onCollapse,
}: {
  memberId: string;
  record: CommRecord;
  fields: ResolvedFormFields;
  fieldOrder: string[];
  customQuestions: ReturnType<typeof mergeCustomQuestions>;
  onCollapse: () => void;
}) {
  return (
    <form
      key={`${record.id}-${record.updatedAt.getTime()}`}
      action={saveGeneralCommunication.bind(null, memberId, record.id)}
      onSubmit={onCollapse}
      className="space-y-4"
    >
      <Card title="Outreach Details">
        <p className="mb-3 text-xs text-stone-400">
          Started {formatDateTime(record.createdAt)} by {record.author?.name ?? "unknown"}
          {record.updatedAt > record.createdAt && ` · last updated ${formatDateTime(record.updatedAt)}`}
        </p>
        <OrderedStack
          order={fieldOrder}
          items={[
            {
              key: "generalComm.contactMethod",
              el: (
                <SelectField
                  name="contactMethod"
                  label={fields["generalComm.contactMethod"]?.label ?? "Contact Method"}
                  options={fields["generalComm.contactMethod"]?.options ?? CONTACT_METHOD_OPTIONS}
                  defaultValue={record.contactMethod}
                />
              ),
            },
            {
              key: "generalComm.personContacted",
              el: (
                <div>
                  <SelectField
                    name="personContacted"
                    label={fields["generalComm.personContacted"]?.label ?? "Person Contacted"}
                    options={fields["generalComm.personContacted"]?.options ?? PERSON_CONTACTED_OPTIONS}
                    defaultValue={record.personContacted}
                  />
                  <div className="mt-4">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Successful?</p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm text-stone-600">
                        <input type="radio" name="successful" value="yes" defaultChecked={record.successful === true} className="h-4 w-4" />
                        Yes
                      </label>
                      <label className="flex items-center gap-2 text-sm text-stone-600">
                        <input type="radio" name="successful" value="no" defaultChecked={record.successful === false} className="h-4 w-4" />
                        No
                      </label>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "generalComm.unsuccessfulReason",
              el: (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    name="unsuccessfulReason"
                    label={fields["generalComm.unsuccessfulReason"]?.label ?? "If unsuccessful, reason"}
                    options={fields["generalComm.unsuccessfulReason"]?.options ?? UNSUCCESSFUL_REASON_OPTIONS}
                    defaultValue={record.unsuccessfulReason}
                  />
                  <DateField name="nextAttemptDate" label="Next Attempt Date" defaultValue={toDateInputValue(record.nextAttemptDate)} />
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Card title="General Communication">
        <textarea
          name="body"
          defaultValue={record.body ?? ""}
          rows={12}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
        />
      </Card>

      <CustomQuestionsSection questions={customQuestions} />

      <FloatingSaveBar>
        <button
          type="button"
          onClick={onCollapse}
          className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          Collapse
        </button>
        <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
          Save
        </button>
      </FloatingSaveBar>
    </form>
  );
}
