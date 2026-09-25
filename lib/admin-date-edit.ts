import "server-only";

export type DateFieldChange = { field: string; oldValue: string | null; newValue: string | null };

// Shared by every signable form's save action: once a record is locked
// (signed), only an ADMIN may still submit it, and only its date fields are
// applied — everything else in the FormData is ignored. A blank input is
// treated as "no change" rather than "clear it", both because several of
// these fields are non-nullable in the schema and because the feature is
// for correcting a date, not blanking one out. Returns the diff so callers
// can audit-log old/new values for each date that actually changed.
export function resolveAdminDateEdit<T extends Record<string, unknown>>(
  formData: FormData,
  dateFields: readonly (keyof T & string)[],
  existing: T
): { data: Record<string, Date>; changes: DateFieldChange[] } {
  const data: Record<string, Date> = {};
  const changes: DateFieldChange[] = [];

  for (const field of dateFields) {
    const raw = formData.get(field);
    if (typeof raw !== "string" || raw.trim() === "") continue;

    const newValue = new Date(raw);
    if (Number.isNaN(newValue.getTime())) continue;

    const existingValue = existing[field];
    const oldValue = existingValue instanceof Date ? existingValue : null;
    if (oldValue && oldValue.getTime() === newValue.getTime()) continue;

    data[field] = newValue;
    changes.push({
      field,
      oldValue: oldValue ? oldValue.toISOString() : null,
      newValue: newValue.toISOString(),
    });
  }

  return { data, changes };
}
