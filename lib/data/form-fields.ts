import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { FORM_FIELD_REGISTRY, type ResolvedFormFields } from "@/lib/form-fields/registry";

// Every field is always present in the returned map — call sites never need
// a fallback, whether or not the clinic has customized that field yet.
export async function getFormFieldOverrides(clinicId: string): Promise<ResolvedFormFields> {
  const overrides = await db.formFieldOverride.findMany({ where: { clinicId } });
  const overrideByKey = new Map(overrides.map((o) => [o.fieldKey, o]));

  const resolved: ResolvedFormFields = {};
  for (const def of FORM_FIELD_REGISTRY) {
    const override = overrideByKey.get(def.key);
    const options = Array.isArray(override?.options) ? (override.options as string[]) : def.defaultOptions;
    resolved[def.key] = {
      label: (def.labelEditable ? override?.label : null) || def.name,
      options,
    };
  }
  return resolved;
}

export type SettingsFormFieldRow = {
  key: string;
  form: string;
  section: string;
  name: string;
  labelEditable: boolean;
  label: string;
  options: string[];
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
      labelEditable: def.labelEditable,
      label: (def.labelEditable ? override?.label : null) || def.name,
      options,
      isCustomized: Boolean(override),
    };
  });
}
