"use client";

import { Card } from "@/components/ui";
import { needFieldName, type NeedsSectionConfig } from "@/components/toc/needs-config";
import { useFieldOverride } from "@/lib/form-fields/context";
import type { TocNeed } from "@/app/generated/prisma/client";

export function NeedsSection({ config, existingNeeds }: { config: NeedsSectionConfig; existingNeeds: TocNeed[] }) {
  const byKey = new Map(existingNeeds.map((n) => [n.needKey, n]));

  return (
    <Card title={config.title}>
      <p className="mb-4 text-xs text-stone-400">{config.subtitle}</p>
      <div className="space-y-4">
        {config.needs.map((need) => (
          <NeedRow key={need.key} section={config.section} needKey={need.key} defaultLabel={need.label} existing={byKey.get(need.key)} />
        ))}
      </div>
    </Card>
  );
}

function NeedRow({
  section,
  needKey,
  defaultLabel,
  existing,
}: {
  section: number;
  needKey: string;
  defaultLabel: string;
  existing: TocNeed | undefined;
}) {
  const override = useFieldOverride(`need.${section}.${needKey}`);
  const hasValue = Boolean(existing?.status);
  if (override?.hidden && !hasValue) return null;
  const label = override?.label || defaultLabel;

  return (
    <div className="grid grid-cols-1 items-start gap-2 border-t border-stone-100 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-3">
      <p className="text-sm font-medium text-stone-700 sm:col-span-1">{label}</p>
      <div className="flex gap-6 sm:col-span-1">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="radio"
            name={needFieldName(section, needKey, "status")}
            value="NONE"
            defaultChecked={existing?.status === "NONE"}
            className="h-4 w-4"
          />
          None
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="radio"
            name={needFieldName(section, needKey, "status")}
            value="YES"
            defaultChecked={existing?.status === "YES"}
            className="h-4 w-4"
          />
          Yes
        </label>
      </div>
      <input
        name={needFieldName(section, needKey, "actions")}
        placeholder="If yes, describe / Actions"
        defaultValue={existing?.actions ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />
    </div>
  );
}
