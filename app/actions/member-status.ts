"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess, requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { CLOSURE_CHECKLIST_FIELDS } from "@/lib/member-status";
import type { MemberStatus } from "@/app/generated/prisma/client";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function changeMemberStatus(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const toStatus = formData.get("toStatus") as MemberStatus;
  const effectiveDateRaw = str(formData, "effectiveDate");
  const reason = str(formData, "reason");
  const note = str(formData, "note");
  if (!toStatus || !effectiveDateRaw || !reason) throw new Error("Effective date and reason are required");

  const closureFields: Record<string, boolean | null> = {};
  if (toStatus === "CLOSED") {
    for (const field of CLOSURE_CHECKLIST_FIELDS) {
      const checked = formData.get(field.key) === "on";
      if (!checked) throw new Error(`Closure checklist incomplete: ${field.label}`);
      closureFields[field.key] = true;
    }
  }

  // Activity status is supervisor/admin-editable only — a care coordinator's
  // submission is always a request awaiting approval, whatever the target
  // status is. Supervisors and admins can still set status directly.
  const requiresApproval = session.role === "CARE_COORDINATOR";

  const change = await db.memberStatusChange.create({
    data: {
      memberId,
      fromStatus: member.status,
      toStatus,
      effectiveDate: new Date(effectiveDateRaw),
      reason,
      note,
      changedById: session.userId,
      requiresApproval,
      approvedById: requiresApproval ? null : session.userId,
      approvedAt: requiresApproval ? null : new Date(),
      ...closureFields,
    },
  });

  if (!requiresApproval) {
    await db.member.update({ where: { id: memberId }, data: { status: toStatus } });
  }

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "MemberStatusChange",
    resourceId: change.id,
    metadata: { fromStatus: member.status, toStatus, requiresApproval },
  });

  if (requiresApproval) {
    const supervisors = await db.user.findMany({
      where: { clinicId: session.clinicId, role: { in: ["SUPERVISOR", "ADMIN"] }, active: true },
      select: { id: true },
    });
    for (const s of supervisors) {
      await createNotification({
        clinicId: session.clinicId,
        userId: s.id,
        actorId: session.userId,
        priority: "HIGH",
        title: `Status change to ${toStatus.replaceAll("_", " ")} pending approval for ${member.firstName} ${member.lastName}`,
        memberId,
      });
    }
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/supervisor");
}

export async function approveStatusChange(memberId: string, statusChangeId: string) {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  const change = await db.memberStatusChange.findUnique({ where: { id: statusChangeId } });
  if (!change || change.memberId !== memberId) throw new Error("Not found");
  if (!change.requiresApproval || change.approvedAt || change.rejectedAt) throw new Error("Not pending");

  await db.memberStatusChange.update({
    where: { id: statusChangeId },
    data: { approvedById: session.userId, approvedAt: new Date() },
  });

  const member = await db.member.update({
    where: { id: memberId },
    data: { status: change.toStatus },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "MemberStatusChange",
    resourceId: statusChangeId,
    metadata: { approved: true, toStatus: change.toStatus },
  });

  await createNotification({
    clinicId: session.clinicId,
    userId: change.changedById,
    actorId: session.userId,
    priority: "STANDARD",
    title: `Status change to ${change.toStatus.replaceAll("_", " ")} approved for ${member.firstName} ${member.lastName}`,
    memberId,
  });

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/members");
  revalidatePath("/supervisor");
}

export async function rejectStatusChange(memberId: string, statusChangeId: string, formData: FormData) {
  const session = await requireRole("SUPERVISOR", "ADMIN");

  const change = await db.memberStatusChange.findUnique({ where: { id: statusChangeId } });
  if (!change || change.memberId !== memberId) throw new Error("Not found");
  if (!change.requiresApproval || change.approvedAt || change.rejectedAt) throw new Error("Not pending");

  const rejectionReason = str(formData, "rejectionReason") ?? "No reason given";

  await db.memberStatusChange.update({
    where: { id: statusChangeId },
    data: { rejectedAt: new Date(), rejectionReason },
  });

  const member = await db.member.findUnique({ where: { id: memberId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "MemberStatusChange",
    resourceId: statusChangeId,
    metadata: { rejected: true, toStatus: change.toStatus, rejectionReason },
  });

  if (member) {
    await createNotification({
      clinicId: session.clinicId,
      userId: change.changedById,
      actorId: session.userId,
      priority: "HIGH",
      title: `Status change to ${change.toStatus.replaceAll("_", " ")} was not approved for ${member.firstName} ${member.lastName}`,
      body: rejectionReason,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}`);
  revalidatePath("/supervisor");
}
