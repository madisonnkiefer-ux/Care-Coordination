"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { YesNoNa } from "@/app/generated/prisma/client";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function date(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

function yesNoNa(formData: FormData, key: string): YesNoNa | null {
  const v = formData.get(key);
  if (v === "yes") return "YES";
  if (v === "no") return "NO";
  if (v === "na") return "NA";
  return null;
}

export async function saveHedisMeasures(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const data = {
    deliveryDate: date(formData, "deliveryDate"),
    prenatalFirstTrimester: yesNoNa(formData, "prenatalFirstTrimester"),
    prenatalFirstTrimesterDate: date(formData, "prenatalFirstTrimesterDate"),
    postPartum1stTouchpoint: yesNoNa(formData, "postPartum1stTouchpoint"),
    postPartum1stTouchpointDate: date(formData, "postPartum1stTouchpointDate"),
    postPartum2ndTouchpoint: yesNoNa(formData, "postPartum2ndTouchpoint"),
    postPartum2ndTouchpointDate: date(formData, "postPartum2ndTouchpointDate"),
    notes: str(formData, "notes"),
  };

  const record = await db.hedisMeasures.upsert({
    where: { memberId },
    update: data,
    create: { memberId, ...data },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "HedisMeasures",
    resourceId: record.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}
