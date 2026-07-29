"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";
import { saveGeneralCommunication, createNewGeneralCommunication } from "@/app/actions/general-communication";
import type { GeneralCommunication } from "@/app/generated/prisma/client";
import { SimpleHistoryBar } from "@/components/intake/versioning";
import { SelectField, DateField } from "@/components/intake/form-fields";
import { CONTACT_METHOD_OPTIONS, PERSON_CONTACTED_OPTIONS, UNSUCCESSFUL_REASON_OPTIONS } from "@/components/care-plan/outreach-options";
import { formatDateTime, toDateInputValue } from "@/lib/format";
import { getComplianceCadence, isTouchpointCompliant } from "@/lib/touchpoint-compliance";

type CommRecord = GeneralCommunication & { author: { name: string } | null };

export function GeneralCommunicationTab({
  memberId,
  records,
  program,
}: {
  memberId: string;
  records: CommRecord[];
  program: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const record = records.find((r) => r.id === selectedId) ?? records[0] ?? null;

  const historyItems = records.map((r) => ({ id: r.id, dateLabel: r.createdAt }));

  const { daysSinceLastSuccessful, cadence, attemptsInWindow, successfulInWindow, compliant } = useMemo(() => {
    const now = new Date();
    const successfulDates = records.filter((r) => r.successful).map((r) => r.createdAt);
    const lastSuccessful = successfulDates.length ? new Date(Math.max(...successfulDates.map((d) => d.getTime()))) : null;
    const days = lastSuccessful ? Math.floor((now.getTime() - lastSuccessful.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const windowCadence = getComplianceCadence(program);
    const windowStart =
      windowCadence.unit === "month"
        ? new Date(now.getFullYear(), now.getMonth(), 1)
        : new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const inWindow = records.filter((r) => r.createdAt >= windowStart);

    return {
      daysSinceLastSuccessful: days,
      cadence: windowCadence,
      attemptsInWindow: inWindow.length,
      successfulInWindow: inWindow.filter((r) => r.successful).length,
      compliant: isTouchpointCompliant(records, program, now),
    };
  }, [records, program]);

  return (
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

      <SimpleHistoryBar
        items={historyItems}
        selectedId={record?.id ?? null}
        onSelect={setSelectedId}
        newAction={createNewGeneralCommunication.bind(null, memberId)}
        newLabel="+ New Entry"
      />

      {!record ? (
        <p className="text-sm text-slate-500">No General Communication entries yet — click &quot;+ New Entry&quot; to start one.</p>
      ) : (
        <form
          key={`${record.id}-${record.updatedAt.getTime()}`}
          action={saveGeneralCommunication.bind(null, memberId, record.id)}
          className="max-w-4xl space-y-4"
        >
          <Card title="Outreach Details">
            <p className="mb-3 text-xs text-stone-400">
              Started {formatDateTime(record.createdAt)} by {record.author?.name ?? "unknown"}
              {record.updatedAt > record.createdAt && ` · last updated ${formatDateTime(record.updatedAt)}`}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField name="contactMethod" label="Contact Method" options={CONTACT_METHOD_OPTIONS} defaultValue={record.contactMethod} />
              <SelectField name="personContacted" label="Person Contacted" options={PERSON_CONTACTED_OPTIONS} defaultValue={record.personContacted} />
            </div>

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

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="unsuccessfulReason"
                label="If unsuccessful, reason"
                options={UNSUCCESSFUL_REASON_OPTIONS}
                defaultValue={record.unsuccessfulReason}
              />
              <DateField name="nextAttemptDate" label="Next Attempt Date" defaultValue={toDateInputValue(record.nextAttemptDate)} />
            </div>
          </Card>

          <Card title="General Communication">
            <textarea
              name="body"
              defaultValue={record.body ?? ""}
              rows={12}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </Card>
          <button type="submit" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 print:hidden">
            Save
          </button>
        </form>
      )}
    </div>
  );
}
