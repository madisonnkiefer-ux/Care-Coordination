"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { getFieldDef, PROTECTED_OPTIONS } from "@/lib/form-fields/registry";

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
  const session = await requireRole("ADMIN");
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

export async function resetFormFieldOverride(fieldKey: string) {
  const session = await requireRole("ADMIN");

  await db.formFieldOverride.deleteMany({ where: { clinicId: session.clinicId, fieldKey } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "FormFieldOverride",
    resourceId: fieldKey,
  });

  revalidatePath("/settings");
}
