import { Card } from "@/components/ui";
import { saveDemographics } from "@/app/actions/demographics";
import { toDateInputValue } from "@/lib/format";
import type { Member, Demographics } from "@/app/generated/prisma/client";

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
const SEX_OPTIONS = ["Male", "Female", "Intersex", "Unknown/Declined"];
const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Transgender", "Other", "Unknown/Declined"];
const SEXUAL_IDENTITY_OPTIONS = ["Straight", "Gay", "Lesbian", "Bisexual", "Other", "Unknown/Declined"];

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
          <SelectField name="sexAssignedAtBirth" label="Sex Assigned at Birth" options={SEX_OPTIONS} defaultValue={demographics?.sexAssignedAtBirth} />
          <div />
          <SelectField name="currentGender" label="Current Gender" options={GENDER_OPTIONS} defaultValue={demographics?.currentGender} />
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

function TextField({
  name,
  label,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function TextArea({
  name,
  label,
  defaultValue,
  className = "",
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        rows={2}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function DateField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <input
        type="date"
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string | null;
}) {
  const isCustom = Boolean(defaultValue) && !options.includes(defaultValue as string);
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={isCustom ? "" : defaultValue ?? ""}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      {/* Not in the list? This overrides the dropdown above when filled in. */}
      <input
        name={`${name}Custom`}
        defaultValue={isCustom ? (defaultValue as string) : ""}
        placeholder="Not listed? Type it here instead"
        className="mt-1 w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
      />
    </div>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300" />
      {label}
    </label>
  );
}

function YesNoField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: boolean | null }) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="radio" name={name} value="no" defaultChecked={defaultValue === false} className="h-4 w-4" />
          No
        </label>
      </div>
    </div>
  );
}

function YesNoWithDetail({
  name,
  label,
  defaultValue,
  detailName,
  detailDefault,
  detailLabel = "If yes, specify",
}: {
  name: string;
  label: string;
  defaultValue?: boolean | null;
  detailName: string;
  detailDefault?: string | null;
  detailLabel?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="radio" name={name} value="no" defaultChecked={defaultValue === false} className="h-4 w-4" />
            No
          </label>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs text-slate-500">{detailLabel}:</label>
          <input
            name={detailName}
            defaultValue={detailDefault ?? ""}
            className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
          />
        </div>
      </div>
    </div>
  );
}
