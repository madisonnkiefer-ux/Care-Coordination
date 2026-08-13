// Resolves the final top-to-bottom order of a form's items — built-in
// fields and Additional Questions interleaved — from a clinic's saved
// FormFieldOrder row. See the model comment in schema.prisma for the
// "field:<key>" / "custom:<id>" ref format.

export type ItemRef = { type: "field"; key: string } | { type: "custom"; id: string };

export function parseItemRef(raw: string): ItemRef | null {
  if (raw.startsWith("field:")) return { type: "field", key: raw.slice("field:".length) };
  if (raw.startsWith("custom:")) return { type: "custom", id: raw.slice("custom:".length) };
  return null;
}

export function serializeItemRef(ref: ItemRef): string {
  return ref.type === "field" ? `field:${ref.key}` : `custom:${ref.id}`;
}

// `storedOrder` is whatever's saved (or null if this clinic has never
// customized this form's order). `registryFieldKeysInOrder` and
// `activeCustomQuestionIds` are the form's current, complete set of items in
// their own default order (registry array order; custom questions' own
// `order` field) — used both to fill in anything the stored order predates
// and to drop anything the stored order mentions that no longer exists
// (a retired-then-deleted question, a field removed from the registry).
export function resolveFormOrder(params: {
  storedOrder: string[] | null;
  registryFieldKeysInOrder: string[];
  activeCustomQuestionIds: string[];
}): ItemRef[] {
  const { storedOrder, registryFieldKeysInOrder, activeCustomQuestionIds } = params;
  const validFieldKeys = new Set(registryFieldKeysInOrder);
  const validCustomIds = new Set(activeCustomQuestionIds);

  const result: ItemRef[] = [];
  const seen = new Set<string>();

  for (const raw of storedOrder ?? []) {
    const ref = parseItemRef(raw);
    if (!ref) continue;
    if (ref.type === "field" && !validFieldKeys.has(ref.key)) continue;
    if (ref.type === "custom" && !validCustomIds.has(ref.id)) continue;
    const dedupeKey = serializeItemRef(ref);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(ref);
  }

  for (const key of registryFieldKeysInOrder) {
    const dedupeKey = `field:${key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push({ type: "field", key });
  }
  for (const id of activeCustomQuestionIds) {
    const dedupeKey = `custom:${id}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push({ type: "custom", id });
  }

  return result;
}
