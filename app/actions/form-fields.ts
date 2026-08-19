"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { getFieldDef, DEMOGRAPHICS_FIELD_KEYS, PROTECTED_OPTIONS } from "@/lib/form-fields/registry";
import { resolveFormOrder, serializeItemRef } from "@/lib/form-fields/ordering";

// Forms with an admin-configurable field order today. Extend this (and give
// each new entry its own *_FIELD_KEYS export from registry.ts) as ordering
// rolls out to the other intake forms.
const ORDERABLE_FORMS: Record<string, string[]> = {
  demographics: DEMOGRAPHICS_FIELD_KEYS,
};

function parseOptions(formData: FormData): string[] {
  const raw = formData.get("options");
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const options: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      options.push(trimmed);
    }
  }
  return options;
}

export async function updateFormFieldOverride(fieldKey: string, formData: FormData) {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const def = getFieldDef(fieldKey);
  if (!def) throw new Error("Unknown form field.");

  const isOptionsField = def.defaultOptions.length > 0;
  let options: string[] | null = null;
  if (isOptionsField) {
    options = parseOptions(formData);
    if (options.length === 0) {
      throw new Error("At least one option is required.");
    }
    const required = PROTECTED_OPTIONS[fieldKey];
    if (required) {
      const missing = required.filter((value) => !options!.includes(value));
      if (missing.length > 0) {
        throw new Error(`This field drives required-assessment logic — these values can't be removed: ${missing.join(", ")}`);
      }
    }
  }

  const labelRaw = formData.get("label");
  const label = typeof labelRaw === "string" && labelRaw.trim() !== "" ? labelRaw.trim() : null;

  const hiddenRaw = formData.get("hidden");
  const hidden = def.hideable ? hiddenRaw === "on" : false;

  await db.formFieldOverride.upsert({
    where: { clinicId_fieldKey: { clinicId: session.clinicId, fieldKey } },
    create: { clinicId: session.clinicId, fieldKey, label, options: options ?? undefined, hidden, updatedById: session.userId },
    update: { label, options: options ?? undefined, hidden, updatedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "FormFieldOverride",
    resourceId: fieldKey,
  });

  revalidatePath("/settings");
}

export async function moveFormField(form: string, fieldKey: string, direction: "up" | "down") {
  const session = await requirePermission("MANAGE_FORM_CONTENT");
  const def = getFieldDef(fieldKey);
  const registryFieldKeysInOrder = ORDERABLE_FORMS[form];
  if (!def || !registryFieldKeysInOrder || !registryFieldKeysInOrder.includes(fieldKey)) {
    throw new Error("Reordering isn't available for this field yet.");
  }

  const existingRow = await db.formFieldOrder.findUnique({ where: { clinicId_form: { clinicId: session.clinicId, form } } });
  const storedOrder = Array.isArray(existingRow?.itemOrder) ? (existingRow.itemOrder as string[]) : null;
  const resolved = resolveFormOrder({ storedOrder, registryFieldKeysInOrder, activeCustomQuestionIds: [] });

  // Only ever swap within the same section (Card) — moving a field across
  // sections would leave it rendering inside a Card its own registry entry
  // doesn't belong to.
  const sectionPositions = resolved
    .map((ref, i) => ({ ref, i }))
    .filter(({ ref }) => ref.type === "field" && getFieldDef(ref.key)?.section === def.section)
    .map(({ i }) => i);

  const currentPos = resolved.findIndex((ref) => ref.type === "field" && ref.key === fieldKey);
  const posInSection = sectionPositions.indexOf(currentPos);
  const swapSectionPos = direction === "up" ? posInSection - 1 : posInSection + 1;
  if (posInSection === -1 || swapSectionPos < 0 || swapSectionPos >= sectionPositions.length) return;

  const swapWithPos = sectionPositions[swapSectionPos];
  [resolved[currentPos], resolved[swapWithPos]] = [resolved[swapWithPos], resolved[currentPos]];

  const itemOrder = resolved.map(serializeItemRef);
  await db.formFieldOrder.upsert({
    where: { clinicId_form: { clinicId: session.clinicId, form } },
    create: { clinicId: session.clinicId, form, itemOrder, updatedById: session.userId },
    update: { itemOrder, updatedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "FormFieldOrder",
    resourceId: `${form}:${fieldKey}`,
    metadata: { moved: direction },
  });

  revalidatePath("/settings");
}

export async function resetFormFieldOverride(fieldKey: string) {
  const session = await requirePermission("MANAGE_FORM_CONTENT");

  await db.formFieldOverride.deleteMany({ where: { clinicId: session.clinicId, fieldKey } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "FormFieldOverride",
    resourceId: fieldKey,
  });

  revalidatePath("/settings");
}
