"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { isTerminalStatus } from "@/lib/member-status";
import type { CclLevel, MemberStatus } from "@/app/generated/prisma/client";
import { PATIENT_TYPE_OPTIONS } from "@/lib/patient-type";

const PATIENT_TYPES = PATIENT_TYPE_OPTIONS.map((o) => o.value);

export type CreateMemberState = { error?: string } | undefined;

export async function createMember(_state: CreateMemberState, formData: FormData): Promise<CreateMemberState> {
  const session = await verifySession();

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  const firstName = str("firstName");
  const lastName = str("lastName");
  const dateOfBirthRaw = str("dateOfBirth");
  if (!firstName || !lastName || !dateOfBirthRaw) {
    return { error: "First name, last name, and date of birth are required." };
  }

  const requestedStatus = (str("status") as MemberStatus | null) ?? "PENDING_ENROLLMENT";
  const cclLevel = str("cclLevel") as CclLevel | null;
  // A care coordinator creating a patient can't assign themselves (or anyone
  // else) — new patients stay unassigned until a supervisor/admin assigns
  // one via Caseload Management. The form already hides this field for
  // coordinators; this is the server-side backstop.
  const assignedCoordinatorId = session.role === "CARE_COORDINATOR" ? null : str("assignedCoordinatorId");
  const eddRaw = str("edd");
  const programRaw = str("program");
  const program = programRaw && PATIENT_TYPES.includes(programRaw) ? programRaw : null;

  // A member assigned a coordinator right at creation starts their billing
  // clock immediately, same as assigning one later via Caseload Management —
  // see reassignMember in app/actions/member-assignment.ts. Never overrides
  // a deliberately-chosen terminal status.
  const autoActivate = Boolean(assignedCoordinatorId) && requestedStatus !== "ACTIVE" && !isTerminalStatus(requestedStatus);
  const status = autoActivate ? "ACTIVE" : requestedStatus;

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

  if (autoActivate) {
    const change = await db.memberStatusChange.create({
      data: {
        memberId: member.id,
        fromStatus: requestedStatus,
        toStatus: "ACTIVE",
        effectiveDate: new Date(),
        reason: "Automatically marked Active upon care coordinator assignment",
        changedById: session.userId,
        requiresApproval: false,
        approvedById: session.userId,
        approvedAt: new Date(),
      },
    });

    await writeAuditLog({
      userId: session.userId,
      memberId: member.id,
      action: "UPDATE",
      resource: "MemberStatusChange",
      resourceId: change.id,
      metadata: { fromStatus: requestedStatus, toStatus: "ACTIVE", automatic: true },
    });

    const supervisorsAndAdmins = await db.user.findMany({
      where: { clinicId: session.clinicId, role: { in: ["SUPERVISOR", "ADMIN"] }, active: true },
      select: { id: true },
    });
    for (const s of supervisorsAndAdmins) {
      await createNotification({
        clinicId: session.clinicId,
        userId: s.id,
        actorId: session.userId,
        priority: "STANDARD",
        title: `${member.firstName} ${member.lastName} automatically marked Active (assigned to a coordinator)`,
        memberId: member.id,
      });
    }
  }

  revalidatePath("/members");
  redirect(`/members/${member.id}`);
}
