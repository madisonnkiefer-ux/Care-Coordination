"use client";

import { useState } from "react";
import { Card, Badge } from "@/components/ui";
import { saveHra, createNewHra, signHra } from "@/app/actions/hra";
import { toDateInputValue } from "@/lib/format";
import { getCnaRequiredReasons } from "@/lib/hra-cna-required";
import type { HraAssessment } from "@/app/generated/prisma/client";
import { HistoryBar, SignedBanner, SignButton, type HistoryItem } from "@/components/intake/versioning";
import {
  TextField,
  TextArea,
  DateField,
  SelectField,
  YesNoField,
  YesNoNaField,
} from "@/components/intake/form-fields";
import {
  SEX_ASSIGNED_AT_BIRTH_OPTIONS,
  CURRENT_GENDER_OPTIONS,
  SEXUAL_IDENTITY_OPTIONS,
  ASSESSMENT_TYPE_OPTIONS,
  ASSESSMENT_METHOD_OPTIONS,
  SPECIAL_PREFERENCES_OPTIONS,
  HEALTH_CONDITIONS_OPTIONS,
  CURRENT_SITUATIONS_OPTIONS,
  LIVING_SITUATION_OPTIONS,
  ADL_HELP_OPTIONS,
} from "@/components/intake/options";

type HraRecord = HraAssessment & { signedBy: { name: string } | null };

