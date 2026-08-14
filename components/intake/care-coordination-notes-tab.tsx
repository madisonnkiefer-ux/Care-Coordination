"use client";

import { Card } from "@/components/ui";
import { FloatingSaveBar } from "@/components/floating-save-bar";
import { saveCareCoordinationNote } from "@/app/actions/care-coordination-notes";
import type { CareCoordinationNote } from "@/app/generated/prisma/client";
import { TextArea, SelectField, YesNoField, YesNoNaField, CheckboxGroup, TextField } from "@/components/intake/form-fields";
import {
  CCL1_CRITERIA_OPTIONS,
  CCL2_CRITERIA_OPTIONS,
  CANNOT_BE_LEVELED_DOWN_OPTIONS,
  CARE_COORDINATION_LEVEL_OPTIONS,
  ABP_CLASSIFICATION_OPTIONS,
  COMPLEX_CASE_OPTIONS,
} from "@/components/intake/options";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import type { CustomQuestionForRecord } from "@/lib/custom-questions-shared";

export function CareCoordinationNotesTab({
  memberId,
  record: draft,
  locked,
  fields,
  customQuestions,
}: {
  memberId: string;
  record: CareCoordinationNote;
  locked: boolean;
  fields: ResolvedFormFields;
  customQuestions: CustomQuestionForRecord[];
}) {
  return (
    <FormFieldsProvider form="ccn" fields={fields}>
    <div className="p-8">
      <form
        key={`${draft.id}-${draft.updatedAt.getTime()}`}
        action={saveCareCoordinationNote.bind(null, memberId, draft.id)}
        className="max-w-3xl space-y-6"
      >
      <fieldset disabled={locked} className="contents">
      <Card title="Summary">
        <div className="space-y-6">
          <TextArea
            name="physicalHealthSummary"
            label="1. Provide a summary of the Member's Physical Health (PH), including objective observations related to the Member's physical health."
            defaultValue={draft?.physicalHealthSummary}
            rows={4}
          />
          <TextArea
            name="behavioralHealthSummary"
            label="2. Provide a summary of the Member's Behavioral Health (BH), including objective observations related to the Member's behavior."
            defaultValue={draft?.behavioralHealthSummary}
            rows={4}
          />
          <TextArea
            name="safetyVisionHearingCaregiverObservations"
            label="3. Provide overall, objective observations of: safety of the Member's home environment; Member's vision, hearing, language; Member's caregiver resources or needs, including functional-needs observations (e.g. mobility, gait, DME use, range of motion, ability to sign/eat/drink, and anything affecting ADLs/IADLs)."
            defaultValue={draft?.safetyVisionHearingCaregiverObservations}
            rows={5}
          />
          <TextArea
            name="hrsnAndAdditionalObservations"
            label="Member's HRSN needs, and any additional observations."
            defaultValue={draft?.hrsnAndAdditionalObservations}
            rows={4}
          />
          <TextArea
            name="communityProviderReferrals"
            label="4. What community/provider referrals were needed and/or provided to the member?"
            defaultValue={draft?.communityProviderReferrals}
            rows={3}
          />
          <TextArea
            name="schedulingAssistanceProvided"
            label="5. What assistance was needed and/or provided to the member in scheduling appointments?"
            defaultValue={draft?.schedulingAssistanceProvided}
            rows={3}
          />
        </div>
      </Card>

      <Card title="6. Per comprehensive needs assessment, member meets criteria for:">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">CCL1</p>
            <CheckboxGroup name="ccl1Criteria" options={fields["ccn.ccl1Criteria"]?.options ?? CCL1_CRITERIA_OPTIONS} defaultValues={draft?.ccl1Criteria} />
            <div className="mt-3 max-w-md">
              <TextField name="ccl1OtherSpecify" label="Other, specify" defaultValue={draft?.ccl1OtherSpecify} />
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">CCL2</p>
            <CheckboxGroup name="ccl2Criteria" options={fields["ccn.ccl2Criteria"]?.options ?? CCL2_CRITERIA_OPTIONS} defaultValues={draft?.ccl2Criteria} />
            <div className="mt-3 max-w-md">
              <TextField name="ccl2OtherSpecify" label="Other, specify" defaultValue={draft?.ccl2OtherSpecify} />
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <p className="mb-2 text-xs font-semibold text-stone-700">*Members with the below indicators may not be leveled down.</p>
            <CheckboxGroup
              name="cannotBeLeveledDownIndicators"
              options={fields["ccn.cannotBeLeveledDownIndicators"]?.options ?? CANNOT_BE_LEVELED_DOWN_OPTIONS}
              defaultValues={draft?.cannotBeLeveledDownIndicators}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <SelectField
            name="careCoordinationLevel"
            label="7. What is the Member's identified Care Coordination Level?"
            options={fields["ccn.careCoordinationLevel"]?.options ?? CARE_COORDINATION_LEVEL_OPTIONS}
            defaultValue={draft?.careCoordinationLevel}
          />
          <TextArea
            name="eligibilityConclusionsSummary"
            label="8. Summarize the care coordinator's conclusions about the Member's eligibility and access to community resources and the next steps that will be taken by the care coordinator and the Member."
            defaultValue={draft?.eligibilityConclusionsSummary}
            rows={4}
          />
          <div>
            <YesNoNaField name="cbsqCbmaCompleted" label="9. Were the CBSQ and CBMA completed?" defaultValue={draft?.cbsqCbmaCompleted} />
            <div className="mt-2 max-w-md">
              <TextField name="cbsqCbmaNotCompletedExplain" label="If no, explain" defaultValue={draft?.cbsqCbmaNotCompletedExplain} />
            </div>
          </div>

          <YesNoField name="hasCoe100Abp" label="10. Does the member have a COE 100 ABP?" defaultValue={draft?.hasCoe100Abp} />
          <div>
            <YesNoField
              name="wantsAbpExemptEvaluation"
              label="Does the member want to be evaluated for ABP exempt?"
              defaultValue={draft?.wantsAbpExemptEvaluation}
            />
            <div className="mt-2 flex gap-6">
              {(fields["ccn.abpClassification"]?.options ?? ABP_CLASSIFICATION_OPTIONS).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm text-stone-600">
                  <input type="radio" name="abpClassification" value={opt} defaultChecked={draft?.abpClassification === opt} className="h-4 w-4" />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <YesNoField name="qualifiesForAbpExempt" label="11. Does the member qualify for ABP exempt?" defaultValue={draft?.qualifiesForAbpExempt} />
            <div className="mt-2 max-w-md">
              <TextField name="abpExemptReason" label="If yes, specify PH or BH exempt reason" defaultValue={draft?.abpExemptReason} />
            </div>
          </div>

          <YesNoNaField
            name="hcbsSettingsRuleAssessed"
            label="12. Has the care coordinator assessed the Member's living arrangement to ensure compliance with the HCBS settings rule?"
            defaultValue={draft?.hcbsSettingsRuleAssessed}
          />

          <div>
            <YesNoField
              name="providedServicesBenefitsInfo"
              label="13. Member was provided with information on all available services and benefits."
              defaultValue={draft?.providedServicesBenefitsInfo}
            />
            <div className="mt-2 max-w-md">
              <TextField name="providedServicesBenefitsInfoExplain" label="If no, explain" defaultValue={draft?.providedServicesBenefitsInfoExplain} />
            </div>
          </div>

          <TextArea
            name="memberSatisfactionDescription"
            label="14. Describe the member's satisfaction with services and care."
            defaultValue={draft?.memberSatisfactionDescription}
            rows={3}
          />

          <SelectField
            name="complexCaseManagementOrNfloc"
            label="15. Is the Member being assessed for Complex Case Management or considered for initial NFLOC?"
            options={fields["ccn.complexCaseManagementOrNfloc"]?.options ?? COMPLEX_CASE_OPTIONS}
            defaultValue={draft?.complexCaseManagementOrNfloc}
          />
        </div>
      </Card>

      <CustomQuestionsSection questions={customQuestions} />
      </fieldset>

      {!locked && (
        <FloatingSaveBar>
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
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Complete
          </button>
        </FloatingSaveBar>
      )}
      </form>
    </div>
    </FormFieldsProvider>
  );
}
