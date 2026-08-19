import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { AuditAction, Prisma } from "@/app/generated/prisma/client";

// Record-level audit trail: every PHI view/create/update/delete should call
// this so "who viewed or edited what, and when" is always answerable.
//
// Every call also records the request's source IP and user agent — without
// this, only login/logout events carried that context, leaving every other
// audit entry unable to answer "from where, on what device" during a breach
// investigation. headers() works here because every call site runs inside a
// Server Action or Server Component request, the same place it's always
// been available.
export async function writeAuditLog(params: {
  userId: string | null;
  memberId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const h = await headers();
  const ipAddress = h.get("x-forwarded-for") ?? undefined;
  const userAgent = h.get("user-agent") ?? undefined;

  await db.auditLog.create({
    data: {
      userId: params.userId,
      memberId: params.memberId ?? null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      metadata: {
        ...params.metadata,
        ipAddress,
        userAgent,
      } as Prisma.InputJsonValue,
    },
  });
}
