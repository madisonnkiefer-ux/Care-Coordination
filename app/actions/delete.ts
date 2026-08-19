"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

// Everything here is a soft delete: sets deletedAt/deletedById instead of
// removing rows. Medicaid/HIPAA record-retention requirements outlive a
// patient's relationship with the clinic, so nothing under a member is ever
// hard-deleted — see lib/db.ts for how deleted rows are hidden from every
// normal read without callers needing to filter for it themselves.

async function requireOwnClinicMember(memberId: string, clinicId: string) {
  const member = await db.member.findUnique({ where: { id: memberId } });
  if (!member || member.clinicId !== clinicId) throw new Error("Not found");
  return member;
}

export async function deleteMember(memberId: string) {
  const session = await requirePermission("DELETE_RECORDS");
  const member = await requireOwnClinicMember(memberId, session.clinicId);

  await db.member.update({
    where: { id: memberId },
    data: { deletedAt: new Date(), deletedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "DELETE",
    resource: "Member",
    resourceId: memberId,
    metadata: { firstName: member.firstName, lastName: member.lastName, medicaidId: member.medicaidId },
  });

  revalidatePath("/members");
  redirect("/members");
}

export async function restoreMember(memberId: string) {
  const session = await requirePermission("DELETE_RECORDS");

  const result = await db.member.updateMany({
    where: { id: memberId, clinicId: session.clinicId, deletedAt: { not: null } },
    data: { deletedAt: null, deletedById: null },
  });
  if (result.count === 0) throw new Error("Not found");

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Member",
    resourceId: memberId,
    metadata: { restored: true },
  });

  revalidatePath("/members");
  revalidatePath("/settings");
}

export async function deleteIntakeVersion(memberId: string, versionId: string) {
  const session = await requirePermission("DELETE_RECORDS");
  await requireOwnClinicMember(memberId, session.clinicId);

  const version = await db.intakeVersion.findUnique({ where: { id: versionId } });
  if (!version || version.memberId !== memberId) throw new Error("Not found");

  await db.intakeVersion.update({
    where: { id: versionId },
    data: { deletedAt: new Date(), deletedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "DELETE",
    resource: "IntakeVersion",
    resourceId: versionId,
    metadata: { wasSigned: Boolean(version.signedAt) },
  });

  revalidatePath(`/members/${memberId}/intake`);
}

export async function deleteCarePlan(memberId: string, carePlanId: string) {
  const session = await requirePermission("DELETE_RECORDS");
  await requireOwnClinicMember(memberId, session.clinicId);

  const carePlan = await db.carePlan.findUnique({ where: { id: carePlanId } });
  if (!carePlan || carePlan.memberId !== memberId) throw new Error("Not found");

  await db.carePlan.update({
    where: { id: carePlanId },
    data: { deletedAt: new Date(), deletedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "DELETE",
    resource: "CarePlan",
    resourceId: carePlanId,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}

export async function deleteTocRecord(memberId: string, tocRecordId: string) {
  const session = await requirePermission("DELETE_RECORDS");
  await requireOwnClinicMember(memberId, session.clinicId);

  const tocRecord = await db.tocRecord.findUnique({ where: { id: tocRecordId } });
  if (!tocRecord || tocRecord.memberId !== memberId) throw new Error("Not found");

  await db.tocRecord.update({
    where: { id: tocRecordId },
    data: { deletedAt: new Date(), deletedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "DELETE",
    resource: "TocRecord",
    resourceId: tocRecordId,
    metadata: { wasSigned: Boolean(tocRecord.signedAt) },
  });

  revalidatePath(`/members/${memberId}/toc`);
}
