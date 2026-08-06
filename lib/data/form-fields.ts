import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { FORM_FIELD_REGISTRY, type ResolvedFormFields } from "@/lib/form-fields/registry";

// Every registered field is always present in the returned map — call sites
// (via lib/form-fields/context.tsx) never need a fallback for a field that's
// been customized. Fields not in the registry simply resolve to undefined,
// which callers already treat as "no override, use my own default."
export async function getFormFieldOverrides(clinicId: string): Promise<ResolvedFormFields> {
  const overrides = await db.formFieldOverride.findMany({ where: { clinicId } });
  const overrideByKey = new Map(overrides.map((o) => [o.fieldKey, o]));

  const resolved: ResolvedFormFields = {};
  for (const def of FORM_FIELD_REGISTRY) {
    const override = overrideByKey.get(def.key);
    const options = Array.isArray(override?.options) ? (override.options as string[]) : def.defaultOptions;
    resolved[def.key] = {
      label: override?.label || def.name,
      options,
      hidden: override?.hidden ?? false,
    };
  }
  return resolved;
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
};

// Settings → Form Content listing: every registry field plus whether this
// clinic has customized it, for the admin editor.
export async function getFormFieldsForSettings(): Promise<SettingsFormFieldRow[]> {
  const session = await requireRole("ADMIN");
  const overrides = await db.formFieldOverride.findMany({ where: { clinicId: session.clinicId } });
  const overrideByKey = new Map(overrides.map((o) => [o.fieldKey, o]));

  return FORM_FIELD_REGISTRY.map((def) => {
    const override = overrideByKey.get(def.key);
    const options = Array.isArray(override?.options) ? (override.options as string[]) : def.defaultOptions;
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
    };
  });
}