export function HraTab({ memberId, records, currentUserIsAdmin }: { memberId: string; records: HraRecord[]; currentUserIsAdmin: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(records[0]?.id ?? null);
  const draft = records.find((r) => r.id === selectedId) ?? records[0] ?? null;
  const locked = Boolean(draft?.signedAt);
  const cnaReasons = draft ? getCnaRequiredReasons(draft) : [];

  const historyItems: HistoryItem[] = records.map((r) => ({
    id: r.id,
    dateLabel: r.assessmentDate,
    status: r.status,
    signedAt: r.signedAt,
    signedByName: r.signedBy?.name ?? null,
  }));

  return (
    <div className="p-8">
      <HistoryBar items={historyItems} selectedId={draft?.id ?? null} onSelect={setSelectedId} newAction={createNewHra.bind(null, memberId)} newLabel="+ New HRA" />

      {!draft ? (
        <p className="text-sm text-stone-500">No HRA yet — click &quot;+ New HRA&quot; to start one.</p>
      ) : (
      <form
        key={`${draft.id}-${draft.updatedAt.getTime()}`}
        action={saveHra.bind(null, memberId, draft.id)}
        className="max-w-3xl space-y-6"
      >
      {locked && <SignedBanner signedByName={draft.signedBy?.name ?? null} signedAt={draft.signedAt as Date} />}

      {cnaReasons.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-start gap-2">
            <Badge color="red">CNA Required</Badge>
          </div>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-red-800">
            {cnaReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Card>
      )}

      <fieldset disabled={locked} className="contents">
      <Card title="Assessment">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DateField name="assessmentDate" label="Assessment Date" defaultValue={toDateInputValue(draft?.assessmentDate)} />
          <SelectField name="assessmentType" label="Assessment Type" options={ASSESSMENT_TYPE_OPTIONS} defaultValue={draft?.assessmentType} />
          <SelectField name="assessmentMethod" label="Assessment Method" options={ASSESSMENT_METHOD_OPTIONS} defaultValue={draft?.assessmentMethod} />
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">1. Do you have a language need other than English?</p>
            <YesNoField name="languageNeedOtherThanEnglish" label="" defaultValue={draft?.languageNeedOtherThanEnglish} />
            <div className="mt-3">
              <YesNoField name="needsTranslationServices" label="Do you need translation services?" defaultValue={draft?.needsTranslationServices} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">2. Do you have any special preferences we should be aware of?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="specialPreferences" label="" options={SPECIAL_PREFERENCES_OPTIONS} defaultValue={draft?.specialPreferences} />
              <TextField name="specialPreferencesDescribe" label="Describe" defaultValue={draft?.specialPreferencesDescribe} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">
              3. Do you have any current or past physical and/or behavioral health conditions or diagnoses?
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="healthConditions" label="" options={HEALTH_CONDITIONS_OPTIONS} defaultValue={draft?.healthConditions} />
              <TextField name="healthConditionsDescribe" label="Describe" defaultValue={draft?.healthConditionsDescribe} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">4. What sex were you assigned at birth?</p>
            <SelectField name="sexAssignedAtBirth" label="" options={SEX_ASSIGNED_AT_BIRTH_OPTIONS} defaultValue={draft?.sexAssignedAtBirth} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">5. What is your current gender?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="currentGender" label="" options={CURRENT_GENDER_OPTIONS} defaultValue={draft?.currentGender} />
              <TextField name="currentGenderOther" label="If other, please describe" defaultValue={draft?.currentGenderOther} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">6. What is your current sexual identity?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="sexualIdentity" label="" options={SEXUAL_IDENTITY_OPTIONS} defaultValue={draft?.sexualIdentity} />
              <TextField name="sexualIdentityOther" label="If other, please describe" defaultValue={draft?.sexualIdentityOther} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">7. What are your preferred pronouns?</p>
            <TextField name="preferredPronouns" label="" defaultValue={draft?.preferredPronouns} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">8. Are you pregnant?</p>
            <YesNoField name="isPregnant" label="" defaultValue={draft?.isPregnant} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">
              9. For individuals in the Perinatal/Postpartum population and those with children up to five (5) years of age in the home.
            </p>
            <p className="mb-2 text-xs text-stone-500">
              You qualify for a program called Medicaid Home Visiting. This program offers support and tips on breastfeeding and
              nutrition, safe sleep for your baby, finding childcare, preparing your child for school, and more. This benefit is no
              cost to you. You have been automatically referred, so a home visiting provider will contact you to explain the program
              and ask if you would like to enroll.
            </p>
            <YesNoNaField name="perinatalPostpartumOrYoungChild" label="" defaultValue={draft?.perinatalPostpartumOrYoungChild} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">10. Do you currently use tobacco and/or nicotine products?</p>
            <YesNoNaField name="usesTobaccoNicotine" label="" defaultValue={draft?.usesTobaccoNicotine} />
            <div className="mt-3">
              <YesNoNaField
                name="interestedInCessationProgram"
                label="If yes, are you interested in receiving information on cessation programs?"
                defaultValue={draft?.interestedInCessationProgram}
              />
            </div>
            <div className="mt-3">
              <YesNoField
                name="historyOfTobaccoUse"
                label="Do you have a history of using tobacco and/or nicotine products?"
                defaultValue={draft?.historyOfTobaccoUse}
              />
            </div>
          </div>

          <div>
            <YesNoNaField
              name="worriedAboutFood"
              label="11. Within the past 12 months, have you worried that you would run out of food or that the food you bought would run out and you did not have the money to get more? (If yes, refer for assistance)"
              defaultValue={draft?.worriedAboutFood}
            />
          </div>

          <div>
            <YesNoNaField
              name="reliableTransportation"
              label="12. Do you have reliable transportation? (If no, refer for assistance)"
              defaultValue={draft?.reliableTransportation}
            />
          </div>

          <div>
            <YesNoNaField
              name="needsHelpFindingProvider"
              label="13. Do you need help finding a physical or behavioral healthcare provider?"
              defaultValue={draft?.needsHelpFindingProvider}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">14. Have you visited the Emergency Room in the past 12 months?</p>
            <YesNoField name="erVisitsPast12Months" label="" defaultValue={draft?.erVisitsPast12Months} />
            <div className="mt-3 max-w-xs">
              <TextField name="erVisitCount" label="If yes, how many visits?" defaultValue={draft?.erVisitCount} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">15. Have you stayed overnight in the hospital in the past 6 months?</p>
            <YesNoField name="hospitalOvernightPast6Months" label="" defaultValue={draft?.hospitalOvernightPast6Months} />
            <div className="mt-3">
              <YesNoField
                name="readmittedWithin30Days"
                label="If yes, were you readmitted within 30 days of discharge?"
                defaultValue={draft?.readmittedWithin30Days}
              />
            </div>
          </div>

          <div className="max-w-xs">
            <TextField name="medicationsCount" label="16. How many medications are you currently taking?" defaultValue={draft?.medicationsCount} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">17. Are you currently in any of the following situations?</p>
            <SelectField name="currentSituations" label="" options={CURRENT_SITUATIONS_OPTIONS} defaultValue={draft?.currentSituations} />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">18. What is your current living situation?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="livingSituation" label="" options={LIVING_SITUATION_OPTIONS} defaultValue={draft?.livingSituation} />
              <TextField name="livingSituationOther" label="If other, please describe" defaultValue={draft?.livingSituationOther} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">19. Do you need help with 2 or more of the following?</p>
            <YesNoField name="needsHelpWith2OrMoreAdls" label="" defaultValue={draft?.needsHelpWith2OrMoreAdls} />
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="adlHelpNeeded" label="" options={ADL_HELP_OPTIONS} defaultValue={draft?.adlHelpNeeded} />
              <TextField name="adlHelpOther" label="If other, please describe" defaultValue={draft?.adlHelpOther} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-stone-900">
              20. An advance directive is a form that lets your loved ones know your health care choices if you are too sick to make
              them yourself.
            </p>
            <YesNoField
              name="hasLivingWillOrAdvanceDirective"
              label="Do you currently have a living will or an advanced directive in place?"
              defaultValue={draft?.hasLivingWillOrAdvanceDirective}
            />
            <div className="mt-3">
              <YesNoField
                name="wantsMoreAdvanceDirectiveInfo"
                label="Would you like more information regarding advanced directives?"
                defaultValue={draft?.wantsMoreAdvanceDirectiveInfo}
              />
            </div>
          </div>

          <TextArea name="mainHealthConcerns" label="21. What are your main health concerns right now?" defaultValue={draft?.mainHealthConcerns} rows={3} />

          <TextArea
            name="mostSignificantNeedsToday"
            label="22. What are your most significant needs today?"
            defaultValue={draft?.mostSignificantNeedsToday}
            rows={3}
          />

          <div>
            <YesNoField
              name="interestedInCareCoordination"
              label="23. Is the Member interested in receiving Care Coordination Services?"
              defaultValue={draft?.interestedInCareCoordination}
            />
          </div>
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
          <button
            type="submit"
            name="intent"
            value="complete"
            className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Complete Assessment
          </button>
        </div>
      )}
      </form>
      )}

      {draft && !locked && draft.status === "COMPLETED" && currentUserIsAdmin && (
        <div className="mt-4 max-w-3xl">
          <SignButton action={signHra.bind(null, memberId, draft.id)} />
        </div>
      )}
    </div>
  );
}
