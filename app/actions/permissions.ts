"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { ALL_PERMISSIONS } from "@/lib/permissions";
import { setRolePermissions, createCustomRole, setCustomRolePermissions, deleteCustomRole } from "@/lib/data/permissions";
import type { Permission, Role } from "@/app/generated/prisma/client";

function permissionsFromForm(formData: FormData): Permission[] {
  return ALL_PERMISSIONS.filter((p) => formData.get(p) === "on");
}

export type SavePermissionsState = { error?: string; success?: boolean } | undefined;

export async function saveRolePermissions(
  role: Role,
  _state: SavePermissionsState,
  formData: FormData,
): Promise<SavePermissionsState> {
  try {
    await setRolePermissions(role, permissionsFromForm(formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save." };
  }
  revalidatePath("/settings");
  return { success: true };
}

export type CreateRoleState = { error?: string } | undefined;

export async function createRole(_state: CreateRoleState, formData: FormData): Promise<CreateRoleState> {
  const name = String(formData.get("name") ?? "").trim();
  const basedOn = formData.get("basedOn") as Role;
  if (!name) return { error: "Name is required." };
  if (!["CARE_COORDINATOR", "SUPERVISOR", "ADMIN"].includes(basedOn)) {
    return { error: "Choose a role to clone." };
  }

  try {
    await createCustomRole(name, basedOn);
  } catch (err) {
    return { error: err instanceof Error && err.message.includes("Unique") ? "A role with that name already exists." : "Couldn't create role." };
  }
  revalidatePath("/settings");
  return undefined;
}

export async function saveCustomRolePermissions(
  customRoleId: string,
  _state: SavePermissionsState,
  formData: FormData,
): Promise<SavePermissionsState> {
  try {
    await setCustomRolePermissions(customRoleId, permissionsFromForm(formData));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save." };
  }
  revalidatePath("/settings");
  return { success: true };
}

export async function removeCustomRole(customRoleId: string) {
  await deleteCustomRole(customRoleId);
  revalidatePath("/settings");
}

// Assigns (or clears) a custom permission set on a user — independent of
// their base `role`, which keeps governing hardcoded business rules (see
// lib/permissions.ts). A custom role must belong to the caller's own
// clinic and, since it always derives from one of the 3 built-ins, must
// match the user's own base role (a Care Coordinator can't be handed a
// role cloned from Admin — that would grant permissions with no matching
// base-role business logic behind them, e.g. no real signing authority
// even if the permission grid says otherwise).
export async function assignCustomRole(userId: string, customRoleId: string | null) {
  // Every other write in this file is requireRole("ADMIN"), never
  // requirePermission — MANAGE_USERS is a delegatable permission, and this
  // still edits what permission set a user effectively has, so it must not
  // be reachable by anyone who isn't an actual Admin.
  const session = await requireRole("ADMIN");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  if (customRoleId) {
    const customRole = await db.customRole.findUnique({ where: { id: customRoleId } });
    if (!customRole || customRole.clinicId !== session.clinicId) throw new Error("Not found");
    if (customRole.basedOn !== target.role) {
      throw new Error(`This role is based on ${customRole.basedOn}, but ${target.name} is a ${target.role}.`);
    }
  }

  await db.user.update({ where: { id: userId }, data: { customRoleId } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "User",
    resourceId: userId,
    metadata: { customRoleId },
  });

  revalidatePath("/settings");
}
