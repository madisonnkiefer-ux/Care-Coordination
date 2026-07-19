"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type GoalTotals = { onTrack: number; inProgress: number; notStarted: number; complete: number };

const COLORS = {
  onTrack: "#1c1917",
  inProgress: "#d4a574",
  complete: "#a8a29e",
  notStarted: "#e8b4b8",
};

export function GoalDonut({ totals }: { totals: GoalTotals }) {
  const data = [
    { key: "onTrack", label: "On Track", value: totals.onTrack },
    { key: "inProgress", label: "In Progress", value: totals.inProgress },
    { key: "complete", label: "Complete", value: totals.complete },
    { key: "notStarted", label: "Not Started", value: totals.notStarted },
  ].filter((d) => d.value > 0);

  const total = totals.onTrack + totals.inProgress + totals.notStarted + totals.complete;

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total === 0 ? [{ key: "empty", label: "None", value: 1 }] : data}
              dataKey="value"
              nameKey="label"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={total === 0 ? 0 : 2}
              stroke="none"
            >
              {(total === 0 ? [{ key: "empty" }] : data).map((entry) => (
                <Cell
                  key={entry.key}
                  fill={total === 0 ? "#e7e5e4" : COLORS[entry.key as keyof typeof COLORS]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-stone-900">{total}</span>
          <span className="text-[10px] text-stone-500">Total Goals</span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        <LegendRow color={COLORS.onTrack} label="On Track" value={totals.onTrack} />
        <LegendRow color={COLORS.inProgress} label="In Progress" value={totals.inProgress} />
        <LegendRow color={COLORS.complete} label="Complete" value={totals.complete} />
        <LegendRow color={COLORS.notStarted} label="Not Started" value={totals.notStarted} />
      </ul>
    </div>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-stone-600">{label}</span>
      <span className="text-stone-400">({value})</span>
    </li>
  );
}
