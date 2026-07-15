import { getMemberForEdit } from "@/lib/data/members";
import { PageHeader, Card } from "@/components/ui";
import { saveDemographics } from "@/app/actions/demographics";
import { formatDate } from "@/lib/format";

export default async function DemographicsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { member, demographics } = await getMemberForEdit(id);

  return (
    <div>
      <PageHeader
        title="Demographics"
        description={`${member.firstName} ${member.lastName} · DOB ${formatDate(member.dateOfBirth)}`}
      />

      <div className="p-8">
        <form action={saveDemographics.bind(null, id)} className="max-w-3xl space-y-6">
          <Card title="Contact Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="phone" label="Phone" defaultValue={member.phone} />
              <TextField name="email" label="Email" defaultValue={member.email} />
              <TextField name="address" label="Address" defaultValue={member.address} className="sm:col-span-2" />
              <TextField name="language" label="Preferred Language" defaultValue={member.language} />
              <TextField name="medicaidId" label="Medicaid ID" defaultValue={member.medicaidId} />
            </div>
          </Card>

          <Card title="Emergency Contact">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField name="emergencyContactName" label="Name" defaultValue={demographics?.emergencyContactName} />
              <TextField name="emergencyContactPhone" label="Phone" defaultValue={demographics?.emergencyContactPhone} />
              <TextField name="emergencyContactRel" label="Relationship" defaultValue={demographics?.emergencyContactRel} />
            </div>
          </Card>

          <Card title="Additional Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField name="race" label="Race" defaultValue={demographics?.race} />
              <TextField name="ethnicity" label="Ethnicity" defaultValue={demographics?.ethnicity} />
              <TextField name="primaryPayer" label="Primary Payer" defaultValue={demographics?.primaryPayer} />
              <TextField name="housingStatus" label="Housing Status" defaultValue={demographics?.housingStatus} />
            </div>
          </Card>

          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Save Demographics
          </button>
        </form>
      </div>
    </div>
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
