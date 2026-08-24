"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { revokeUserSessions, unrevokeUserSessions } from "@/lib/session-revocation";
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
  const session = await requirePermission("MANAGE_USERS");

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

  // Minting an Admin account is equivalent to full control of the
  // permissions system (lib/data/permissions.ts is deliberately gated to
  // requireRole("ADMIN"), never requirePermission, for exactly this
  // reason) — MANAGE_USERS is a delegatable permission, so without this
  // check a Supervisor granted it could create a brand-new Admin account
  // and log in as it, going around that gate entirely.
  if (role === "ADMIN" && session.role !== "ADMIN") {
    return { error: "Only an Admin can create another Admin account." };
  }

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
  const session = await requirePermission("MANAGE_USERS");
  if (userId === session.userId) throw new Error("You cannot change your own role.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const role = formData.get("role");
  if (typeof role !== "string" || !ROLES.includes(role as Role)) {
    throw new Error("Invalid role");
  }
  if (role === target.role) return;

  // Same invariant as createUser above: promoting someone to Admin, or
  // changing an existing Admin's role, must go through an actual Admin —
  // not just whoever holds the delegatable MANAGE_USERS permission.
  if ((role === "ADMIN" || target.role === "ADMIN") && session.role !== "ADMIN") {
    throw new Error("Only an Admin can grant or change Admin access.");
  }

  // A custom role is always based on one specific built-in role (see
  // CustomRole.basedOn) — changing the base role out from under it would
  // leave a mismatched assignment, so clear it here rather than leaving a
  // stale link an admin would have to notice and fix separately.
  await db.user.update({ where: { id: userId }, data: { role: role as Role, customRoleId: null } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { previousRole: target.role, newRole: role },
  });

  revalidatePath("/settings");
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8, { error: "Password must be at least 8 characters." }),
});

export type ResetPasswordState = { error?: string; success?: boolean } | undefined;

export async function resetUserPassword(
  userId: string,
  _state: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const session = await requirePermission("MANAGE_USERS");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const validated = ResetPasswordSchema.safeParse({ password: formData.get("password") });
  if (!validated.success) {
    return { error: validated.error.issues[0]?.message ?? "Check the password and try again." };
  }

  const passwordHash = await bcrypt.hash(validated.data.password, 10);
  await db.user.update({ where: { id: userId }, data: { passwordHash } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { passwordReset: true },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function setUserActive(userId: string, formData: FormData) {
  const session = await requirePermission("MANAGE_USERS");
  if (userId === session.userId) throw new Error("You cannot deactivate your own account.");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  const active = formData.get("active") === "true";
  if (active === target.active) return;

  await db.user.update({ where: { id: userId }, data: { active } });

  // Kills any session this user already has open, immediately — otherwise
  // a deactivated user's still-unexpired session cookie would keep working
  // until it naturally expires (idle timeout or the 8-hour absolute cap),
  // since the session JWT is never otherwise re-checked against the
  // database. See lib/session-revocation.ts.
  if (active) {
    unrevokeUserSessions(userId);
  } else {
    revokeUserSessions(userId);
  }

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { active },
  });

  revalidatePath("/settings");
}

// Clears an active brute-force lockout (see LOCKOUT_THRESHOLD in
// app/actions/auth.ts) early, before its self-healing timer expires — e.g.
// once an admin has confirmed with the user it was them, not an attacker.
export async function unlockUser(userId: string) {
  const session = await requirePermission("MANAGE_USERS");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");
  if (!target.lockedUntil) return;

  await db.user.update({ where: { id: userId }, data: { failedLoginAttempts: 0, lockedUntil: null } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { unlocked: true },
  });

  revalidatePath("/settings");
}
