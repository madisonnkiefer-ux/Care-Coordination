"use client";

import { Card } from "@/components/ui";
import { FloatingSaveBar, useSavedConfirmation } from "@/components/floating-save-bar";
import { SubmitButton } from "@/components/submit-button";
import { DateField, TextArea, YesNoNaField } from "@/components/intake/form-fields";
import { saveHedisMeasures } from "@/app/actions/hedis";
import type { HedisMeasures } from "@/app/generated/prisma/client";
import { toDateInputValue } from "@/lib/format";

function lower(v: string | null | undefined) {
  return v ? v.toLowerCase() : null;
}

// No record yet (never saved) — the epoch is a stable sentinel so the very
// first successful save (a real, recent updatedAt) still correctly reads as
// a change and flashes the confirmation, same as every later save does.
const NEVER_SAVED = new Date(0);

export function HedisTab({ memberId, record }: { memberId: string; record: HedisMeasures | null }) {
  const justSaved = useSavedConfirmation(record?.updatedAt ?? NEVER_SAVED);

  return (
    <div className="p-8">
      <form
        key={record ? `${record.id}-${record.updatedAt.getTime()}` : "new"}
        action={saveHedisMeasures.bind(null, memberId)}
        className="max-w-2xl space-y-6"
      >
        <Card>
          <div className="max-w-xs">
            <DateField name="deliveryDate" label="Delivery Date" defaultValue={toDateInputValue(record?.deliveryDate)} />
          </div>
        </Card>

        <Card title="Hedis Pre-Natal (First Trimester)">
          <YesNoNaField
            name="prenatalFirstTrimester"
            label=""
            defaultValue={lower(record?.prenatalFirstTrimester)}
          />
          <div className="mt-3 max-w-xs">
            <DateField name="prenatalFirstTrimesterDate" label="Date" defaultValue={toDateInputValue(record?.prenatalFirstTrimesterDate)} />
          </div>
        </Card>

        <Card title="HEDIS Post-Partum 1st Touchpoint">
          <YesNoNaField
            name="postPartum1stTouchpoint"
            label=""
            defaultValue={lower(record?.postPartum1stTouchpoint)}
          />
          <div className="mt-3 max-w-xs">
            <DateField name="postPartum1stTouchpointDate" label="Date" defaultValue={toDateInputValue(record?.postPartum1stTouchpointDate)} />
          </div>
        </Card>

        <Card title="HEDIS Post-Partum 2nd Touchpoint">
          <YesNoNaField
            name="postPartum2ndTouchpoint"
            label=""
            defaultValue={lower(record?.postPartum2ndTouchpoint)}
          />
          <div className="mt-3 max-w-xs">
            <DateField name="postPartum2ndTouchpointDate" label="Date" defaultValue={toDateInputValue(record?.postPartum2ndTouchpointDate)} />
          </div>
        </Card>

        <Card title="Notes">
          <TextArea name="notes" label="" defaultValue={record?.notes} rows={5} />
        </Card>

        <FloatingSaveBar savedConfirmation={justSaved}>
          <SubmitButton pendingLabel="Saving…" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-50">
            Save
          </SubmitButton>
        </FloatingSaveBar>
      </form>
    </div>
  );
}
