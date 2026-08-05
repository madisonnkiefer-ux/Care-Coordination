"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { Role } from "@/app/generated/prisma/client";

const ROLES: Role[] = ["CARE_COORDINATOR", "SUPERVISOR", "ADMIN"];

const CreateUserSchema = z.object({
  name: z.string().min(1, { error: "Name is required." }),
  email: z.email({ error: "Enter a valid email." }),
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
  role: z.enum(ROLES, { error: "Choose a role." }),
});

export type CreateUserState = { error?: string } | undefined;

export async function createUser(_state: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const session = await requireRole("ADMIN");

  const validated = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const { name, email, password, role } = validated.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { name, email, passwordHash, role, clinicId: session.clinicId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "User",
    resourceId: user.id,
    metadata: { email, role },
  });

  revalidatePath("/settings");
  redirect("/settings?tab=users");
}

export async function updateUserRole(userId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  if (userId === session.userId) throw new Error("You cannot change your own role.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const role = formData.get("role");
  if (typeof role !== "string" || !ROLES.includes(role as Role)) {
    throw new Error("Invalid role");
  }
  if (role === target.role) return;

  await db.user.update({ where: { id: userId }, data: { role: role as Role } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { previousRole: target.role, newRole: role },
  });

  revalidatePath("/settings");
}

export async function setUserActive(userId: string, formData: FormData) {
  const session = await requireRole("ADMIN");
  if (userId === session.userId) throw new Error("You cannot deactivate your own account.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const active = formData.get("active") === "true";
  if (active === target.active) return;

  await db.user.update({ where: { id: userId }, data: { active } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { active },
  });

  revalidatePath("/settings");
}
