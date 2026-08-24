"use client";

import { Card } from "@/components/ui";
import { FloatingSaveBar } from "@/components/floating-save-bar";
import { saveDemographics } from "@/app/actions/demographics";
import { toDateInputValue } from "@/lib/format";
import type { Demographics } from "@/app/generated/prisma/client";
import { TextField, TextArea, DateField, SelectField, Checkbox, YesNoField, YesNoWithDetail } from "@/components/intake/form-fields";
import {
  ETHNICITY_OPTIONS,
  RACE_OPTIONS,
  SEX_ASSIGNED_AT_BIRTH_OPTIONS,
  CURRENT_GENDER_OPTIONS,
  SEXUAL_IDENTITY_OPTIONS,
} from "@/components/intake/options";
import type { ResolvedFormFields } from "@/lib/form-fields/registry";
import { FormFieldsProvider } from "@/lib/form-fields/context";
import { CustomQuestionsSection } from "@/components/intake/custom-questions-section";
import type { CustomQuestionForRecord } from "@/lib/custom-questions-shared";
import { OrderedGrid } from "@/components/intake/ordered-items";

export function DemographicsTab({
  memberId,
  record: selected,
  locked,
  fields,
  fieldOrder,
  customQuestions,
}: {
  memberId: string;
  record: Demographics;
  locked: boolean;
  fields: ResolvedFormFields;
  fieldOrder: string[];
  customQuestions: CustomQuestionForRecord[];
}) {
  return (
    <FormFieldsProvider form="demographics" fields={fields}>
    <div className="p-8">
      <form
        key={`${selected.id}-${selected.updatedAt.getTime()}`}
        action={saveDemographics.bind(null, memberId, selected.id)}
        className="max-w-3xl space-y-6"
      >
        <fieldset disabled={locked} className="contents">
          <Card>
            <OrderedGrid
              order={fieldOrder}
              items={[
                { key: "demographics.firstName", el: <TextField name="firstName" label="First Name" defaultValue={selected.firstName} /> },
                { key: "demographics.middleName", el: <TextField name="middleName" label="Middle Name" defaultValue={selected.middleName} /> },
                { key: "demographics.lastName", el: <TextField name="lastName" label="Last Name" defaultValue={selected.lastName} /> },
                { key: "demographics.dateOfBirth", el: <DateField name="dateOfBirth" label="DOB" defaultValue={toDateInputValue(selected.dateOfBirth)} /> },
                { key: "demographics.medicaidId", el: <TextField name="medicaidId" label="Medicaid ID" defaultValue={selected.medicaidId} /> },
                {
                  key: "demographics.ethnicity",
                  el: (
                    <SelectField
                      name="ethnicity"
                      label={fields["demographics.ethnicity"]?.label ?? "Ethnicity"}
                      options={fields["demographics.ethnicity"]?.options ?? ETHNICITY_OPTIONS}
                      defaultValue={selected.ethnicity}
                    />
                  ),
                },
                {
                  key: "demographics.race",
                  el: (
                    <SelectField
                      name="race"
                      label={fields["demographics.race"]?.label ?? "Race"}
                      options={fields["demographics.race"]?.options ?? RACE_OPTIONS}
                      defaultValue={selected.race}
                    />
                  ),
                },
                {
                  key: "demographics.tribalAffiliation",
                  el: <TextField name="tribalAffiliation" label="Tribal Affiliation (if applicable)" defaultValue={selected.tribalAffiliation} />,
                },
                {
                  key: "shared.sexAssignedAtBirth",
                  el: (
                    <SelectField
                      name="sexAssignedAtBirth"
                      label={fields["shared.sexAssignedAtBirth"]?.label ?? "Sex Assigned at Birth"}
                      options={fields["shared.sexAssignedAtBirth"]?.options ?? SEX_ASSIGNED_AT_BIRTH_OPTIONS}
                      defaultValue={selected.sexAssignedAtBirth}
                    />
                  ),
                },
                {
                  key: "shared.currentGender",
                  el: (
                    <SelectField
                      name="currentGender"
                      label={fields["shared.currentGender"]?.label ?? "Current Gender"}
                      options={fields["shared.currentGender"]?.options ?? CURRENT_GENDER_OPTIONS}
                      defaultValue={selected.currentGender}
                    />
                  ),
                },
                {
                  key: "demographics.currentGenderOther",
                  el: <TextField name="currentGenderOther" label="If other, please describe" defaultValue={selected.currentGenderOther} />,
                },
                {
                  key: "shared.sexualIdentity",
                  el: (
                    <SelectField
                      name="sexualIdentity"
                      label={fields["shared.sexualIdentity"]?.label ?? "Current Sexual Identity"}
                      options={fields["shared.sexualIdentity"]?.options ?? SEXUAL_IDENTITY_OPTIONS}
                      defaultValue={selected.sexualIdentity}
                    />
                  ),
                },
                {
                  key: "demographics.sexualIdentityOther",
                  el: <TextField name="sexualIdentityOther" label="If other, please describe" defaultValue={selected.sexualIdentityOther} />,
                },
                {
                  key: "demographics.permissionForOtherToComplete",
                  el: (
                    <YesNoField
                      name="permissionForOtherToComplete"
                      label="Has the member given permission for another person to complete this form?"
                      defaultValue={selected.permissionForOtherToComplete}
                    />
                  ),
                },
                {
                  key: "demographics.formCompletedByName",
                  el: (
                    <TextField
                      name="formCompletedByName"
                      label="Name of person completing/assisting with this form"
                      defaultValue={selected.formCompletedByName}
                    />
                  ),
                },
                {
                  key: "demographics.formCompletedByRelationship",
                  el: <TextField name="formCompletedByRelationship" label="Their relationship to Member" defaultValue={selected.formCompletedByRelationship} />,
                },
                {
                  key: "demographics.address",
                  el: <TextArea name="address" label="Member's Address" defaultValue={selected.address} />,
                  span: 2,
                },
                { key: "demographics.phoneCell", el: <TextField name="phoneCell" label="Cell Phone" defaultValue={selected.phoneCell} /> },
                { key: "demographics.phoneHome", el: <TextField name="phoneHome" label="Home Phone" defaultValue={selected.phoneHome} /> },
                { key: "demographics.email", el: <TextField name="email" label="Email Address" defaultValue={selected.email} /> },
                { key: "demographics.language", el: <TextField name="language" label="Preferred Language" defaultValue={selected.language} /> },
                {
                  key: "demographics.preferredContactVoice",
                  el: (
                    <div className="flex gap-6">
                      <Checkbox name="preferredContactVoice" label="Voice" defaultChecked={selected.preferredContactVoice ?? false} />
                      <Checkbox name="preferredContactText" label="Text" defaultChecked={selected.preferredContactText ?? false} />
                      <Checkbox name="preferredContactMail" label="Mail" defaultChecked={selected.preferredContactMail ?? false} />
                      <Checkbox name="preferredContactEmail" label="Email" defaultChecked={selected.preferredContactEmail ?? false} />
                    </div>
                  ),
                  span: 2,
                },
                { key: "demographics.emergencyContactName", el: <TextField name="emergencyContactName" label="Emergency Contact Name" defaultValue={selected.emergencyContactName} /> },
                {
                  key: "demographics.emergencyContactRel",
                  el: <TextField name="emergencyContactRel" label="Emergency Contact's Relation to Member" defaultValue={selected.emergencyContactRel} />,
                },
                { key: "demographics.emergencyContactPhone", el: <TextField name="emergencyContactPhone" label="Emergency Contact Phone" defaultValue={selected.emergencyContactPhone} /> },
                {
                  key: "demographics.mcoEnrollmentDate",
                  el: <DateField name="mcoEnrollmentDate" label="MCO Enrollment Date" defaultValue={toDateInputValue(selected.mcoEnrollmentDate)} />,
                },
                {
                  key: "demographics.eligibilityCategory",
                  el: <TextField name="eligibilityCategory" label="Category of Eligibility" defaultValue={selected.eligibilityCategory} />,
                },
                {
                  key: "demographics.medicaidEligibilityBeginDate",
                  el: (
                    <DateField
                      name="medicaidEligibilityBeginDate"
                      label="Medicaid Eligibility Begin Date"
                      defaultValue={toDateInputValue(selected.medicaidEligibilityBeginDate)}
                    />
                  ),
                },
                {
                  key: "demographics.medicaidEligibilityRenewalDate",
                  el: (
                    <DateField
                      name="medicaidEligibilityRenewalDate"
                      label="Medicaid Eligibility Renewal Date"
                      defaultValue={toDateInputValue(selected.medicaidEligibilityRenewalDate)}
                    />
                  ),
                },
                {
                  key: "demographics.justiceInvolved",
                  el: (
                    <YesNoWithDetail
                      name="justiceInvolved"
                      label="Is the Member Justice-Involved?"
                      defaultValue={selected.justiceInvolved}
                      detailName="justiceInvolvedDetails"
                      detailDefault={selected.justiceInvolvedDetails}
                    />
                  ),
                  span: 2,
                },
                {
                  key: "demographics.caraIndividual",
                  el: (
                    <YesNoField
                      name="caraIndividual"
                      label="Is the Member a Comprehensive Addiction and Recovery Act (CARA) Individual?"
                      defaultValue={selected.caraIndividual}
                    />
                  ),
                  span: 2,
                },
                {
                  key: "demographics.cyfdInvolved",
                  el: (
                    <YesNoWithDetail
                      name="cyfdInvolved"
                      label="Is the Member Children Youth and Families Department (CYFD) involved or a Child in State Custody (CISC)?"
                      defaultValue={selected.cyfdInvolved}
                      detailName="cyfdInvolvedDetails"
                      detailDefault={selected.cyfdInvolvedDetails}
                    />
                  ),
                  span: 2,
                },
                {
                  key: "demographics.hasOtherInsurance",
                  el: (
                    <YesNoWithDetail
                      name="hasOtherInsurance"
                      label="Do you have any other insurance in addition to New Mexico Medicaid?"
                      defaultValue={selected.hasOtherInsurance}
                      detailName="otherInsuranceDetails"
                      detailDefault={selected.otherInsuranceDetails}
                    />
                  ),
                  span: 2,
                },
                {
                  key: "demographics.onWaiver",
                  el: (
                    <YesNoWithDetail
                      name="onWaiver"
                      label="Is the member on a waiver?"
                      defaultValue={selected.onWaiver}
                      detailName="waiverType"
                      detailDefault={selected.waiverType}
                      detailLabel="If yes, clarify type of waiver"
                    />
                  ),
                  span: 2,
                },
                {
                  key: "demographics.cnaCompletedByNameRelation",
                  el: (
                    <TextField
                      name="cnaCompletedByNameRelation"
                      label="Name/Relation of Person Completing CNA, if other than identified Member"
                      defaultValue={selected.cnaCompletedByNameRelation}
                    />
                  ),
                },
                {
                  key: "demographics.representativeName",
                  el: <TextField name="representativeName" label="Representative Name" defaultValue={selected.representativeName} />,
                },
                {
                  key: "demographics.representativePhone",
                  el: <TextField name="representativePhone" label="Representative Phone" defaultValue={selected.representativePhone} />,
                },
                {
                  key: "demographics.representativeEmail",
                  el: <TextField name="representativeEmail" label="Representative Email" defaultValue={selected.representativeEmail} />,
                },
                {
                  key: "demographics.decisionMaker",
                  el: <TextField name="decisionMaker" label="Who is the Decision Maker?" defaultValue={selected.decisionMaker} />,
                },
                {
                  key: "demographics.representativeDocumentationSubmitted",
                  el: (
                    <YesNoField
                      name="representativeDocumentationSubmitted"
                      label="Was the Documentation Submitted?"
                      defaultValue={selected.representativeDocumentationSubmitted}
                    />
                  ),
                },
                {
                  key: "demographics.representativeDocumentationType",
                  el: (
                    <TextField
                      name="representativeDocumentationType"
                      label="Type of Documentation Submitted"
                      defaultValue={selected.representativeDocumentationType}
                    />
                  ),
                },
                {
                  key: "demographics.permissionToContactRepWithoutMember",
                  el: (
                    <YesNoField
                      name="permissionToContactRepWithoutMember"
                      label="Do we have permission to contact the representative without the Member present?"
                      defaultValue={selected.permissionToContactRepWithoutMember}
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
            <button type="submit" name="intent" value="complete" className="rounded-md bg-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-stone-800">
              Complete
            </button>
          </FloatingSaveBar>
        )}
      </form>
    </div>
    </FormFieldsProvider>
  );
}
