"use client";

import { Card, Badge } from "@/components/ui";
import { saveCna } from "@/app/actions/cna";
import { toDateInputValue } from "@/lib/format";
import { computeBmi, computePhq2Total, computePhq9Total, computeCageTotal, getSafetyConcernReasons } from "@/lib/cna-computed";
import type { CnaAssessment } from "@/app/generated/prisma/client";
import {
  TextField,
  TextArea,
  DateField,
  SelectField,
  Checkbox,
  YesNoField,
  YesNoNaField,
  YesNoWithDetail,
  NumberScaleField,
} from "@/components/intake/form-fields";
import {
  CNA_ASSESSMENT_TYPE_OPTIONS,
  CNA_ASSESSMENT_METHOD_OPTIONS,
  CNA_SPECIAL_PREFERENCES_OPTIONS,
  ER_VISITS_OPTIONS,
  HOSPITAL_STAYS_OPTIONS,
  OVERALL_HEALTH_OPTIONS,
  LIVING_ARRANGEMENT_OPTIONS,
  REFERRAL_NEEDED_OPTIONS,
  PHQ_SCALE_OPTIONS,
  PHQ_DIFFICULTY_OPTIONS,
} from "@/components/intake/options";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";

export function CnaTab({
  memberId,
  record: draft,
  locked,
  fields,
}: {
  memberId: string;
  record: CnaAssessment;
  locked: boolean;
  fields: ResolvedFormFields;
}) {
  const safetyReasons = getSafetyConcernReasons(draft);
  const bmi = computeBmi(draft.heightInches, draft.weightLbs);
  const phq2Total = computePhq2Total(draft);
  const phq9Total = computePhq9Total(draft);
  const cageTotal = computeCageTotal(draft);

  return (
    <div className="p-8">
      <form
        key={`${draft.id}-${draft.updatedAt.getTime()}`}
        action={saveCna.bind(null, memberId, draft.id)}
        className="max-w-3xl space-y-6"
      >
      {safetyReasons.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <Badge color="red">Safety Concern</Badge>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm font-medium text-red-800">
            {safetyReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </Card>
      )}

      <fieldset disabled={locked} className="contents">
      <Card title="Assessment">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DateField name="assessmentDate" label="Assessment Date" defaultValue={toDateInputValue(draft?.assessmentDate)} />
          <SelectField name="assessmentMethod" label={fields["cna.assessmentMethod"]?.label ?? "Assessment Method"} options={fields["cna.assessmentMethod"]?.options ?? CNA_ASSESSMENT_METHOD_OPTIONS} defaultValue={draft?.assessmentMethod} />
        </div>
        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-stone-500">Assessment Type (check all that apply)</p>
          <div className="flex flex-wrap gap-4">
            {(fields["cna.assessmentType"]?.options ?? CNA_ASSESSMENT_TYPE_OPTIONS).map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="assessmentType"
                  value={opt}
                  defaultChecked={draft?.assessmentType?.includes(opt) ?? false}
                  className="h-4 w-4 rounded border-stone-300"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">
              1. Before beginning, are you experiencing an emergency right now, or thoughts of hurting yourself or someone else?
            </p>
            <YesNoField name="hasImminentRisk" label="" defaultValue={draft?.hasImminentRisk} />
          </div>

          <div>
            <YesNoField
              name="meetsCbsqCbma"
              label="2. Does the Member meet requirements for a Community Benefits Service Questionnaire (CBSQ)/Community Benefits Member Agreement (CBMA)? (If yes, complete CBSQ/CBMA)"
              defaultValue={draft?.meetsCbsqCbma}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">3. Do you have a language need other than English?</p>
            <YesNoWithDetail
              name="languageNeedOtherThanEnglish"
              label=""
              defaultValue={draft?.languageNeedOtherThanEnglish}
              detailName="needsTranslationDescribe"
              detailDefault={draft?.needsTranslationDescribe}
              detailLabel="If yes, describe"
            />
            <div className="mt-3">
              <YesNoField name="needsTranslationServices" label="Do you need translation services?" defaultValue={draft?.needsTranslationServices} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">4. Do you have any special preferences we should be aware of?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="specialPreferences" label="" options={fields["cna.specialPreferences"]?.options ?? CNA_SPECIAL_PREFERENCES_OPTIONS} defaultValue={draft?.specialPreferences} />
              <TextField name="specialPreferencesDescribe" label="Describe" defaultValue={draft?.specialPreferencesDescribe} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">5. How many times have you been in the Emergency Room in the last 12 months?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="erVisitsLast12Months" label="" options={fields["cna.erVisits"]?.options ?? ER_VISITS_OPTIONS} defaultValue={draft?.erVisitsLast12Months} />
              <TextField name="erVisitsDescribe" label="Describe" defaultValue={draft?.erVisitsDescribe} />
            </div>
          </div>

          <div>
            <YesNoField
              name="needsEdAlternativesInfo"
              label="6. Do you need information on alternatives to the Emergency Department?"
              defaultValue={draft?.needsEdAlternativesInfo}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">7. How many times have you been in the hospital in the last 6 months?</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SelectField name="hospitalStaysLast6Months" label="" options={fields["cna.hospitalStays"]?.options ?? HOSPITAL_STAYS_OPTIONS} defaultValue={draft?.hospitalStaysLast6Months} />
              <TextField name="hospitalStaysDescribe" label="Describe if appropriate" defaultValue={draft?.hospitalStaysDescribe} />
            </div>
          </div>

          <YesNoWithDetail
            name="waitingForTransplant"
            label="8. Have you been approved for, or are you waiting for any type of transplant?"
            defaultValue={draft?.waitingForTransplant}
            detailName="waitingForTransplantSpecify"
            detailDefault={draft?.waitingForTransplantSpecify}
            detailLabel="If yes, specify"
          />
        </div>
      </Card>

      <Card title="Vision / Hearing / Dental">
        <div className="space-y-6">
          <YesNoWithDetail
            name="hasVisionIssues"
            label="9. Do you have any vision issues?"
            defaultValue={draft?.hasVisionIssues}
            detailName="visionIssuesDescribe"
            detailDefault={draft?.visionIssuesDescribe}
            detailLabel="If yes, describe"
          />
          <TextField name="lastVisionCheck" label="10. When was the last time you had your vision checked?" defaultValue={draft?.lastVisionCheck} />
          <YesNoField
            name="needsEyeCareAppointmentHelp"
            label="11. Do you need any assistance obtaining an eye care professional appointment?"
            defaultValue={draft?.needsEyeCareAppointmentHelp}
          />
          <YesNoWithDetail
            name="hasHearingIssues"
            label="12. Do you have any hearing issues?"
            defaultValue={draft?.hasHearingIssues}
            detailName="hearingIssuesDescribe"
            detailDefault={draft?.hearingIssuesDescribe}
            detailLabel="If yes, describe"
          />
          <TextField name="lastHearingTest" label="13. When was the last time you had your hearing tested?" defaultValue={draft?.lastHearingTest} />
          <YesNoWithDetail
            name="needsHearingApptHelp"
            label="14. Do you need any assistance obtaining an appointment with a hearing specialist?"
            defaultValue={draft?.needsHearingApptHelp}
            detailName="needsHearingApptHelpDescribe"
            detailDefault={draft?.needsHearingApptHelpDescribe}
            detailLabel="If yes, describe"
          />
          <TextField name="lastDentalVisit" label="15. When was the last time you had a dental visit?" defaultValue={draft?.lastDentalVisit} />
          <YesNoWithDetail
            name="needsDentalApptHelp"
            label="16. Do you need any assistance obtaining a dental appointment?"
            defaultValue={draft?.needsDentalApptHelp}
            detailName="needsDentalApptHelpDescribe"
            detailDefault={draft?.needsDentalApptHelpDescribe}
            detailLabel="If yes, describe"
          />
        </div>
      </Card>

      <Card title="Pregnancy (if applicable)">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">17. Are you currently pregnant?</p>
            <YesNoField name="isCurrentlyPregnant" label="" defaultValue={draft?.isCurrentlyPregnant} />
            <div className="mt-3 space-y-3 border-l-2 border-stone-100 pl-4">
              <YesNoNaField name="hadPerinatalCare" label="If yes, have they had perinatal care?" defaultValue={draft?.hadPerinatalCare} />
              <div className="flex items-end gap-3">
                <DateField name="pregnancyDueDate" label="If yes, what is their due date?" defaultValue={toDateInputValue(draft?.pregnancyDueDate)} />
                <div className="pb-2">
                  <Checkbox name="pregnancyDueDateNa" label="N/A" defaultChecked={draft?.pregnancyDueDateNa ?? false} />
                </div>
              </div>
              <YesNoNaField name="pregnancyHighRisk" label="If yes, have they been told their pregnancy is high risk?" defaultValue={draft?.pregnancyHighRisk} />
              <YesNoNaField
                name="needsMaternalProviderHelp"
                label="If yes, do they need assistance finding a Maternal Health Care Provider or scheduling an appointment?"
                defaultValue={draft?.needsMaternalProviderHelp}
              />
              <YesNoNaField
                name="pregnantWithinLast12Months"
                label="If no, have they been pregnant within the last 12 months?"
                defaultValue={draft?.pregnantWithinLast12Months}
              />
              <YesNoNaField
                name="hadPostpartumDepression"
                label="If yes, have they experienced postpartum depression?"
                defaultValue={draft?.hadPostpartumDepression}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField name="timesPregnant" label="18. How many times have you been pregnant (including current pregnancy)?" defaultValue={draft?.timesPregnant} />
            <TextField name="viableBirths" label="19. How many viable births have you had?" defaultValue={draft?.viableBirths} />
          </div>

          <YesNoNaField
            name="historyOfMultipleBirths"
            label="20. Do you have a history of multiple births?"
            defaultValue={draft?.historyOfMultipleBirths}
          />
          <YesNoNaField name="everHadCSection" label="21. Have you ever had a C-section?" defaultValue={draft?.everHadCSection} />

          <div>
            <YesNoNaField
              name="priorPregnancyComplications"
              label="22. Have you ever experienced complications during a previous pregnancy or delivery?"
              defaultValue={draft?.priorPregnancyComplications}
            />
            <div className="mt-2 max-w-md">
              <TextField name="priorPregnancyComplicationsSpecify" label="If yes, specify" defaultValue={draft?.priorPregnancyComplicationsSpecify} />
            </div>
          </div>

          <div>
            <YesNoNaField
              name="interestedInHomeVisiting"
              label="23. Is the member interested in being referred to a Maternal Home Visiting program?"
              defaultValue={draft?.interestedInHomeVisiting}
            />
            <div className="mt-2 max-w-md">
              <TextField
                name="homeVisitingProviderReferredTo"
                label="If yes, enter Home Visiting Provider Member was referred to"
                defaultValue={draft?.homeVisitingProviderReferredTo}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Physical Health">
        <div className="space-y-6">
          <SelectField
            name="overallHealthVsYearAgo"
            label="How would you describe your overall health compared to a year ago?"
            options={fields["cna.overallHealth"]?.options ?? OVERALL_HEALTH_OPTIONS}
            defaultValue={draft?.overallHealthVsYearAgo}
          />

          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">What physical health conditions/diagnoses do you have?</p>
            <div className="mb-2 flex gap-6">
              <Checkbox name="physicalHealthConditionsDiagnosed" label="Diagnosed" defaultChecked={draft?.physicalHealthConditionsDiagnosed ?? false} />
              <Checkbox
                name="physicalHealthConditionsSelfReported"
                label="Self Reported"
                defaultChecked={draft?.physicalHealthConditionsSelfReported ?? false}
              />
            </div>
            <TextArea name="physicalHealthConditionsDescribe" label="" defaultValue={draft?.physicalHealthConditionsDescribe} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField name="heightInches" label="Height (inches)" defaultValue={draft?.heightInches} />
            <TextField name="weightLbs" label="Weight (lbs)" defaultValue={draft?.weightLbs} />
            <div>
              <p className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">BMI (calculated)</p>
              <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">{bmi ?? "—"}</div>
            </div>
          </div>

          <YesNoWithDetail
            name="hasNonMedicationAllergies"
            label="Do you have any known allergies not related to medication?"
            defaultValue={draft?.hasNonMedicationAllergies}
            detailName="nonMedicationAllergiesSpecify"
            detailDefault={draft?.nonMedicationAllergiesSpecify}
            detailLabel="If yes, specify what and type of reaction"
          />
          <YesNoWithDetail
            name="seenProviderLast12Months"
            label="Have you seen a healthcare provider in the last 12 months (to include any preventative health screenings, vaccinations)?"
            defaultValue={draft?.seenProviderLast12Months}
            detailName="seenProviderLast12MonthsSpecify"
            detailDefault={draft?.seenProviderLast12MonthsSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoField
            name="needsPcpAppointmentHelp"
            label="Do you need any assistance obtaining an appointment with a Primary Care Provider, or healthcare provider?"
            defaultValue={draft?.needsPcpAppointmentHelp}
          />
          <div>
            <YesNoField name="hadWellChildVisit" label="In the last 12 months have you had a well child visit?" defaultValue={draft?.hadWellChildVisit} />
            <div className="mt-2 max-w-xs">
              <DateField name="wellChildVisitDate" label="If yes, enter date" defaultValue={toDateInputValue(draft?.wellChildVisitDate)} />
            </div>
          </div>
          <TextField name="lastMammogram" label="When was your last Mammogram?" defaultValue={draft?.lastMammogram} />
          <TextField name="lastPapSmear" label="When was your last pap smear?" defaultValue={draft?.lastPapSmear} />

          <div>
            <YesNoField name="hadColorectalScreening" label="Have you had a colorectal screening?" defaultValue={draft?.hadColorectalScreening} />
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <TextField name="colorectalScreeningYesSpecify" label="If yes, specify" defaultValue={draft?.colorectalScreeningYesSpecify} />
              <TextField name="colorectalScreeningNoSpecify" label="If no, specify" defaultValue={draft?.colorectalScreeningNoSpecify} />
            </div>
          </div>

          <TextArea
            name="pastSurgeriesProceduresTreatments"
            label="What surgeries, procedures, and treatments have you had in the past?"
            defaultValue={draft?.pastSurgeriesProceduresTreatments}
          />
          <YesNoWithDetail
            name="upcomingMedicalServices"
            label="Do you have any medical appointments, medical tests, surgeries, or other health services planned in the next 3-6 months?"
            defaultValue={draft?.upcomingMedicalServices}
            detailName="upcomingMedicalServicesSpecify"
            detailDefault={draft?.upcomingMedicalServicesSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoField name="needsSchedulingHelp" label="Do you need help scheduling appointments or procedures?" defaultValue={draft?.needsSchedulingHelp} />
          <YesNoWithDetail
            name="usesOrNeedsDme"
            label="Do you use or need Durable Medical Equipment (DME)?"
            defaultValue={draft?.usesOrNeedsDme}
            detailName="usesOrNeedsDmeSpecify"
            detailDefault={draft?.usesOrNeedsDmeSpecify}
            detailLabel="If yes, specify"
          />
          <div>
            <YesNoField name="needsDmeObtainingHelp" label="Do you need assistance obtaining needed DME?" defaultValue={draft?.needsDmeObtainingHelp} />
            <div className="mt-2">
              <TextArea name="needsDmeObtainingHelpSpecify" label="If yes, specify" defaultValue={draft?.needsDmeObtainingHelpSpecify} />
            </div>
          </div>
          <YesNoWithDetail
            name="hasNeurologicalDiagnoses"
            label="Do you have any neurological diagnoses such as dementia, epilepsy, or a Traumatic Brain Injury (TBI) or Acquired Brain Injury (ABI)?"
            defaultValue={draft?.hasNeurologicalDiagnoses}
            detailName="hasNeurologicalDiagnosesSpecify"
            detailDefault={draft?.hasNeurologicalDiagnosesSpecify}
            detailLabel="If yes, specify diagnoses and onset date"
          />
          <div>
            <YesNoField name="usesTobaccoNicotine" label="Do you smoke, vape, or chew tobacco?" defaultValue={draft?.usesTobaccoNicotine} />
            <div className="mt-3">
              <YesNoField
                name="interestedInCessationProgram"
                label="If yes, are they interested in receiving information on or participating in a tobacco cessation program?"
                defaultValue={draft?.interestedInCessationProgram}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Medication">
        <div className="space-y-6">
          <YesNoWithDetail
            name="takesMedications"
            label="Do you currently take any prescribed or over the counter medications?"
            defaultValue={draft?.takesMedications}
            detailName="takesMedicationsSpecify"
            detailDefault={draft?.takesMedicationsSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="ableToObtainAllMedications"
            label="Are you able to obtain all your needed medications?"
            defaultValue={draft?.ableToObtainAllMedications}
            detailName="ableToObtainAllMedicationsSpecify"
            detailDefault={draft?.ableToObtainAllMedicationsSpecify}
            detailLabel="If no, specify"
          />
          <YesNoWithDetail
            name="hasDiscontinuedMedications"
            label="Do you have any prescribed or over the counter medications that you are no longer taking?"
            defaultValue={draft?.hasDiscontinuedMedications}
            detailName="hasDiscontinuedMedicationsSpecify"
            detailDefault={draft?.hasDiscontinuedMedicationsSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="hasMedicationAllergies"
            label="Do you have any known allergies to medications?"
            defaultValue={draft?.hasMedicationAllergies}
            detailName="hasMedicationAllergiesSpecify"
            detailDefault={draft?.hasMedicationAllergiesSpecify}
            detailLabel="If yes, specify to which medication and the type of reaction"
          />
          <YesNoWithDetail
            name="takesLifeSustainingMedications"
            label="Do you take medications that cannot be stopped or would risk your life if not taken?"
            defaultValue={draft?.takesLifeSustainingMedications}
            detailName="takesLifeSustainingMedicationsSpecify"
            detailDefault={draft?.takesLifeSustainingMedicationsSpecify}
            detailLabel="If yes, specify"
          />
        </div>
      </Card>

      <Card title="Behavioral Health Needs (BH)">
        <div className="space-y-6">
          <div>
            <p className="mb-2 text-sm font-semibold text-charcoal">What behavioral health conditions/diagnoses do you have?</p>
            <div className="mb-2 flex gap-6">
              <Checkbox name="behavioralHealthConditionsDiagnosed" label="Diagnosed" defaultChecked={draft?.behavioralHealthConditionsDiagnosed ?? false} />
              <Checkbox
                name="behavioralHealthConditionsSelfReported"
                label="Self-Reported"
                defaultChecked={draft?.behavioralHealthConditionsSelfReported ?? false}
              />
              <Checkbox name="behavioralHealthConditionsNa" label="N/A" defaultChecked={draft?.behavioralHealthConditionsNa ?? false} />
            </div>
            <TextArea name="behavioralHealthConditionsDescribe" label="" defaultValue={draft?.behavioralHealthConditionsDescribe} />
          </div>

          <YesNoWithDetail
            name="bhAdmissionsLast12Months"
            label="In the past 12 months has the Member had any BH emergency/inpatient/residential admissions?"
            defaultValue={draft?.bhAdmissionsLast12Months}
            detailName="bhAdmissionsSpecify"
            detailDefault={draft?.bhAdmissionsSpecify}
            detailLabel="If yes, specify"
          />
          <TextField name="lastBhProviderVisit" label="When was the Member's most recent visit to a BH provider?" defaultValue={draft?.lastBhProviderVisit} />
          <YesNoWithDetail
            name="needsBhProviderHelp"
            label="Does the Member need any assistance obtaining a BH provider or appointment?"
            defaultValue={draft?.needsBhProviderHelp}
            detailName="needsBhProviderHelpSpecify"
            detailDefault={draft?.needsBhProviderHelpSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoField
            name="understandsBhCondition"
            label="Do you have a good overall understanding of your condition(s)?"
            defaultValue={draft?.understandsBhCondition}
          />
          <YesNoWithDetail
            name="hasSubstanceUseIssues"
            label="Do you have any current or past alcohol or substance use issues?"
            defaultValue={draft?.hasSubstanceUseIssues}
            detailName="hasSubstanceUseIssuesSpecify"
            detailDefault={draft?.hasSubstanceUseIssuesSpecify}
            detailLabel="If yes, specify"
          />
        </div>
      </Card>

      <Card title="PHQ-2/PHQ-9">
        <p className="mb-4 text-xs text-stone-500">
          In the past two weeks, how often have you been bothered by any of the following problems? 0 = not at all, 1 = several days, 2 = more than
          half the days, 3 = nearly every day.
        </p>
        <div className="space-y-4">
          <PhqRow name="phqLittleInterest" label="Little interest or pleasure in doing things?" defaultValue={draft?.phqLittleInterest} />
          <PhqRow name="phqFeelingDown" label="Feeling down, depressed, or hopeless?" defaultValue={draft?.phqFeelingDown} />
          <ComputedTotal label="Total Score (questions above)" value={phq2Total} />

          <p className="pt-2 text-xs font-medium text-stone-500">If applicable, continue below:</p>
          <PhqRow name="phqTroubleSleeping" label="Trouble falling asleep, staying asleep, or sleeping too much?" defaultValue={draft?.phqTroubleSleeping} />
          <PhqRow name="phqTiredLowEnergy" label="Feeling tired or having little energy?" defaultValue={draft?.phqTiredLowEnergy} />
          <PhqRow name="phqAppetite" label="Poor appetite or overeating?" defaultValue={draft?.phqAppetite} />
          <PhqRow
            name="phqFeelingBad"
            label="Feeling bad about yourself — or that you're a failure or have let yourself or your family down?"
            defaultValue={draft?.phqFeelingBad}
          />
          <PhqRow
            name="phqTroubleConcentrating"
            label="Trouble concentrating on things such as reading the newspaper or watching television?"
            defaultValue={draft?.phqTroubleConcentrating}
          />
          <PhqRow
            name="phqMovingSpeaking"
            label="Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?"
            defaultValue={draft?.phqMovingSpeaking}
          />
          <PhqRow
            name="phqSelfHarmThoughts"
            label="Thoughts that you would be better off dead or hurting yourself in some way?"
            defaultValue={draft?.phqSelfHarmThoughts}
          />
          <ComputedTotal label="Total Score (all questions above)" value={phq9Total} />

          <SelectField
            name="phqDifficultyLevel"
            label="If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?"
            options={fields["cna.phqDifficulty"]?.options ?? PHQ_DIFFICULTY_OPTIONS}
            defaultValue={draft?.phqDifficultyLevel}
          />
        </div>
      </Card>

      <Card title="CAGE">
        <div className="space-y-4">
          <CageRow
            name="cageCutDown"
            label="Have you ever felt you should cut down on your drinking?"
            defaultValue={draft?.cageCutDown}
            specifyName="cageCutDownSpecify"
            specifyDefault={draft?.cageCutDownSpecify}
          />
          <CageRow
            name="cageAnnoyed"
            label="Have people annoyed you by criticizing your drinking?"
            defaultValue={draft?.cageAnnoyed}
            specifyName="cageAnnoyedSpecify"
            specifyDefault={draft?.cageAnnoyedSpecify}
          />
          <CageRow
            name="cageGuilty"
            label="Have you ever felt bad or guilty about your drinking?"
            defaultValue={draft?.cageGuilty}
            specifyName="cageGuiltySpecify"
            specifyDefault={draft?.cageGuiltySpecify}
          />
          <CageRow
            name="cageEyeOpener"
            label="Have you ever had a drink first thing in the morning to steady your nerves or get rid of a hangover?"
            defaultValue={draft?.cageEyeOpener}
            specifyName="cageEyeOpenerSpecify"
            specifyDefault={draft?.cageEyeOpenerSpecify}
          />
          <ComputedTotal label="Total Score" value={cageTotal} />
        </div>
      </Card>

      <Card title="Health Related Social Needs (HRSN)">
        <div className="space-y-6">
          <YesNoWithDetail
            name="hasHousingInsecurity"
            label="Do you have any indicators of housing insecurity?"
            defaultValue={draft?.hasHousingInsecurity}
            detailName="hasHousingInsecuritySpecify"
            detailDefault={draft?.hasHousingInsecuritySpecify}
            detailLabel="If yes, specify"
          />
          <div>
            <SelectField name="livingArrangement" label="Do you live alone or with others?" options={fields["cna.livingArrangement"]?.options ?? LIVING_ARRANGEMENT_OPTIONS} defaultValue={draft?.livingArrangement} />
            <div className="mt-2 max-w-md">
              <TextField name="livingArrangementSpecify" label="If with others, specify" defaultValue={draft?.livingArrangementSpecify} />
            </div>
          </div>
          <YesNoWithDetail
            name="feelsSafeWhereLiving"
            label="Do you feel physically and emotionally safe where you are living?"
            defaultValue={draft?.feelsSafeWhereLiving}
            detailName="feelsSafeWhereLivingSpecify"
            detailDefault={draft?.feelsSafeWhereLivingSpecify}
            detailLabel="If no, specify"
          />
          <YesNoWithDetail
            name="hasUrgentNeeds"
            label="Do you have any urgent needs (example: you don't have a place to sleep tonight, or you feel unsafe in your home)?"
            defaultValue={draft?.hasUrgentNeeds}
            detailName="hasUrgentNeedsSpecify"
            detailDefault={draft?.hasUrgentNeedsSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoField
            name="wantsHousingSpecialistReferral"
            label="Would you like a referral to our Housing Specialist?"
            defaultValue={draft?.wantsHousingSpecialistReferral}
          />
          <YesNoWithDetail
            name="householdReceivesCbServices"
            label="Does anyone in your household receive Community Benefit (CB) services?"
            defaultValue={draft?.householdReceivesCbServices}
            detailName="householdReceivesCbServicesSpecify"
            detailDefault={draft?.householdReceivesCbServicesSpecify}
            detailLabel="If yes, specify services"
          />
          <div>
            <YesNoWithDetail
              name="hasNaturalSupports"
              label="Do you have any natural supports such as an unpaid family/friend caregiver?"
              defaultValue={draft?.hasNaturalSupports}
              detailName="naturalSupportsContactInfo"
              detailDefault={draft?.naturalSupportsContactInfo}
              detailLabel="If yes, list names and contact information"
            />
            <div className="mt-3">
              <YesNoWithDetail
                name="naturalSupportMeetsNeeds"
                label="If yes, do you feel the time spent with the natural support meets your needs?"
                defaultValue={draft?.naturalSupportMeetsNeeds}
                detailName="naturalSupportMeetsNeedsExplain"
                detailDefault={draft?.naturalSupportMeetsNeedsExplain}
                detailLabel="If no, explain"
              />
            </div>
          </div>
          <div>
            <YesNoWithDetail
              name="hasPaidCaregiver"
              label="Do you have a paid caregiver?"
              defaultValue={draft?.hasPaidCaregiver}
              detailName="paidCaregiverContactInfo"
              detailDefault={draft?.paidCaregiverContactInfo}
              detailLabel="If yes, list names and contact information"
            />
            <div className="mt-2 max-w-xs">
              <TextField name="paidCaregiverHoursPerWeek" label="List days and hours per week" defaultValue={draft?.paidCaregiverHoursPerWeek} />
            </div>
          </div>
          <YesNoNaField name="hasSufficientChildCare" label="Do you have sufficient child care?" defaultValue={draft?.hasSufficientChildCare} />
          <YesNoField
            name="worriedAboutFood"
            label="Within the past 12 months, have you worried that you would run out of food or has the food you bought run out and you did not have money to get more?"
            defaultValue={draft?.worriedAboutFood}
          />
          <TextField name="employmentStatus" label="How do you describe your current work situation/employment status?" defaultValue={draft?.employmentStatus} />
          <TextField name="primaryIncomeSource" label="What is your primary source of income?" defaultValue={draft?.primaryIncomeSource} />
          <YesNoWithDetail
            name="managesFinancesIndependently"
            label="Are you able to manage financial matters independently?"
            defaultValue={draft?.managesFinancesIndependently}
            detailName="managesFinancesIndependentlySpecify"
            detailDefault={draft?.managesFinancesIndependentlySpecify}
            detailLabel="If no, specify"
          />
          <YesNoWithDetail
            name="hasLegalIssues"
            label="Do you have any legal issues?"
            defaultValue={draft?.hasLegalIssues}
            detailName="hasLegalIssuesSpecify"
            detailDefault={draft?.hasLegalIssuesSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="reliableTransportation"
            label="Do you have reliable transportation?"
            defaultValue={draft?.reliableTransportation}
            detailName="reliableTransportationSpecify"
            detailDefault={draft?.reliableTransportationSpecify}
            detailLabel="If no, specify"
          />
          <SelectField
            name="referralsNeeded"
            label="Do you need help obtaining referrals for:"
            options={fields["cna.referralsNeeded"]?.options ?? REFERRAL_NEEDED_OPTIONS}
            defaultValue={draft?.referralsNeeded}
          />
        </div>
      </Card>

      <Card title="Activities of Daily Living (ADLs)">
        <p className="mb-4 text-sm text-stone-600">Do you need assistance with any of the following?</p>
        <div className="space-y-4">
          <YesNoWithDetail name="adlBathingNeeded" label="Bathing" defaultValue={draft?.adlBathingNeeded} detailName="adlBathingSpecify" detailDefault={draft?.adlBathingSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlDressingNeeded" label="Dressing" defaultValue={draft?.adlDressingNeeded} detailName="adlDressingSpecify" detailDefault={draft?.adlDressingSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlGroomingNeeded" label="Grooming" defaultValue={draft?.adlGroomingNeeded} detailName="adlGroomingSpecify" detailDefault={draft?.adlGroomingSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlBowelBladderNeeded" label="Bowel/bladder" defaultValue={draft?.adlBowelBladderNeeded} detailName="adlBowelBladderSpecify" detailDefault={draft?.adlBowelBladderSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlToiletingNeeded" label="Toileting" defaultValue={draft?.adlToiletingNeeded} detailName="adlToiletingSpecify" detailDefault={draft?.adlToiletingSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlEatingNeeded" label="Eating" defaultValue={draft?.adlEatingNeeded} detailName="adlEatingSpecify" detailDefault={draft?.adlEatingSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlMobilityNeeded" label="Mobility assistance" defaultValue={draft?.adlMobilityNeeded} detailName="adlMobilitySpecify" detailDefault={draft?.adlMobilitySpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlTransferNeeded" label="Transfer" defaultValue={draft?.adlTransferNeeded} detailName="adlTransferSpecify" detailDefault={draft?.adlTransferSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlMealPrepNeeded" label="Meal preparation and assistance" defaultValue={draft?.adlMealPrepNeeded} detailName="adlMealPrepSpecify" detailDefault={draft?.adlMealPrepSpecify} detailLabel="If yes, specify" />
          <YesNoWithDetail name="adlDailyMedicationNeeded" label="Daily medication" defaultValue={draft?.adlDailyMedicationNeeded} detailName="adlDailyMedicationSpecify" detailDefault={draft?.adlDailyMedicationSpecify} detailLabel="If yes, specify" />
        </div>
      </Card>

      <Card title="Instrumental Activities of Daily Living (IADLs)">
        <p className="mb-4 text-sm text-stone-600">Do you need assistance with any of the following?</p>
        <div className="space-y-4">
          <YesNoWithDetail
            name="iadlSupportServicesNeeded"
            label="Support Services"
            defaultValue={draft?.iadlSupportServicesNeeded}
            detailName="iadlSupportServicesSpecify"
            detailDefault={draft?.iadlSupportServicesSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="iadlDmeMaintenanceNeeded"
            label="Minor Maintenance of DME"
            defaultValue={draft?.iadlDmeMaintenanceNeeded}
            detailName="iadlDmeMaintenanceSpecify"
            detailDefault={draft?.iadlDmeMaintenanceSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="iadlLightHousekeepingNeeded"
            label="Light Housekeeping"
            defaultValue={draft?.iadlLightHousekeepingNeeded}
            detailName="iadlLightHousekeepingSpecify"
            detailDefault={draft?.iadlLightHousekeepingSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoWithDetail
            name="iadlFinancesNeeded"
            label="Finances"
            defaultValue={draft?.iadlFinancesNeeded}
            detailName="iadlFinancesSpecify"
            detailDefault={draft?.iadlFinancesSpecify}
            detailLabel="If yes, specify"
          />
        </div>

        <div className="mt-6 space-y-4 border-t border-stone-100 pt-4">
          <YesNoWithDetail
            name="hasFallRiskIndication"
            label="Do you have any indication of fall risk?"
            defaultValue={draft?.hasFallRiskIndication}
            detailName="hasFallRiskIndicationSpecify"
            detailDefault={draft?.hasFallRiskIndicationSpecify}
            detailLabel="If yes, specify"
          />
          <YesNoField
            name="needsNfLocEvaluation"
            label="Does the Member need to be evaluated for a Nursing Facility Level of Care (NF LOC) or do they intend to access Long Term Services and Supports (LTSS)?"
            defaultValue={draft?.needsNfLocEvaluation}
          />
        </div>
      </Card>

      <Card title="Summary">
        <div className="space-y-6">
          <TextArea name="mainHealthGoal" label="What is your main health goal or outcome you want to achieve?" defaultValue={draft?.mainHealthGoal} rows={3} />
          <TextArea name="mostSignificantNeedsToday" label="What are your most significant needs today?" defaultValue={draft?.mostSignificantNeedsToday} rows={3} />
          <div>
            <YesNoField name="hasAdvanceDirective" label="Do you have an advanced directive?" defaultValue={draft?.hasAdvanceDirective} />
            <div className="mt-3">
              <YesNoField name="wantsAdvanceDirectiveInfo" label="If no, would you like more information?" defaultValue={draft?.wantsAdvanceDirectiveInfo} />
            </div>
          </div>
          <YesNoField name="interestedInCareCoordination" label="Is the member interested in Care Coordination?" defaultValue={draft?.interestedInCareCoordination} />
          <div>
            <YesNoNaField
              name="declinationExplainedAndSigned"
              label="If the member refused Care Coordination: Was the HCA approved care coordination Declination explained and signed?"
              defaultValue={draft?.declinationExplainedAndSigned}
            />
            <div className="mt-2">
              <TextField name="declinationReason" label="What was the reason for refusal?" defaultValue={draft?.declinationReason} />
            </div>
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
            className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Complete Assessment
          </button>
        </div>
      )}
      </form>
    </div>
  );
}

function PhqRow({ name, label, defaultValue }: { name: string; label: string; defaultValue?: number | null }) {
  return (
    <div>
      <p className="mb-1 text-sm text-stone-700">{label}</p>
      <NumberScaleField name={name} options={PHQ_SCALE_OPTIONS} defaultValue={defaultValue} />
    </div>
  );
}

function CageRow({
  name,
  label,
  defaultValue,
  specifyName,
  specifyDefault,
}: {
  name: string;
  label: string;
  defaultValue?: boolean | null;
  specifyName: string;
  specifyDefault?: string | null;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
            Yes (1)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="radio" name={name} value="no" defaultChecked={defaultValue === false} className="h-4 w-4" />
            No (0)
          </label>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs text-stone-500">If yes, specify:</label>
          <input
            name={specifyName}
            defaultValue={specifyDefault ?? ""}
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
      </div>
    </div>
  );
}

function ComputedTotal({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-stone-50 px-3 py-2">
      <span className="text-sm font-medium text-stone-700">{label}:</span>
      <span className="text-sm text-charcoal">{value ?? "—"}</span>
    </div>
  );
}
