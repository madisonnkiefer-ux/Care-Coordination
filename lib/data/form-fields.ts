import "server-only";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { ORDERABLE_FORMS } from "@/lib/form-fields/orderable-forms";
import { FORM_FIELD_REGISTRY, getFieldDef, type ResolvedFormFields } from "@/lib/form-fields/registry";
import { resolveFormOrder } from "@/lib/form-fields/ordering";

// Every registered field is always present in the returned map — call sites
// (via lib/form-fields/context.tsx) never need a fallback for a field that's
// been customized. Fields not in the registry simply resolve to undefined,
// which callers already treat as "no override, use my own default."
//
// `label` is left undefined when the clinic hasn't actually customized this
// field — it must NOT fall back to the registry's own `def.name` here. That
// name is Settings' admin-facing catalog text (getFormFieldsForSettings
// below uses it for exactly that), sometimes annotated for the editor's
// benefit (e.g. "(also used on the HRA)") and often intentionally blank at
// the call site because the tab already renders its own numbered heading —
// falling back to it here would override every field's own default/blank
// label with that catalog text even when nobody customized anything.
export async function getFormFieldOverrides(clinicId: string): Promise<ResolvedFormFields> {
  const overrides = await db.formFieldOverride.findMany({ where: { clinicId } });
  const overrideByKey = new Map(overrides.map((o) => [o.fieldKey, o]));

  const resolved: ResolvedFormFields = {};
  for (const def of FORM_FIELD_REGISTRY) {
    const override = overrideByKey.get(def.key);
    const options = Array.isArray(override?.options) ? (override.options as string[]) : def.defaultOptions;
    resolved[def.key] = {
      label: override?.label || undefined,
      options,
      hidden: override?.hidden ?? false,
    };
  }
  return resolved;
}

// Resolved built-in field order for one tab (currently only "demographics"
// has an admin-configurable order — see FormFieldOrder in schema.prisma).
// `registryFieldKeysInOrder` is that tab's fields in their hardcoded
// fallback order (e.g. registry.ts's DEMOGRAPHICS_FIELD_KEYS).
export async function getResolvedFieldOrder(clinicId: string, form: string, registryFieldKeysInOrder: string[]): Promise<string[]> {
  const row = await db.formFieldOrder.findUnique({ where: { clinicId_form: { clinicId, form } } });
  const storedOrder = Array.isArray(row?.itemOrder) ? (row.itemOrder as string[]) : null;
  const resolved = resolveFormOrder({ storedOrder, registryFieldKeysInOrder, activeCustomQuestionIds: [] });
  return resolved.filter((ref) => ref.type === "field").map((ref) => ref.key);
}

export type SettingsFormFieldRow = {
  key: string;
  form: string;
  section: string;
  name: string;
  label: string;
  options: string[];
  hidden: boolean;
  hideable: boolean;
  isCustomized: boolean;
  // Reordering — orderableForm is set only for fields belonging to a form in
  // ORDERABLE_FORMS (currently just "demographics"); pass it as moveFormField's
  // `form` argument. orderIndexInSection/isFirst/isLastInSection are relative
  // to the field's own section (Card) only, since fields can't be moved
  // across sections.
  orderableForm: string | null;
  orderIndexInSection: number;
  isFirstInSection: boolean;
  isLastInSection: boolean;
};

// Settings → Form Content listing: every registry field plus whether this
// clinic has customized it, for the admin editor.
export async function getFormFieldsForSettings(): Promise<SettingsFormFieldRow[]> {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const [overrides, orderableResolved] = await Promise.all([
    db.formFieldOverride.findMany({ where: { clinicId: session.clinicId } }),
    Promise.all(
      Object.entries(ORDERABLE_FORMS).map(async ([form, keys]) => [form, await getResolvedFieldOrder(session.clinicId, form, keys)] as const)
    ),
  ]);
  const overrideByKey = new Map(overrides.map((o) => [o.fieldKey, o]));

  // Position-within-section for every orderable field, across every
  // orderable form.
  const sectionPosition = new Map<string, { index: number; isFirst: boolean; isLast: boolean }>();
  for (const [, order] of orderableResolved) {
    const bySection = new Map<string, string[]>();
    for (const key of order) {
      const section = getFieldDef(key)?.section;
      if (!section) continue;
      let group = bySection.get(section);
      if (!group) {
        group = [];
        bySection.set(section, group);
      }
      group.push(key);
    }
    for (const keys of bySection.values()) {
      keys.forEach((key, i) => sectionPosition.set(key, { index: i, isFirst: i === 0, isLast: i === keys.length - 1 }));
    }
  }

  return FORM_FIELD_REGISTRY.map((def) => {
    const override = overrideByKey.get(def.key);
    const options = Array.isArray(override?.options) ? (override.options as string[]) : def.defaultOptions;
    const orderableForm = Object.entries(ORDERABLE_FORMS).find(([, keys]) => keys.includes(def.key))?.[0] ?? null;
    const position = sectionPosition.get(def.key);
    return {
      key: def.key,
      form: def.form,
      section: def.section,
      name: def.name,
      label: override?.label || def.name,
      options,
      hidden: override?.hidden ?? false,
      hideable: def.hideable,
      isCustomized: Boolean(override),
      orderableForm,
      orderIndexInSection: position?.index ?? 0,
      isFirstInSection: position?.isFirst ?? true,
      isLastInSection: position?.isLast ?? true,
    };
  });
}
