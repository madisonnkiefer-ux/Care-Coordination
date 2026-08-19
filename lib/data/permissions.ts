import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import type { Permission, Role } from "@/app/generated/prisma/client";

// Every write function below deliberately uses `requireRole("ADMIN")` —
// the real, hardcoded Role enum — never `requirePermission("MANAGE_USERS")`
// or any other configurable permission. Editing the permission system
// itself is the one thing that can never be delegated through the
// permission system itself: if MANAGE_USERS (or a custom role holding it)
// could also edit role permissions, a Supervisor granted that one
// permission could grant themselves — or anyone — every other permission
// in the app. This file is the one place in the whole feature that stays
// permanently tied to the base Role enum.

// Called once at login (see app/actions/auth.ts) to bake the user's
// effective permissions into their session JWT — see lib/session.ts's
// SessionPayload. Like `role`/`name`/`email` already do, this means a
// permission change an admin makes doesn't affect an already-logged-in
// session until that user's next login; consistent with how a role change
// via updateUserRole works today.
export async function resolveUserPermissions(user: { role: Role; customRoleId: string | null }, clinicId: string): Promise<Permission[]> {
  if (user.customRoleId) {
    const customRole = await db.customRole.findUnique({ where: { id: user.customRoleId } });
    if (customRole) return customRole.permissions;
  }

  const override = await db.rolePermissions.findUnique({
    where: { clinicId_role: { clinicId, role: user.role } },
  });
  return override?.permissions ?? DEFAULT_PERMISSIONS[user.role];
}

// Settings > Roles & Permissions tab data.
export async function getRolesAndPermissionsData() {
  const session = await requireRole("ADMIN");

  const [overrides, customRoles] = await Promise.all([
    db.rolePermissions.findMany({ where: { clinicId: session.clinicId } }),
    db.customRole.findMany({
      where: { clinicId: session.clinicId },
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    }),
  ]);

  const overrideByRole = new Map(overrides.map((o) => [o.role, o.permissions]));
  const builtInRoles: { role: Role; permissions: Permission[] }[] = (["CARE_COORDINATOR", "SUPERVISOR", "ADMIN"] as Role[]).map(
    (role) => ({ role, permissions: overrideByRole.get(role) ?? DEFAULT_PERMISSIONS[role] })
  );

  return { builtInRoles, customRoles };
}

// Admin can never lock itself out: without MANAGE_USERS + VIEW_SETTINGS,
// nobody could ever reach this screen again to fix a mistaken save.
function assertAdminCanRecover(role: Role, permissions: Permission[]) {
  if (role !== "ADMIN") return;
  if (!permissions.includes("MANAGE_USERS") || !permissions.includes("VIEW_SETTINGS")) {
    throw new Error("Admin must always keep \"Manage Users\" and \"Access the Settings Page\" — removing them would lock everyone out of managing roles.");
  }
}

export async function setRolePermissions(role: Role, permissions: Permission[]) {
  const session = await requireRole("ADMIN");
  assertAdminCanRecover(role, permissions);

  await db.rolePermissions.upsert({
    where: { clinicId_role: { clinicId: session.clinicId, role } },
    create: { clinicId: session.clinicId, role, permissions, updatedById: session.userId },
    update: { permissions, updatedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "RolePermissions",
    resourceId: role,
    metadata: { role, permissions },
  });
}

export async function createCustomRole(name: string, basedOn: Role) {
  const session = await requireRole("ADMIN");

  const override = await db.rolePermissions.findUnique({ where: { clinicId_role: { clinicId: session.clinicId, role: basedOn } } });
  const basePermissions = override?.permissions ?? DEFAULT_PERMISSIONS[basedOn];

  const customRole = await db.customRole.create({
    data: { clinicId: session.clinicId, name, basedOn, permissions: basePermissions, createdById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    action: "CREATE",
    resource: "CustomRole",
    resourceId: customRole.id,
    metadata: { name, basedOn },
  });

  return customRole;
}

export async function setCustomRolePermissions(customRoleId: string, permissions: Permission[]) {
  const session = await requireRole("ADMIN");

  const target = await db.customRole.findUnique({ where: { id: customRoleId } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");

  await db.customRole.update({ where: { id: customRoleId }, data: { permissions } });

  await writeAuditLog({
    userId: session.userId,
    action: "UPDATE",
    resource: "CustomRole",
    resourceId: customRoleId,
    metadata: { name: target.name, permissions },
  });
}

export async function deleteCustomRole(customRoleId: string) {
  const session = await requireRole("ADMIN");

  const target = await db.customRole.findUnique({ where: { id: customRoleId }, include: { _count: { select: { users: true } } } });
  if (!target || target.clinicId !== session.clinicId) throw new Error("Not found");
  if (target._count.users > 0) throw new Error("Reassign every user off this role before deleting it.");

  await db.customRole.delete({ where: { id: customRoleId } });

  await writeAuditLog({
    userId: session.userId,
    action: "DELETE",
    resource: "CustomRole",
    resourceId: customRoleId,
    metadata: { name: target.name },
  });
}
