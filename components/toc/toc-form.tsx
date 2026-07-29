"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { HistoryBar, SignedBanner, SignButton, type HistoryItem } from "@/components/intake/versioning";
import { TextField, TextArea, DateField, SelectField } from "@/components/intake/form-fields";
import { NeedsSection } from "@/components/toc/needs-section";
import { TOC_NEEDS_SECTIONS, TRANSITION_TYPE_OPTIONS } from "@/components/toc/needs-config";
import { createNewTocRecord, saveTocRecord, signTocRecord } from "@/app/actions/toc";
import { toDateInputValue } from "@/lib/format";
import type { TocRecord, TocNeed } from "@/app/generated/prisma/client";

type TocRecordWithRelations = TocRecord & { signedBy: { name: string } | null; needs: TocNeed[] };

export function TocForm({
  memberId,
  records,
  currentUserIsAdmin,
}: {
  memberId: string;
  records: TocRecordWithRelations[];
  currentUserIsAdmin: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const draft = records.find((r) => r.id === selectedId) ?? records[0] ?? null;
  const locked = Boolean(draft?.signedAt);

  const historyItems: HistoryItem[] = records.map((r) => ({
    id: r.id,
    dateLabel: r.createdAt,
    status: r.status,
    signedAt: r.signedAt,
    signedByName: r.signedBy?.name ?? null,
  }));

  return (
    <div className="p-8">
      <HistoryBar
        items={historyItems}
        selectedId={draft?.id ?? null}
        onSelect={setSelectedId}
        newAction={createNewTocRecord.bind(null, memberId)}
        newLabel="+ New TOC"
      />

      {!draft ? (
        <p className="text-sm text-stone-500">No Transition of Care record yet — click &quot;+ New TOC&quot; to start one.</p>
      ) : (
        <>
          <form
            key={`${draft.id}-${draft.updatedAt.getTime()}`}
            action={saveTocRecord.bind(null, memberId, draft.id)}
            className="max-w-3xl space-y-6"
          >
            {locked && <SignedBanner signedByName={draft.signedBy?.name ?? null} signedAt={draft.signedAt as Date} />}

            <fieldset disabled={locked} className="contents">
              <Card title="1. Demographic Information">
                <p className="mb-3 text-xs text-stone-400">
                  Member name, date of birth, Medicaid ID, contact info, and emergency contact are already on file under
                  Demographics — not repeated here.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DateField name="mcoNotificationDate" label="Date of MCO Notification of Transition" defaultValue={toDateInputValue(draft.mcoNotificationDate)} />
                  <DateField name="tocPlanStartDate" label="TOC Plan Start Date" defaultValue={toDateInputValue(draft.tocPlanStartDate)} />
                  <DateField name="tocPlanCompletionDate" label="TOC Plan Completion Date" defaultValue={toDateInputValue(draft.tocPlanCompletionDate)} />
                </div>

                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Member&apos;s Address Prior to Transition</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <TextField name="priorAddressStreet" label="Street" defaultValue={draft.priorAddressStreet} />
                  <TextField name="priorAddressCity" label="City" defaultValue={draft.priorAddressCity} />
                  <TextField name="priorAddressStateZip" label="State / Zip" defaultValue={draft.priorAddressStateZip} />
                </div>

                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">
                  For Children in State Custody (CISC) Members (if applicable)
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField name="ciscPcName" label="Permanency Coordinator (PC) Name" defaultValue={draft.ciscPcName} />
                  <TextField name="ciscPcPhone" label="PC Phone" defaultValue={draft.ciscPcPhone} />
                </div>

                <div className="mt-4">
                  <SelectField name="transitionType" label="Transition Type" options={TRANSITION_TYPE_OPTIONS} defaultValue={draft.transitionType} />
                </div>
              </Card>

              <Card>
                <TextArea
                  name="dcTeamContactSummary"
                  label="Summary of contact attempts with Discharge (D/C) Planning Team (if D/C planning team was not reached, enter &quot;None&quot; for the needs in Section 2 below)"
                  defaultValue={draft.dcTeamContactSummary}
                  rows={3}
                />
              </Card>

              {TOC_NEEDS_SECTIONS.map((section) => (
                <NeedsSection key={section.section} config={section} existingNeeds={draft.needs} />
              ))}

              <Card title="5. Monthly Follow-Up (for 3 months)">
                <p className="mb-4 text-xs text-stone-400">
                  The Transition of Care Plan shall remain in place for a minimum of 60 calendar days from the date of the
                  decision to pursue transition or until the transition has occurred and a new CCP is in place.
                </p>
                <div className="space-y-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="grid grid-cols-1 items-start gap-2 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-4">
                      <p className="text-sm font-medium text-stone-700">Follow-up {n}</p>
                      <DateField
                        name={`followUp${n}Date`}
                        label="Date"
                        defaultValue={toDateInputValue(draft[`followUp${n}Date` as "followUp1Date"])}
                      />
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm text-stone-600">
                          <input
                            type="radio"
                            name={`followUp${n}Status`}
                            value="NONE"
                            defaultChecked={draft[`followUp${n}Status` as "followUp1Status"] === "NONE"}
                            className="h-4 w-4"
                          />
                          None
                        </label>
                        <label className="flex items-center gap-2 text-sm text-stone-600">
                          <input
                            type="radio"
                            name={`followUp${n}Status`}
                            value="YES"
                            defaultChecked={draft[`followUp${n}Status` as "followUp1Status"] === "YES"}
                            className="h-4 w-4"
                          />
                          Yes
                        </label>
                      </div>
                      <input
                        name={`followUp${n}Notes`}
                        placeholder="Additional Needs/Notes"
                        defaultValue={draft[`followUp${n}Notes` as "followUp1Notes"] ?? ""}
                        className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </fieldset>

            {!locked && (
              <div className="flex gap-3 print:hidden">
                <button
                  type="submit"
                  name="intent"
                  value="draft"
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Save Draft
                </button>
                <button type="submit" name="intent" value="complete" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
                  Complete
                </button>
              </div>
            )}
          </form>

          {!locked && draft.status === "COMPLETED" && currentUserIsAdmin && (
            <div className="mt-4 max-w-3xl">
              <SignButton action={signTocRecord.bind(null, memberId, draft.id)} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
