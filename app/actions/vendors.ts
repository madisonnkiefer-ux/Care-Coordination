"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

function toDateOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const VendorSchema = z.object({
  name: z.string().min(1, { error: "Vendor name is required." }),
  purpose: z.string().optional(),
  hasBaa: z.boolean(),
  baaSignedDate: z.date().nullable(),
  baaExpiresAt: z.date().nullable(),
  contactName: z.string().optional(),
  contactEmail: z.union([z.email(), z.literal("")]).optional(),
  notes: z.string().optional(),
});

function parseVendorForm(formData: FormData) {
  return VendorSchema.safeParse({
    name: formData.get("name"),
    purpose: formData.get("purpose") || undefined,
    hasBaa: formData.get("hasBaa") === "on",
    baaSignedDate: toDateOrNull(formData.get("baaSignedDate")),
    baaExpiresAt: toDateOrNull(formData.get("baaExpiresAt")),
    contactName: formData.get("contactName") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export type VendorFormState = { error?: string } | undefined;

export async function createVendor(_state: VendorFormState, formData: FormData): Promise<VendorFormState> {
  const session = await requireRole("ADMIN");

  const validated = parseVendorForm(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { name, purpose, hasBaa, baaSignedDate, baaExpiresAt, contactName, contactEmail, notes } = validated.data;

  const vendor = await db.vendor.create({
    data: {
      clinicId: session.clinicId,
      name,
      purpose: purpose ?? null,
      hasBaa,
      baaSignedDate,
      baaExpiresAt,
      contactName: contactName ?? null,
      contactEmail: contactEmail || null,
      notes: notes ?? null,
      createdById: session.userId,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "Vendor",
    resourceId: vendor.id,
    metadata: { name, hasBaa },
  });

  revalidatePath("/settings");
  return undefined;
}

export async function updateVendor(
  vendorId: string,
  _state: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  const session = await requireRole("ADMIN");

  const target = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const validated = parseVendorForm(formData);
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const { name, purpose, hasBaa, baaSignedDate, baaExpiresAt, contactName, contactEmail, notes } = validated.data;

  await db.vendor.update({
    where: { id: vendorId },
    data: {
      name,
      purpose: purpose ?? null,
      hasBaa,
      baaSignedDate,
      baaExpiresAt,
      contactName: contactName ?? null,
      contactEmail: contactEmail || null,
      notes: notes ?? null,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "Vendor",
    resourceId: vendorId,
    metadata: { previousHasBaa: target.hasBaa, newHasBaa: hasBaa },
  });

  revalidatePath("/settings");
  return undefined;
}

export async function setVendorActive(vendorId: string, active: boolean) {
  const session = await requireRole("ADMIN");

  const target = await db.vendor.findUnique({ where: { id: vendorId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");
  if (target.active === active) return;

  await db.vendor.update({ where: { id: vendorId }, data: { active } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "Vendor",
    resourceId: vendorId,
    metadata: { active },
  });

  revalidatePath("/settings");
}
