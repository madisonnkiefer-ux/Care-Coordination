"use client";

import { Card, Badge } from "@/components/ui";
import { FloatingSaveBar } from "@/components/floating-save-bar";
import { saveHra } from "@/app/actions/hra";
import { toDateInputValue } from "@/lib/format";
import { getCnaRequiredReasons } from "@/lib/hra-cna-required";
import type { HraAssessment } from "@/app/generated/prisma/client";
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
  MEDICATIONS_COUNT_OPTIONS,
} from "@/components/intake/options";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import type { CustomQuestionForRecord } from "@/lib/custom-questions-shared";
import { OrderedStack } from "@/components/intake/ordered-items";

export function HraTab({
  memberId,
  record: draft,
  locked,
  fields,
  fieldOrder,
  customQuestions,
}: {
  memberId: string;
  record: HraAssessment;
  locked: boolean;
  fields: ResolvedFormFields;
  fieldOrder: string[];
  customQuestions: CustomQuestionForRecord[];
}) {
  const cnaReasons = getCnaRequiredReasons(draft);

  return (
    <FormFieldsProvider form="hra" fields={fields}>
    <div className="p-8">
      <form
        key={`${draft.id}-${draft.updatedAt.getTime()}`}
        action={saveHra.bind(null, memberId, draft.id)}
        className="max-w-3xl space-y-6"
      >
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
          <SelectField name="assessmentType" label={fields["hra.assessmentType"]?.label ?? "Assessment Type"} options={fields["hra.assessmentType"]?.options ?? ASSESSMENT_TYPE_OPTIONS} defaultValue={draft?.assessmentType} />
          <SelectField name="assessmentMethod" label={fields["hra.assessmentMethod"]?.label ?? "Assessment Method"} options={fields["hra.assessmentMethod"]?.options ?? ASSESSMENT_METHOD_OPTIONS} defaultValue={draft?.assessmentMethod} />
        </div>
      </Card>

      <Card>
        <OrderedStack
          order={fieldOrder}
          items={[
            {
              key: "hra.languageNeedOtherThanEnglish",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">1. Do you have a language need other than English?</p>
                  <YesNoField name="languageNeedOtherThanEnglish" label="" defaultValue={draft?.languageNeedOtherThanEnglish} />
                </div>
              ),
            },
            {
              key: "hra.needsTranslationServices",
              el: <YesNoField name="needsTranslationServices" label="Do you need translation services?" defaultValue={draft?.needsTranslationServices} />,
            },
            {
              key: "hra.specialPreferences",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">2. Do you have any special preferences we should be aware of?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField name="specialPreferences" label="" options={fields["hra.specialPreferences"]?.options ?? SPECIAL_PREFERENCES_OPTIONS} defaultValue={draft?.specialPreferences} />
                    <TextField name="specialPreferencesDescribe" label="Describe" defaultValue={draft?.specialPreferencesDescribe} />
                  </div>
                </div>
              ),
            },
            {
              key: "hra.healthConditions",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">
                    3. Do you have any current or past physical and/or behavioral health conditions or diagnoses?
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField name="healthConditions" label="" options={fields["hra.healthConditions"]?.options ?? HEALTH_CONDITIONS_OPTIONS} defaultValue={draft?.healthConditions} />
                    <TextField name="healthConditionsDescribe" label="Describe" defaultValue={draft?.healthConditionsDescribe} />
                  </div>
                </div>
              ),
            },
            {
              key: "shared.sexAssignedAtBirth",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">4. What sex were you assigned at birth?</p>
                  <SelectField name="sexAssignedAtBirth" label="" options={fields["shared.sexAssignedAtBirth"]?.options ?? SEX_ASSIGNED_AT_BIRTH_OPTIONS} defaultValue={draft?.sexAssignedAtBirth} />
                </div>
              ),
            },
            {
              key: "shared.currentGender",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">5. What is your current gender?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField name="currentGender" label="" options={fields["shared.currentGender"]?.options ?? CURRENT_GENDER_OPTIONS} defaultValue={draft?.currentGender} />
                    <TextField name="currentGenderOther" label="If other, please describe" defaultValue={draft?.currentGenderOther} />
                  </div>
                </div>
              ),
            },
            {
              key: "shared.sexualIdentity",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">6. What is your current sexual identity?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField name="sexualIdentity" label="" options={fields["shared.sexualIdentity"]?.options ?? SEXUAL_IDENTITY_OPTIONS} defaultValue={draft?.sexualIdentity} />
                    <TextField name="sexualIdentityOther" label="If other, please describe" defaultValue={draft?.sexualIdentityOther} />
                  </div>
                </div>
              ),
            },
            {
              key: "hra.isPregnant",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">7. Are you pregnant?</p>
                  <YesNoField name="isPregnant" label="" defaultValue={draft?.isPregnant} />
                </div>
              ),
            },
            {
              key: "hra.perinatalPostpartumOrYoungChild",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">
                    8. For individuals in the Perinatal/Postpartum population and those with children up to five (5) years of age in the home.
                  </p>
                  <p className="mb-2 text-xs text-stone-500">
                    You qualify for a program called Medicaid Home Visiting. This program offers support and tips on breastfeeding and
                    nutrition, safe sleep for your baby, finding childcare, preparing your child for school, and more. This benefit is no
                    cost to you. You have been automatically referred, so a home visiting provider will contact you to explain the program
                    and ask if you would like to enroll.
                  </p>
                  <YesNoNaField name="perinatalPostpartumOrYoungChild" label="" defaultValue={draft?.perinatalPostpartumOrYoungChild} />
                </div>
              ),
            },
            {
              key: "hra.usesTobaccoNicotine",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">9. Do you currently use tobacco and/or nicotine products?</p>
                  <YesNoNaField name="usesTobaccoNicotine" label="" defaultValue={draft?.usesTobaccoNicotine} />
                </div>
              ),
            },
            {
              key: "hra.interestedInCessationProgram",
              el: (
                <YesNoNaField
                  name="interestedInCessationProgram"
                  label="If yes, are you interested in receiving information on cessation programs?"
                  defaultValue={draft?.interestedInCessationProgram}
                />
              ),
            },
            {
              key: "hra.historyOfTobaccoUse",
              el: (
                <YesNoField
                  name="historyOfTobaccoUse"
                  label="Do you have a history of using tobacco and/or nicotine products?"
                  defaultValue={draft?.historyOfTobaccoUse}
                />
              ),
            },
            {
              key: "hra.worriedAboutFood",
              el: (
                <YesNoNaField
                  name="worriedAboutFood"
                  label="10. Within the past 12 months, have you worried that you would run out of food or that the food you bought would run out and you did not have the money to get more? (If yes, refer for assistance)"
                  defaultValue={draft?.worriedAboutFood}
                />
              ),
            },
            {
              key: "hra.reliableTransportation",
              el: (
                <YesNoNaField
                  name="reliableTransportation"
                  label="11. Do you have reliable transportation? (If no, refer for assistance)"
                  defaultValue={draft?.reliableTransportation}
                />
              ),
            },
            {
              key: "hra.needsHelpFindingProvider",
              el: (
                <YesNoNaField
                  name="needsHelpFindingProvider"
                  label="12. Do you need help finding a physical or behavioral healthcare provider?"
                  defaultValue={draft?.needsHelpFindingProvider}
                />
              ),
            },
            {
              key: "hra.erVisitsPast12Months",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">13. Have you visited the Emergency Room in the past 12 months?</p>
                  <YesNoField name="erVisitsPast12Months" label="" defaultValue={draft?.erVisitsPast12Months} />
                </div>
              ),
            },
            {
              key: "hra.erVisitCount",
              el: (
                <div className="max-w-xs">
                  <TextField name="erVisitCount" label="If yes, how many visits?" defaultValue={draft?.erVisitCount} />
                </div>
              ),
            },
            {
              key: "hra.hospitalOvernightPast6Months",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">14. Have you stayed overnight in the hospital in the past 6 months?</p>
                  <YesNoField name="hospitalOvernightPast6Months" label="" defaultValue={draft?.hospitalOvernightPast6Months} />
                </div>
              ),
            },
            {
              key: "hra.readmittedWithin30Days",
              el: (
                <YesNoField
                  name="readmittedWithin30Days"
                  label="If yes, were you readmitted within 30 days of discharge?"
                  defaultValue={draft?.readmittedWithin30Days}
                />
              ),
            },
            {
              key: "hra.medicationsCount",
              el: (
                <div className="max-w-xs">
                  <SelectField
                    name="medicationsCount"
                    label="15. How many medications are you currently taking? (if 6 or more, CNA required)"
                    options={fields["hra.medicationsCount"]?.options ?? MEDICATIONS_COUNT_OPTIONS}
                    defaultValue={draft?.medicationsCount}
                  />
                </div>
              ),
            },
            {
              key: "hra.currentSituations",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">16. Are you currently in any of the following situations?</p>
                  <SelectField name="currentSituations" label="" options={fields["hra.currentSituations"]?.options ?? CURRENT_SITUATIONS_OPTIONS} defaultValue={draft?.currentSituations} />
                </div>
              ),
            },
            {
              key: "hra.livingSituation",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">17. What is your current living situation?</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField name="livingSituation" label="" options={fields["hra.livingSituation"]?.options ?? LIVING_SITUATION_OPTIONS} defaultValue={draft?.livingSituation} />
                    <TextField name="livingSituationOther" label="If other, please describe" defaultValue={draft?.livingSituationOther} />
                  </div>
                </div>
              ),
            },
            {
              key: "hra.needsHelpWith2OrMoreAdls",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">18. Do you need help with 2 or more of the following?</p>
                  <YesNoField name="needsHelpWith2OrMoreAdls" label="" defaultValue={draft?.needsHelpWith2OrMoreAdls} />
                </div>
              ),
            },
            {
              key: "hra.adlHelpNeeded",
              el: (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SelectField name="adlHelpNeeded" label="" options={fields["hra.adlHelpNeeded"]?.options ?? ADL_HELP_OPTIONS} defaultValue={draft?.adlHelpNeeded} />
                  <TextField name="adlHelpOther" label="If other, please describe" defaultValue={draft?.adlHelpOther} />
                </div>
              ),
            },
            {
              key: "hra.hasLivingWillOrAdvanceDirective",
              el: (
                <div>
                  <p className="mb-2 text-sm font-semibold text-charcoal">
                    19. An advance directive is a form that lets your loved ones know your health care choices if you are too sick to make
                    them yourself.
                  </p>
                  <YesNoField
                    name="hasLivingWillOrAdvanceDirective"
                    label="Do you currently have a living will or an advanced directive in place?"
                    defaultValue={draft?.hasLivingWillOrAdvanceDirective}
                  />
                </div>
              ),
            },
            {
              key: "hra.wantsMoreAdvanceDirectiveInfo",
              el: (
                <YesNoField
                  name="wantsMoreAdvanceDirectiveInfo"
                  label="Would you like more information regarding advanced directives?"
                  defaultValue={draft?.wantsMoreAdvanceDirectiveInfo}
                />
              ),
            },
            {
              key: "hra.mainHealthConcerns",
              el: <TextArea name="mainHealthConcerns" label="20. What are your main health concerns right now?" defaultValue={draft?.mainHealthConcerns} rows={3} />,
            },
            {
              key: "hra.mostSignificantNeedsToday",
              el: (
                <TextArea
                  name="mostSignificantNeedsToday"
                  label="21. What are your most significant needs today?"
                  defaultValue={draft?.mostSignificantNeedsToday}
                  rows={3}
                />
              ),
            },
            {
              key: "hra.interestedInCareCoordination",
              el: (
                <YesNoField
                  name="interestedInCareCoordination"
                  label="22. Is the Member interested in receiving Care Coordination Services?"
                  defaultValue={draft?.interestedInCareCoordination}
                />
              ),
            },
          ]}
        />
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
            Complete Assessment
          </button>
        </FloatingSaveBar>
      )}
      </form>
    </div>
    </FormFieldsProvider>
  );
}
