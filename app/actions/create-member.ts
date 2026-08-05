"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import type { CclLevel, MemberStatus } from "@/app/generated/prisma/client";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";

const PATIENT_TYPES = PATIENT_TYPE_OPTIONS.map((o) => o.value);

export async function createMember(formData: FormData) {
  const session = await verifySession();

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const firstName = str("firstName");
  const lastName = str("lastName");
  const dateOfBirthRaw = str("dateOfBirth");
  if (!firstName || !lastName || !dateOfBirthRaw) {
    throw new Error("First name, last name, and date of birth are required.");
  }

  const status = (str("status") as MemberStatus | null) ?? "PENDING_ENROLLMENT";
  const cclLevel = str("cclLevel") as CclLevel | null;
  const assignedCoordinatorId = str("assignedCoordinatorId");
  const eddRaw = str("edd");
  const programRaw = str("program");
  const program = programRaw && PATIENT_TYPES.includes(programRaw) ? programRaw : null;

  const member = await db.member.create({
    data: {
      clinicId: session.clinicId,
      firstName,
      lastName,
      dateOfBirth: new Date(dateOfBirthRaw),
      phone: str("phone"),
      medicaidId: str("medicaidId"),
      memberIdExternal: str("memberIdExternal"),
      subscriberId: str("subscriberId"),
      program,
      status,
      cclLevel,
      edd: eddRaw ? new Date(eddRaw) : null,
      assignedCoordinatorId,
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId: member.id,
    action: "CREATE",
    resource: "Member",
    resourceId: member.id,
  });

  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}
