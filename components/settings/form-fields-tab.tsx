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
        Rename a question, edit its dropdown/checklist options, or retire it from new forms when the state revises a
        form. Changes apply to this office only and take effect immediately. Renaming or removing an option never
        touches already-saved patient records, and retiring a question only hides it once it&apos;s blank — anything
        already on file (including anything on an already-signed record) keeps showing exactly as before.
      </p>
      {FORM_ORDER.map((formKey) => {
        const formRows = byForm.get(formKey) ?? [];
        if (formRows.length === 0) return null;
        const bySection = groupBy(formRows, (r) => r.section);

        return (
          <Card key={formKey} title={FORM_LABELS[formKey] ?? formKey}>
            <div className="space-y-2">
              {[...bySection.entries()].map(([section, sectionRows]) => (
                <details key={section} className="group rounded-lg border border-stone-100">
                  <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-stone-50">
                    <span>{section}</span>
                    <span className="text-xs font-normal text-stone-400">
                      {sectionRows.length} field{sectionRows.length === 1 ? "" : "s"}
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-stone-100 p-4">
                    {sectionRows.map((row) => (
                      <FieldEditor key={row.key} row={row} />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function FieldEditor({ row }: { row: SettingsFormFieldRow }) {
  const isOptionsField = row.options.length > 0;

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
      <form
        key={`${row.label}|${row.options.join("|")}|${row.hidden}`}
        action={updateFormFieldOverride.bind(null, row.key)}
        className="space-y-3"
      >
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Field Label</label>
          <input
            name="label"
            defaultValue={row.label}
            className="w-full max-w-md rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
        {isOptionsField && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-400">Options (one per line)</label>
            <textarea
              name="options"
              rows={Math.min(Math.max(row.options.length, 3), 12)}
              defaultValue={row.options.join("\n")}
              className="w-full rounded-md border border-stone-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
            />
          </div>
        )}
        {row.hideable ? (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" name="hidden" defaultChecked={row.hidden} className="h-4 w-4 rounded border-stone-300" />
            Retire this question — hide it from new forms going forward
          </label>
        ) : (
          <p className="text-xs text-stone-400">
            Can&apos;t be retired — other logic in the app (required-assessment checks, clinical scoring, or reports)
            depends on this question always being present.
          </p>
        )}
        <div className="flex justify-end">
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
