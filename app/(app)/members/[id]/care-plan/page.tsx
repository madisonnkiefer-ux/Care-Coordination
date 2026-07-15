import { notFound } from "next/navigation";
import { getCarePlanData } from "@/lib/data/care-plan";
import { PageHeader, Card } from "@/components/ui";
import { GoalStatusSelect } from "@/components/goal-status-select";
import { addGoal } from "@/app/actions/care-plan";
import { formatDate } from "@/lib/format";

export default async function CarePlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getCarePlanData(id);
  if (!data) notFound();

  const { member, carePlan } = data;
  const goals = carePlan?.goals ?? [];

  return (
    <div>
      <PageHeader
        title="Comprehensive Care Plan"
        description={`${member.firstName} ${member.lastName} · SMART Goals`}
      />

      <div className="space-y-6 p-8">
        <Card title="Goals">
          {goals.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No goals yet. Add the first one below.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {goals.map((goal) => (
                <li key={goal.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{goal.title}</p>
                    {goal.description && <p className="text-sm text-slate-500">{goal.description}</p>}
                    {goal.targetDate && (
                      <p className="mt-0.5 text-xs text-slate-400">Target: {formatDate(goal.targetDate)}</p>
                    )}
                  </div>
                  <GoalStatusSelect memberId={id} goalId={goal.id} status={goal.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Add Goal">
          <form action={addGoal.bind(null, id)} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Goal Title
              </label>
              <input
                name="title"
                required
                placeholder="e.g. Improve prenatal care attendance"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Description
              </label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="max-w-xs">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Target Date
              </label>
              <input type="date" name="targetDate" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Add Goal
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
