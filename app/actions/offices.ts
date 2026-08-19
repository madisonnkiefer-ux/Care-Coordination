"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

const OFFICE_CODE_REGEX = /^[A-Z0-9-]+$/;

const CreateOfficeSchema = z.object({
  officeName: z.string().min(1, { error: "Office name is required." }),
  officeCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, { error: "Office code must be at least 3 characters." })
    .regex(OFFICE_CODE_REGEX, { error: "Office code can only contain letters, numbers, and hyphens." }),
  adminName: z.string().min(1, { error: "Admin name is required." }),
  adminEmail: z.email({ error: "Enter a valid admin email." }),
  adminPassword: z.string().min(8, { error: "Admin password must be at least 8 characters." }),
});

export type CreateOfficeState = { error?: string } | undefined;

export async function createOffice(_state: CreateOfficeState, formData: FormData): Promise<CreateOfficeState> {
  const session = await requirePermission("MANAGE_OFFICES");

  const validated = CreateOfficeSchema.safeParse({
    officeName: formData.get("officeName"),
    officeCode: formData.get("officeCode"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { officeName, officeCode, adminName, adminEmail, adminPassword } = validated.data;

  const [existingClinic, existingUser] = await Promise.all([
    db.clinic.findUnique({ where: { code: officeCode } }),
    db.user.findUnique({ where: { email: adminEmail } }),
  ]);
  if (existingClinic) return { error: "An office with that code already exists." };
  if (existingUser) return { error: "A user with that admin email already exists." };

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const { clinic, admin } = await db.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({ data: { name: officeName, code: officeCode } });
    const admin = await tx.user.create({
      data: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN", clinicId: clinic.id },
    });
    return { clinic, admin };
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "Clinic",
    resourceId: clinic.id,
    metadata: { name: officeName, code: officeCode, initialAdminEmail: adminEmail },
  });
  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "User",
    resourceId: admin.id,
    metadata: { email: adminEmail, role: "ADMIN", clinicId: clinic.id },
  });

  revalidatePath("/settings");
  return undefined;
}

const UpdateOfficeSchema = z.object({
  officeName: z.string().min(1, { error: "Office name is required." }),
  officeCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, { error: "Office code must be at least 3 characters." })
    .regex(OFFICE_CODE_REGEX, { error: "Office code can only contain letters, numbers, and hyphens." }),
});

export type UpdateOfficeState = { error?: string } | undefined;

export async function updateOffice(
  clinicId: string,
  _state: UpdateOfficeState,
  formData: FormData,
): Promise<UpdateOfficeState> {
  const session = await requirePermission("MANAGE_OFFICES");

  const target = await db.clinic.findUnique({ where: { id: clinicId } });
  if (!target) throw new Error("Not found");

  const validated = UpdateOfficeSchema.safeParse({
    officeName: formData.get("officeName"),
    officeCode: formData.get("officeCode"),
  });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { officeName, officeCode } = validated.data;

  if (officeCode !== target.code) {
    const codeInUse = await db.clinic.findUnique({ where: { code: officeCode } });
    if (codeInUse) return { error: "An office with that code already exists." };
  }

  if (officeName === target.name && officeCode === target.code) return undefined;

  await db.clinic.update({ where: { id: clinicId }, data: { name: officeName, code: officeCode } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "Clinic",
    resourceId: clinicId,
    metadata: { previousName: target.name, previousCode: target.code, newName: officeName, newCode: officeCode },
  });

  revalidatePath("/settings");
  return undefined;
}
