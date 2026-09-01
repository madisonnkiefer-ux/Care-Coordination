import "server-only";
import { db } from "@/lib/db";
import type { PrismaClient } from "@/app/generated/prisma/client";
import { requirePermission } from "@/lib/dal";
import { computeSecurityAlerts } from "@/lib/security-alerts-detection";

export type { BulkAccessAlert, OutOfCaseloadAlert, FailedLoginAlert } from "@/lib/security-alerts-detection";

export async function getSecurityAlerts() {
  const session = await requirePermission("VIEW_SECURITY_ALERTS");
  // lib/db.ts's db is base PrismaClient + $extends() soft-delete query
  // hooks on Member/IntakeVersion/CarePlan/TocRecord only — User and
  // AuditLog (the only delegates computeSecurityAlerts touches) are
  // untouched, so this cast is safe; it exists purely because Prisma's
  // $extends() result isn't structurally assignable to PrismaClient even
  // when the delegates in question are identical.
  return computeSecurityAlerts(session.clinicId, db as unknown as PrismaClient);
}
