import { Card } from "@/components/ui";
import { updateFormFieldOverride, resetFormFieldOverride } from "@/app/actions/form-fields";
import { SaveButton } from "@/components/save-button";
import type { SettingsFormFieldRow } from "@/lib/data/form-fields";

const FORM_ORDER = ["enrollment", "ccp", "toc"] as const;
const FORM_LABELS: Record<string, string> = {
  enrollment: "Enrollment (Demographics, HRA, CNA, Care Coordination Notes)",
  ccp: "Comprehensive Care Plan (CCP)",
  toc: "Transition of Care (TOC)",
};

function groupBy<T, K extends string>(items: T[], keyOf: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = map.get(key);
    if (group) group.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export function FormFieldsTab({ rows }: { rows: SettingsFormFieldRow[] }) {
  const byForm = groupBy(rows, (r) => r.form);

  return (
    <div className="space-y-6 p-8">
      <p className="max-w-2xl text-sm text-stone-500">
        Rename a field or edit its dropdown/checklist options when the state revises a form. Changes apply to this
        office only and take effect immediately. Renaming or removing an option never touches already-saved patient
        records — it only changes what&apos;s offered going forward.
      </p>
      {FORM_ORDER.map((formKey) => {
        const formRows = byForm.get(formKey) ?? [];
        if (formRows.length === 0) return null;
        const bySection = groupBy(formRows, (r) => r.section);

        return (
          <Card key={formKey} title={FORM_LABELS[formKey] ?? formKey}>
            <div className="space-y-6">
              {[...bySection.entries()].map(([section, sectionRows]) => (
                <div key={section}>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">{section}</h3>
                  <div className="space-y-4">
                    {sectionRows.map((row) => (
                      <FieldEditor key={row.key} row={row} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function FieldEditor({ row }: { row: SettingsFormFieldRow }) {
  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-charcoal">{row.name}</p>
        {row.isCustomized && (
          <form action={resetFormFieldOverride.bind(null, row.key)}>
            <button type="submit" className="shrink-0 text-xs font-medium text-stone-500 hover:text-charcoal hover:underline">
              Reset to default
            </button>
          </form>
        )}
      </div>
      <form key={`${row.label}|${row.options.join("|")}`} action={updateFormFieldOverride.bind(null, row.key)} className="space-y-3">
        {row.labelEditable && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Field Label</label>
            <input
              name="label"
              defaultValue={row.label}
              className="w-full max-w-sm rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Options (one per line)</label>
          <textarea
            name="options"
            rows={Math.min(Math.max(row.options.length, 3), 12)}
            defaultValue={row.options.join("\n")}
            className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        <div className="flex justify-end">
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
