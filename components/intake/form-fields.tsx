"use client";

import { useFieldOverride } from "@/lib/form-fields/context";

// A hidden (retired) field only disappears once it's blank — if the record
// already has an answer on file, it always keeps showing, so an admin
// retiring a question from new forms can never make an already-recorded
// answer vanish from an existing (possibly already-signed) record.
function isHiddenAndEmpty(hidden: boolean | undefined, hasValue: boolean) {
  return Boolean(hidden) && !hasValue;
}

export function TextField({
  name,
  label,
  defaultValue,
  className = "",
  id,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
  id?: string;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValue))) return null;
  const effectiveLabel = override?.label || label;
  const fieldId = id ?? name;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {effectiveLabel}
      </label>
      <input
        id={fieldId}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />
    </div>
  );
}

export function TextArea({
  name,
  label,
  defaultValue,
  className = "",
  rows = 2,
  form,
  id,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
  rows?: number;
  form?: string;
  id?: string;
  required?: boolean;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValue))) return null;
  const effectiveLabel = override?.label || label;
  const fieldId = id ?? name;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {effectiveLabel}
      </label>
      <textarea
        id={fieldId}
        name={name}
        form={form}
        rows={rows}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />
    </div>
  );
}

export function DateField({
  name,
  label,
  defaultValue,
  form,
  id,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  form?: string;
  id?: string;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValue))) return null;
  const effectiveLabel = override?.label || label;
  const fieldId = id ?? name;

  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {effectiveLabel}
      </label>
      <input
        type="date"
        id={fieldId}
        name={name}
        form={form}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />
    </div>
  );
}

// A <select> of common options plus an always-visible override input (the
// "not listed? type it here instead" pattern) — the override, when filled
// in, wins over the dropdown when the form is saved. This is also why a
// retired option never orphans historical data: the old value still saves
// and displays fine as a custom entry even once it's off the picker.
export function SelectField({
  name,
  label,
  options,
  defaultValue,
  id,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string | null;
  id?: string;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValue))) return null;
  const effectiveLabel = override?.label || label;
  const effectiveOptions = override?.options ?? options;
  const fieldId = id ?? name;

  const isCustom = Boolean(defaultValue) && !effectiveOptions.includes(defaultValue as string);
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {effectiveLabel}
      </label>
      <select
        id={fieldId}
        name={name}
        defaultValue={isCustom ? "" : defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      >
        <option value="">—</option>
        {effectiveOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <input
        name={`${name}Custom`}
        defaultValue={isCustom ? (defaultValue as string) : ""}
        placeholder="Not listed? Type it here instead"
        className="mt-1 w-full rounded-md border border-stone-200 px-3 py-1.5 text-xs text-stone-600 focus:outline-none focus:ring-2 focus:ring-deep-rose"
      />
    </div>
  );
}

// A native multi-select dropdown for a "check all that apply" field —
// submits via formData.getAll(name) exactly like CheckboxGroup, just more
// compact for a long option list. Hold Ctrl/Cmd (or drag) to select more
// than one.
export function MultiSelectField({
  name,
  options,
  defaultValues,
  size = 6,
}: {
  name: string;
  options: string[];
  defaultValues?: string[] | null;
  size?: number;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValues?.length))) return null;
  const effectiveOptions = override?.options ?? options;

  return (
    <div>
      <select
        name={name}
        multiple
        size={Math.min(size, effectiveOptions.length)}
        defaultValue={defaultValues ?? []}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      >
        {effectiveOptions.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-stone-400">Hold Ctrl (Cmd on Mac) to select more than one.</p>
    </div>
  );
}

// Plain numeric select (no custom-override input) — for scored scale questions like PHQ-9.
export function NumberScaleField({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: { value: number; label: string }[];
  defaultValue?: number | null;
}) {
  return (
    <select
      id={name}
      name={name}
      defaultValue={defaultValue ?? ""}
      className="w-full max-w-sm rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultChecked))) return null;
  const effectiveLabel = override?.label || label;

  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-stone-300" />
      {effectiveLabel}
    </label>
  );
}

// A "check all that apply" list bound to a single form field name — reads back
// via formData.getAll(name) into a String[] column.
export function CheckboxGroup({
  name,
  options,
  defaultValues,
}: {
  name: string;
  options: string[];
  defaultValues?: string[] | null;
}) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValues?.length))) return null;
  const effectiveOptions = override?.options ?? options;

  return (
    <div className="space-y-2">
      {effectiveOptions.map((opt) => (
        <label key={opt} className="flex items-start gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            name={name}
            value={opt}
            defaultChecked={defaultValues?.includes(opt) ?? false}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

export function YesNoField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: boolean | null }) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, defaultValue !== null && defaultValue !== undefined)) return null;
  const effectiveLabel = override?.label || label;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{effectiveLabel}</p>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="radio" name={name} value="no" defaultChecked={defaultValue === false} className="h-4 w-4" />
          No
        </label>
      </div>
    </div>
  );
}

// Yes/No/N/A stored as the literal string "yes" | "no" | "na" (kept distinct
// from an unanswered field, unlike a two-state boolean).
export function YesNoNaField({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  const override = useFieldOverride(name);
  if (isHiddenAndEmpty(override?.hidden, Boolean(defaultValue))) return null;
  const effectiveLabel = override?.label || label;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{effectiveLabel}</p>
      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="radio" name={name} value="yes" defaultChecked={defaultValue === "yes"} className="h-4 w-4" />
          Yes
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="radio" name={name} value="no" defaultChecked={defaultValue === "no"} className="h-4 w-4" />
          No
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input type="radio" name={name} value="na" defaultChecked={defaultValue === "na"} className="h-4 w-4" />
          N/A
        </label>
      </div>
    </div>
  );
}

export function YesNoWithDetail({
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
  const override = useFieldOverride(name);
  const hasValue = (defaultValue !== null && defaultValue !== undefined) || Boolean(detailDefault);
  if (isHiddenAndEmpty(override?.hidden, hasValue)) return null;
  const effectiveLabel = override?.label || label;

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{effectiveLabel}</p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="radio" name={name} value="yes" defaultChecked={defaultValue === true} className="h-4 w-4" />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-600">
            <input type="radio" name={name} value="no" defaultChecked={defaultValue === false} className="h-4 w-4" />
            No
          </label>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <label className="text-xs text-stone-500">{detailLabel}:</label>
          <input
            name={detailName}
            defaultValue={detailDefault ?? ""}
            className="flex-1 rounded-md border border-stone-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
          />
        </div>
      </div>
    </div>
  );
}
