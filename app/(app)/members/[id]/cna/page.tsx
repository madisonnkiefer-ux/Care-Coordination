import { notFound } from "next/navigation";
import { getCnaFormData } from "@/lib/data/cna";
import { PageHeader, Card, Badge } from "@/components/ui";
import { saveCna } from "@/app/actions/cna";
import { formatDate } from "@/lib/format";

export default async function CnaBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCnaFormData(id);
  if (!data) notFound();

  const { member, draft, latestCompletedDate, domains } = data;

  return (
    <div>
      <PageHeader
        title="CNA Builder"
        description={`${member.firstName} ${member.lastName} · Comprehensive Needs Assessment`}
        action={
          latestCompletedDate ? (
            <Badge color="green">Last completed {formatDate(latestCompletedDate)}</Badge>
          ) : (
            <Badge color="yellow">No completed assessment yet</Badge>
          )
        }
      />

      <form action={saveCna.bind(null, id)} className="space-y-6 p-8">
        <Card title="1. Assessment Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Assessment Type
              </label>
              <select
                name="assessmentType"
                defaultValue={draft?.assessmentType ?? "Initial CNA"}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option>Initial CNA</option>
                <option>Annual CNA</option>
                <option>Reassessment</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="2 & 3. Needs and Strengths by Life Domain">
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.key} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{domain.label}</h3>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      name={`hasNeeds_${domain.key}`}
                      defaultChecked={domain.existing?.hasNeeds ?? false}
                    />
                    Needs identified
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500"># of needs</label>
                    <input
                      type="number"
                      min={0}
                      name={`needsCount_${domain.key}`}
                      defaultValue={domain.existing?.needsCount ?? 0}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs text-slate-500">Strengths</label>
                    <input
                      name={`strengths_${domain.key}`}
                      defaultValue={domain.existing?.strengths ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block text-xs text-slate-500">Notes</label>
                    <input
                      name={`notes_${domain.key}`}
                      defaultValue={domain.existing?.notes ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="4. Summary">
          <textarea
            name="summaryNotes"
            rows={4}
            defaultValue={draft?.summaryNotes ?? ""}
            placeholder="Overall assessment summary..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </Card>

        <div className="flex gap-3">
          <button
            type="submit"
            name="intent"
            value="draft"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Save Draft
          </button>
          <button
            type="submit"
            name="intent"
            value="complete"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Complete Assessment
          </button>
        </div>
      </form>
    </div>
  );
}
