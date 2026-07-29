export function TextField({
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
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>
      <input
        id={name}
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
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  className?: string;
  rows?: number;
  form?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        form={form}
        rows={rows}
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
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  form?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>
      <input
        type="date"
        id={name}
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
// in, wins over the dropdown when the form is saved.
export function SelectField({
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
      <label htmlFor={name} className="mb-1 block text-xs font-medium uppercase tracking-wide text-stone-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={isCustom ? "" : defaultValue ?? ""}
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deep-rose"
      >
        <option value="">—</option>
        {options.map((opt) => (
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
  return (
    <label className="flex items-center gap-2 text-sm text-stone-700">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-stone-300" />
      {label}
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
  return (
    <div className="space-y-2">
      {options.map((opt) => (
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
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
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
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
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
  return (
    <div>
      <p className="mb-1 text-sm font-medium text-stone-700">{label}</p>
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
