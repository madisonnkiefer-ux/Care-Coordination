import "server-only";
import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@/app/generated/prisma/client";

// Record-level audit trail: every PHI view/create/update/delete should call
// this so "who viewed or edited what, and when" is always answerable.
export async function writeAuditLog(params: {
  userId: string | null;
  memberId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.auditLog.create({
    data: {
      userId: params.userId,
      memberId: params.memberId ?? null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      metadata: (params.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}
