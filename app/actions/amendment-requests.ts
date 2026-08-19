"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess, requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

// Logging a request to amend a record — HIPAA right to amend, 45 CFR
// §164.526. Any staff member with chart access can take the request; a
// supervisor/admin makes the actual accept/deny determination below.
export async function createAmendmentRequest(memberId: string, formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  if (!description) return;

  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const request = await db.amendmentRequest.create({
    data: { memberId, description, requestedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "AmendmentRequest",
    resourceId: request.id,
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/settings");
}

export type ResolveAmendmentState = { error?: string } | undefined;

export async function resolveAmendmentRequest(
  requestId: string,
  _state: ResolveAmendmentState,
  formData: FormData,
): Promise<ResolveAmendmentState> {
  const session = await requirePermission("RESOLVE_AMENDMENT_REQUESTS");

  const status = formData.get("status");
  if (status !== "ACCEPTED" && status !== "DENIED") {
    return { error: "Choose Accept or Deny." };
  }
  const resolution = String(formData.get("resolution") ?? "").trim();
  if (!resolution) {
    return { error: "A resolution note is required." };
  }

  const target = await db.amendmentRequest.findUnique({
    where: { id: requestId },
    include: { member: { select: { clinicId: true } } },
  });
  if (!target || target.member.clinicId !== session.clinicId) throw new Error("Not found");
  if (target.status !== "OPEN") return { error: "This request has already been resolved." };

  await db.amendmentRequest.update({
    where: { id: requestId },
    data: { status, resolution, resolvedAt: new Date(), resolvedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId: target.memberId,
    action: "UPDATE",
    resource: "AmendmentRequest",
    resourceId: requestId,
    metadata: { status },
  });

  revalidatePath(`/members/${target.memberId}`);
  revalidatePath("/settings");
  return undefined;
}
