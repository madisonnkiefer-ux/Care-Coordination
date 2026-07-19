"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { TOC_NEEDS_SECTIONS, needFieldName } from "@/components/toc/needs-config";
import type { AssessmentStatus, NoneOrYes } from "@/app/generated/prisma/client";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function date(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

function noneOrYes(formData: FormData, key: string): NoneOrYes | null {
  const v = formData.get(key);
  return v === "NONE" || v === "YES" ? v : null;
}

export async function createNewTocRecord(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const record = await db.tocRecord.create({ data: { memberId, assessorId: session.userId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "TocRecord",
    resourceId: record.id,
  });

  revalidatePath(`/members/${memberId}/toc`);
  redirect(`/members/${memberId}/toc`);
}

export async function signTocRecord(memberId: string, tocId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");
  if (session.role !== "ADMIN") throw new Error("Forbidden: only admins can sign");

  const existing = await db.tocRecord.findUnique({ where: { id: tocId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.signedAt) throw new Error("Already signed");
  if (existing.status !== "COMPLETED") throw new Error("Only completed records can be signed");

  await db.tocRecord.update({ where: { id: tocId }, data: { signedAt: new Date(), signedById: session.userId } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "TocRecord",
    resourceId: tocId,
    metadata: { signed: true },
  });

  revalidatePath(`/members/${memberId}/toc`);
  redirect(`/members/${memberId}/toc`);
}

export async function saveTocRecord(memberId: string, tocId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.tocRecord.findUnique({ where: { id: tocId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.signedAt) throw new Error("This record is signed and locked");

  const intent = String(formData.get("intent") ?? "draft");
  const status: AssessmentStatus = intent === "complete" ? "COMPLETED" : "DRAFT";

  const needRows = TOC_NEEDS_SECTIONS.flatMap((section) =>
    section.needs.map((need) => ({
      section: section.section,
      needKey: need.key,
      status: noneOrYes(formData, needFieldName(section.section, need.key, "status")),
      actions: str(formData, needFieldName(section.section, need.key, "actions")),
    }))
  ).filter((row) => row.status !== null || row.actions !== null);

  await db.$transaction(async (tx) => {
    await tx.tocRecord.update({
      where: { id: tocId },
      data: {
        status,
        mcoNotificationDate: date(formData, "mcoNotificationDate"),
        tocPlanStartDate: date(formData, "tocPlanStartDate"),
        tocPlanCompletionDate: date(formData, "tocPlanCompletionDate"),
        priorAddressStreet: str(formData, "priorAddressStreet"),
        priorAddressCity: str(formData, "priorAddressCity"),
        priorAddressStateZip: str(formData, "priorAddressStateZip"),
        ciscPcName: str(formData, "ciscPcName"),
        ciscPcPhone: str(formData, "ciscPcPhone"),
        transitionType: str(formData, "transitionType"),
        transitionTypeOther: str(formData, "transitionTypeOther"),
        dcTeamContactSummary: str(formData, "dcTeamContactSummary"),
        followUp1Date: date(formData, "followUp1Date"),
        followUp1Status: noneOrYes(formData, "followUp1Status"),
        followUp1Notes: str(formData, "followUp1Notes"),
        followUp2Date: date(formData, "followUp2Date"),
        followUp2Status: noneOrYes(formData, "followUp2Status"),
        followUp2Notes: str(formData, "followUp2Notes"),
        followUp3Date: date(formData, "followUp3Date"),
        followUp3Status: noneOrYes(formData, "followUp3Status"),
        followUp3Notes: str(formData, "followUp3Notes"),
      },
    });

    await tx.tocNeed.deleteMany({ where: { tocRecordId: tocId } });
    if (needRows.length) {
      await tx.tocNeed.createMany({ data: needRows.map((row) => ({ tocRecordId: tocId, ...row })) });
    }
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "TocRecord",
    resourceId: tocId,
    metadata: { status },
  });

  revalidatePath(`/members/${memberId}/toc`);
  redirect(`/members/${memberId}/toc`);
}
