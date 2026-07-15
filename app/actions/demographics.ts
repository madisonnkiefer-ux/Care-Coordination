"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function saveDemographics(memberId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  await db.$transaction([
    db.member.update({
      where: { id: memberId },
      data: {
        phone: str("phone"),
        email: str("email"),
        address: str("address"),
        language: str("language") ?? "English",
        medicaidId: str("medicaidId"),
      },
    }),
    db.demographics.upsert({
      where: { memberId },
      create: {
        memberId,
        emergencyContactName: str("emergencyContactName"),
        emergencyContactPhone: str("emergencyContactPhone"),
        emergencyContactRel: str("emergencyContactRel"),
        race: str("race"),
        ethnicity: str("ethnicity"),
        primaryPayer: str("primaryPayer"),
        housingStatus: str("housingStatus"),
      },
      update: {
        emergencyContactName: str("emergencyContactName"),
        emergencyContactPhone: str("emergencyContactPhone"),
        emergencyContactRel: str("emergencyContactRel"),
        race: str("race"),
        ethnicity: str("ethnicity"),
        primaryPayer: str("primaryPayer"),
        housingStatus: str("housingStatus"),
      },
    }),
  ]);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Demographics",
    resourceId: memberId,
  });

  redirect(`/members/${memberId}`);
}
