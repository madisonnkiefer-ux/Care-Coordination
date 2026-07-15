import { notFound } from "next/navigation";
import { getHraFormData } from "@/lib/data/hra";
import { PageHeader, Card, Badge } from "@/components/ui";
import { saveHra } from "@/app/actions/hra";
import { formatDate } from "@/lib/format";

export default async function HraBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getHraFormData(id);
  if (!data) notFound();

  const { member, tools, latestCompletedDate } = data;

  return (
    <div>
      <PageHeader
        title="HRA Builder"
        description={`${member.firstName} ${member.lastName} · Health Risk Assessment`}
        action={
          latestCompletedDate ? (
            <Badge color="green">Last completed {formatDate(latestCompletedDate)}</Badge>
          ) : (
            <Badge color="yellow">No completed assessment yet</Badge>
          )
        }
      />

      <form action={saveHra.bind(null, id)} className="space-y-6 p-8">
        <Card title="1 & 2. Screening Tools and Results">
          <div className="space-y-4">
            {tools.map((tool) => (
              <div key={tool.key} className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{tool.label}</h3>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      name={`completed_${tool.key}`}
                      defaultChecked={Boolean(tool.existing?.completedAt)}
                    />
                    Completed
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Score</label>
                    <input
                      name={`score_${tool.key}`}
                      defaultValue={tool.existing?.score ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Risk Level</label>
                    <select
                      name={`riskLevel_${tool.key}`}
                      defaultValue={tool.existing?.riskLevel ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="Negative">Negative</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Notes</label>
                    <input
                      name={`notes_${tool.key}`}
                      defaultValue={tool.existing?.notes ?? ""}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
