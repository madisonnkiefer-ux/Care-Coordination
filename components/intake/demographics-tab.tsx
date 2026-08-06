"use client";

import { Card } from "@/components/ui";
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

export function DemographicsTab({
  memberId,
  record: selected,
  locked,
  fields,
  customQuestions,
}: {
  memberId: string;
  record: Demographics;
  locked: boolean;
  fields: ResolvedFormFields;
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
          <Card title="Identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField name="firstName" label="First Name" defaultValue={selected.firstName} />
              <TextField name="middleName" label="Middle Name" defaultValue={selected.middleName} />
              <TextField name="lastName" label="Last Name" defaultValue={selected.lastName} />
              <DateField name="dateOfBirth" label="DOB" defaultValue={toDateInputValue(selected.dateOfBirth)} />
              <TextField name="medicaidId" label="Medicaid ID" defaultValue={selected.medicaidId} />
            </div>
          </Card>

          <Card title="Race &amp; Ethnicity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="ethnicity"
                label={fields["demographics.ethnicity"]?.label ?? "Ethnicity"}
                options={fields["demographics.ethnicity"]?.options ?? ETHNICITY_OPTIONS}
                defaultValue={selected.ethnicity}
              />
              <SelectField
                name="race"
                label={fields["demographics.race"]?.label ?? "Race"}
                options={fields["demographics.race"]?.options ?? RACE_OPTIONS}
                defaultValue={selected.race}
              />
              <TextField name="tribalAffiliation" label="Tribal Affiliation (if applicable)" defaultValue={selected.tribalAffiliation} />
            </div>
          </Card>

          <Card title="Sex, Gender &amp; Sexual Identity">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                name="sexAssignedAtBirth"
                label={fields["shared.sexAssignedAtBirth"]?.label ?? "Sex Assigned at Birth"}
                options={fields["shared.sexAssignedAtBirth"]?.options ?? SEX_ASSIGNED_AT_BIRTH_OPTIONS}
                defaultValue={selected.sexAssignedAtBirth}
              />
              <div />
              <SelectField
                name="currentGender"
                label={fields["shared.currentGender"]?.label ?? "Current Gender"}
                options={fields["shared.currentGender"]?.options ?? CURRENT_GENDER_OPTIONS}
                defaultValue={selected.currentGender}
              />
              <TextField name="currentGenderOther" label="If other, please describe" defaultValue={selected.currentGenderOther} />
              <SelectField
                name="sexualIdentity"
                label={fields["shared.sexualIdentity"]?.label ?? "Current Sexual Identity"}
                options={fields["shared.sexualIdentity"]?.options ?? SEXUAL_IDENTITY_OPTIONS}
                defaultValue={selected.sexualIdentity}
              />
              <TextField name="sexualIdentityOther" label="If other, please describe" defaultValue={selected.sexualIdentityOther} />
            </div>
          </Card>

          <Card title="Form Completion">
            <div className="space-y-4">
              <YesNoField
                name="permissionForOtherToComplete"
                label="Has the member given permission for another person to complete this form?"
                defaultValue={selected.permissionForOtherToComplete}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField
                  name="formCompletedByName"
                  label="Name of person completing/assisting with this form"
                  defaultValue={selected.formCompletedByName}
                />
                <TextField name="formCompletedByRelationship" label="Their relationship to Member" defaultValue={selected.formCompletedByRelationship} />
              </div>
            </div>
          </Card>

          <Card title="Contact Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextArea name="address" label="Member's Address" defaultValue={selected.address} className="sm:col-span-2" />
              <TextField name="phoneCell" label="Cell Phone" defaultValue={selected.phoneCell} />
              <TextField name="phoneHome" label="Home Phone" defaultValue={selected.phoneHome} />
              <TextField name="email" label="Email Address" defaultValue={selected.email} />
              <TextField name="language" label="Preferred Language" defaultValue={selected.language} />
            </div>
            <div className="mt-4 flex gap-6">
              <Checkbox name="preferredContactVoice" label="Voice" defaultChecked={selected.preferredContactVoice ?? false} />
              <Checkbox name="preferredContactText" label="Text" defaultChecked={selected.preferredContactText ?? false} />
              <Checkbox name="preferredContactMail" label="Mail" defaultChecked={selected.preferredContactMail ?? false} />
              <Checkbox name="preferredContactEmail" label="Email" defaultChecked={selected.preferredContactEmail ?? false} />
            </div>
          </Card>

          <Card title="Emergency Contact">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField name="emergencyContactName" label="Name" defaultValue={selected.emergencyContactName} />
              <TextField name="emergencyContactRel" label="Relation to Member" defaultValue={selected.emergencyContactRel} />
              <TextField name="emergencyContactPhone" label="Phone" defaultValue={selected.emergencyContactPhone} />
            </div>
          </Card>

          <Card title="MCO &amp; Medicaid Eligibility">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateField name="mcoEnrollmentDate" label="MCO Enrollment Date" defaultValue={toDateInputValue(selected.mcoEnrollmentDate)} />
              <TextField name="eligibilityCategory" label="Category of Eligibility" defaultValue={selected.eligibilityCategory} />
              <DateField
                name="medicaidEligibilityBeginDate"
                label="Medicaid Eligibility Begin Date"
                defaultValue={toDateInputValue(selected.medicaidEligibilityBeginDate)}
              />
              <DateField
                name="medicaidEligibilityRenewalDate"
                label="Medicaid Eligibility Renewal Date"
                defaultValue={toDateInputValue(selected.medicaidEligibilityRenewalDate)}
              />
            </div>
          </Card>

          <Card title="Screening Questions">
            <div className="space-y-4">
              <YesNoWithDetail
                name="justiceInvolved"
                label="Is the Member Justice-Involved?"
                defaultValue={selected.justiceInvolved}
                detailName="justiceInvolvedDetails"
                detailDefault={selected.justiceInvolvedDetails}
              />
              <YesNoField
                name="caraIndividual"
                label="Is the Member a Comprehensive Addiction and Recovery Act (CARA) Individual?"
                defaultValue={selected.caraIndividual}
              />
              <YesNoWithDetail
                name="cyfdInvolved"
                label="Is the Member Children Youth and Families Department (CYFD) involved or a Child in State Custody (CISC)?"
                defaultValue={selected.cyfdInvolved}
                detailName="cyfdInvolvedDetails"
                detailDefault={selected.cyfdInvolvedDetails}
              />
              <YesNoWithDetail
                name="hasOtherInsurance"
                label="Do you have any other insurance in addition to New Mexico Medicaid?"
                defaultValue={selected.hasOtherInsurance}
                detailName="otherInsuranceDetails"
                detailDefault={selected.otherInsuranceDetails}
              />
              <YesNoWithDetail
                name="onWaiver"
                label="Is the member on a waiver?"
                defaultValue={selected.onWaiver}
                detailName="waiverType"
                detailDefault={selected.waiverType}
                detailLabel="If yes, clarify type of waiver"
              />
            </div>
          </Card>

          <Card title="Authorized Representative">
            <div className="space-y-4">
              <TextField
                name="cnaCompletedByNameRelation"
                label="Name/Relation of Person Completing CNA, if other than identified Member"
                defaultValue={selected.cnaCompletedByNameRelation}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <TextField name="representativeName" label="Representative Name" defaultValue={selected.representativeName} />
                <TextField name="representativePhone" label="Representative Phone" defaultValue={selected.representativePhone} />
                <TextField name="representativeEmail" label="Representative Email" defaultValue={selected.representativeEmail} />
              </div>
              <TextField name="decisionMaker" label="Who is the Decision Maker?" defaultValue={selected.decisionMaker} />
              <YesNoField
                name="representativeDocumentationSubmitted"
                label="Was the Documentation Submitted?"
                defaultValue={selected.representativeDocumentationSubmitted}
              />
              <TextField
                name="representativeDocumentationType"
                label="Type of Documentation Submitted"
                defaultValue={selected.representativeDocumentationType}
              />
              <YesNoField
                name="permissionToContactRepWithoutMember"
                label="Do we have permission to contact the representative without the Member present?"
                defaultValue={selected.permissionToContactRepWithoutMember}
              />
            </div>
          </Card>

          <CustomQuestionsSection questions={customQuestions} />
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
    </div>
    </FormFieldsProvider>
  );
}
