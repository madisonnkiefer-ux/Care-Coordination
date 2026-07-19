import { Card } from "@/components/ui";
import { saveDemographics } from "@/app/actions/demographics";
import { toDateInputValue } from "@/lib/format";
import type { Member, Demographics } from "@/app/generated/prisma/client";
import { TextField, TextArea, DateField, SelectField, Checkbox, YesNoField, YesNoWithDetail } from "@/components/intake/form-fields";
import { SEX_ASSIGNED_AT_BIRTH_OPTIONS, CURRENT_GENDER_OPTIONS, SEXUAL_IDENTITY_OPTIONS } from "@/components/intake/options";

const ETHNICITY_OPTIONS = ["Hispanic or Latino", "Not Hispanic or Latino", "Unknown/Declined"];
const RACE_OPTIONS = [
  "White or Caucasian",
  "Black or African American",
  "Asian",
  "American Indian or Alaska Native",
  "Native Hawaiian or Other Pacific Islander",
  "Two or More Races",
  "Unknown/Declined",
];

export function DemographicsTab({ memberId, member, demographics }: { memberId: string; member: Member; demographics: Demographics | null }) {
  return (
    <form action={saveDemographics.bind(null, memberId)} className="max-w-3xl space-y-6 p-8">
      <Card title="Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField name="firstName" label="First Name" defaultValue={member.firstName} />
          <TextField name="middleName" label="Middle Name" defaultValue={member.middleName} />
          <TextField name="lastName" label="Last Name" defaultValue={member.lastName} />
          <DateField name="dateOfBirth" label="DOB" defaultValue={toDateInputValue(member.dateOfBirth)} />
          <TextField name="medicaidId" label="Medicaid ID" defaultValue={member.medicaidId} />
        </div>
      </Card>

      <Card title="Race &amp; Ethnicity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField name="ethnicity" label="Ethnicity" options={ETHNICITY_OPTIONS} defaultValue={demographics?.ethnicity} />
          <SelectField name="race" label="Race" options={RACE_OPTIONS} defaultValue={demographics?.race} />
          <TextField
            name="tribalAffiliation"
            label="Tribal Affiliation (if applicable)"
            defaultValue={demographics?.tribalAffiliation}
          />
        </div>
      </Card>

      <Card title="Sex, Gender &amp; Sexual Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            name="sexAssignedAtBirth"
            label="Sex Assigned at Birth"
            options={SEX_ASSIGNED_AT_BIRTH_OPTIONS}
            defaultValue={demographics?.sexAssignedAtBirth}
          />
          <div />
          <SelectField name="currentGender" label="Current Gender" options={CURRENT_GENDER_OPTIONS} defaultValue={demographics?.currentGender} />
          <TextField name="currentGenderOther" label="If other, please describe" defaultValue={demographics?.currentGenderOther} />
          <SelectField
            name="sexualIdentity"
            label="Current Sexual Identity"
            options={SEXUAL_IDENTITY_OPTIONS}
            defaultValue={demographics?.sexualIdentity}
          />
          <TextField name="sexualIdentityOther" label="If other, please describe" defaultValue={demographics?.sexualIdentityOther} />
        </div>
      </Card>

      <Card title="Form Completion">
        <div className="space-y-4">
          <YesNoField
            name="permissionForOtherToComplete"
            label="Has the member given permission for another person to complete this form?"
            defaultValue={demographics?.permissionForOtherToComplete}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="formCompletedByName"
              label="Name of person completing/assisting with this form"
              defaultValue={demographics?.formCompletedByName}
            />
            <TextField
              name="formCompletedByRelationship"
              label="Their relationship to Member"
              defaultValue={demographics?.formCompletedByRelationship}
            />
          </div>
        </div>
      </Card>

      <Card title="Contact Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextArea name="address" label="Member's Address" defaultValue={member.address} className="sm:col-span-2" />
          <TextField name="phoneCell" label="Cell Phone" defaultValue={demographics?.phoneCell} />
          <TextField name="phoneHome" label="Home Phone" defaultValue={demographics?.phoneHome} />
          <TextField name="email" label="Email Address" defaultValue={member.email} />
          <TextField name="language" label="Preferred Language" defaultValue={member.language} />
        </div>
        <div className="mt-4 flex gap-6">
          <Checkbox name="preferredContactVoice" label="Voice" defaultChecked={demographics?.preferredContactVoice ?? false} />
          <Checkbox name="preferredContactText" label="Text" defaultChecked={demographics?.preferredContactText ?? false} />
        </div>
      </Card>

      <Card title="Emergency Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField name="emergencyContactName" label="Name" defaultValue={demographics?.emergencyContactName} />
          <TextField name="emergencyContactRel" label="Relation to Member" defaultValue={demographics?.emergencyContactRel} />
          <TextField name="emergencyContactPhone" label="Phone" defaultValue={demographics?.emergencyContactPhone} />
        </div>
      </Card>

      <Card title="MCO &amp; Medicaid Eligibility">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DateField name="mcoEnrollmentDate" label="MCO Enrollment Date" defaultValue={toDateInputValue(demographics?.mcoEnrollmentDate)} />
          <TextField name="eligibilityCategory" label="Category of Eligibility" defaultValue={demographics?.eligibilityCategory} />
          <DateField
            name="medicaidEligibilityBeginDate"
            label="Medicaid Eligibility Begin Date"
            defaultValue={toDateInputValue(demographics?.medicaidEligibilityBeginDate)}
          />
          <DateField
            name="medicaidEligibilityRenewalDate"
            label="Medicaid Eligibility Renewal Date"
            defaultValue={toDateInputValue(demographics?.medicaidEligibilityRenewalDate)}
          />
        </div>
      </Card>

      <Card title="Screening Questions">
        <div className="space-y-4">
          <YesNoWithDetail
            name="justiceInvolved"
            label="Is the Member Justice-Involved?"
            defaultValue={demographics?.justiceInvolved}
            detailName="justiceInvolvedDetails"
            detailDefault={demographics?.justiceInvolvedDetails}
          />
          <YesNoField
            name="caraIndividual"
            label="Is the Member a Comprehensive Addiction and Recovery Act (CARA) Individual?"
            defaultValue={demographics?.caraIndividual}
          />
          <YesNoWithDetail
            name="cyfdInvolved"
            label="Is the Member Children Youth and Families Department (CYFD) involved or a Child in State Custody (CISC)?"
            defaultValue={demographics?.cyfdInvolved}
            detailName="cyfdInvolvedDetails"
            detailDefault={demographics?.cyfdInvolvedDetails}
          />
          <YesNoWithDetail
            name="hasOtherInsurance"
            label="Do you have any other insurance in addition to New Mexico Medicaid?"
            defaultValue={demographics?.hasOtherInsurance}
            detailName="otherInsuranceDetails"
            detailDefault={demographics?.otherInsuranceDetails}
          />
          <YesNoWithDetail
            name="onWaiver"
            label="Is the member on a waiver?"
            defaultValue={demographics?.onWaiver}
            detailName="waiverType"
            detailDefault={demographics?.waiverType}
            detailLabel="If yes, clarify type of waiver"
          />
        </div>
      </Card>

      <Card title="Authorized Representative">
        <div className="space-y-4">
          <TextField
            name="cnaCompletedByNameRelation"
            label="Name/Relation of Person Completing CNA, if other than identified Member"
            defaultValue={demographics?.cnaCompletedByNameRelation}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField name="representativeName" label="Representative Name" defaultValue={demographics?.representativeName} />
            <TextField name="representativePhone" label="Representative Phone" defaultValue={demographics?.representativePhone} />
            <TextField name="representativeEmail" label="Representative Email" defaultValue={demographics?.representativeEmail} />
          </div>
          <TextField name="decisionMaker" label="Who is the Decision Maker?" defaultValue={demographics?.decisionMaker} />
          <YesNoField
            name="representativeDocumentationSubmitted"
            label="Was the Documentation Submitted?"
            defaultValue={demographics?.representativeDocumentationSubmitted}
          />
          <TextField
            name="representativeDocumentationType"
            label="Type of Documentation Submitted"
            defaultValue={demographics?.representativeDocumentationType}
          />
          <YesNoField
            name="permissionToContactRepWithoutMember"
            label="Do we have permission to contact the representative without the Member present?"
            defaultValue={demographics?.permissionToContactRepWithoutMember}
          />
        </div>
      </Card>

      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Save Demographics
      </button>
    </form>
  );
}
