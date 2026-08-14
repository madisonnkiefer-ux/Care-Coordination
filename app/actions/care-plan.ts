"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { zipRows } from "@/lib/form-rows";
import { saveCustomAnswers } from "@/lib/custom-questions-save";
import type { GoalStatus } from "@/app/generated/prisma/client";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function bool(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function date(formData: FormData, key: string) {
  const v = str(formData, key);
  return v ? new Date(v) : null;
}

const TEAM_MEMBER_FIELDS = ["name", "phone", "email", "relation", "specialty"] as const;
const MEDICATION_FIELDS = ["name", "dosage", "frequency", "startDate", "endDate"] as const;
const BACKUP_CONTACT_FIELDS = ["name", "phone", "address", "relationship"] as const;
const DISASTER_CONTACT_FIELDS = ["name", "phone", "helpWith"] as const;

export async function createNewCarePlan(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const carePlan = await db.carePlan.create({
    data: { memberId, createdById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "CarePlan",
    resourceId: carePlan.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  return carePlan.id;
}

export async function saveCarePlan(memberId: string, carePlanId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const teamMembers = zipRows(formData, TEAM_MEMBER_FIELDS);
  const medications = zipRows(formData, MEDICATION_FIELDS);
  const backupContacts = zipRows(formData, BACKUP_CONTACT_FIELDS);
  const disasterContacts = zipRows(formData, DISASTER_CONTACT_FIELDS);

  await db.$transaction(async (tx) => {
    await tx.carePlan.update({
      where: { id: carePlanId },
      data: {
        ccpStartDate: date(formData, "ccpStartDate"),
        mostRecentCnaCompletionDate: date(formData, "mostRecentCnaCompletionDate"),
        preferredContactMethod: str(formData, "preferredContactMethod"),

        servicesAuthorizedByMco: str(formData, "servicesAuthorizedByMco"),
        phBhConditions: str(formData, "phBhConditions"),

        backupPlanText: str(formData, "backupPlanText"),

        disasterPlanText: str(formData, "disasterPlanText"),
        disasterReviewItems: formData.getAll("disasterReviewItems").filter((v): v is string => typeof v === "string"),
        disasterReviewItemsOther: str(formData, "disasterReviewItemsOther"),
        disasterDmeNeedsProvider: str(formData, "disasterDmeNeedsProvider"),
        disasterTransportationCo: str(formData, "disasterTransportationCo"),
        disasterMedicationPickup: str(formData, "disasterMedicationPickup"),
        disasterHomeHealthAgency: str(formData, "disasterHomeHealthAgency"),
        disasterServiceAnimalsCare: str(formData, "disasterServiceAnimalsCare"),
        hasEmergencyContactsList: bool(formData, "hasEmergencyContactsList"),
        discussedSafetyWithCoordinator: bool(formData, "discussedSafetyWithCoordinator"),

        otherServicesText: str(formData, "otherServicesText"),
        otherServicesNa: bool(formData, "otherServicesNa"),
        dualEligibleInfoNeeded: str(formData, "dualEligibleInfoNeeded"),
        dualEligibleNoNeedsIdentified: bool(formData, "dualEligibleNoNeedsIdentified"),
        dualEligibleNa: bool(formData, "dualEligibleNa"),

        ccl1ContactGuidelines: bool(formData, "ccl1ContactGuidelines"),
        ccl2ContactGuidelines: bool(formData, "ccl2ContactGuidelines"),
        otherContactSchedule: str(formData, "otherContactSchedule"),

        agencyBasedCb: bool(formData, "agencyBasedCb"),
        selfDirectedCb: bool(formData, "selfDirectedCb"),
        nursingFacility: bool(formData, "nursingFacility"),
        cbSettingsChoice: str(formData, "cbSettingsChoice"),

        hasCommunityBenefits: bool(formData, "hasCommunityBenefits"),
        mcoIntegrationPlan: str(formData, "mcoIntegrationPlan"),
        hasFacilityCarePlan: bool(formData, "hasFacilityCarePlan"),
      },
    });

    await tx.carePlanTeamMember.deleteMany({ where: { carePlanId } });
    if (teamMembers.length) {
      await tx.carePlanTeamMember.createMany({
        data: teamMembers.map((r) => ({ carePlanId, ...r })),
      });
    }

    await tx.carePlanMedication.deleteMany({ where: { carePlanId } });
    if (medications.length) {
      await tx.carePlanMedication.createMany({
        data: medications.map((r) => ({
          carePlanId,
          name: r.name,
          dosage: r.dosage,
          frequency: r.frequency,
          startDate: r.startDate ? new Date(r.startDate) : null,
          endDate: r.endDate ? new Date(r.endDate) : null,
        })),
      });
    }

    await tx.carePlanBackupContact.deleteMany({ where: { carePlanId } });
    if (backupContacts.length) {
      await tx.carePlanBackupContact.createMany({
        data: backupContacts.map((r) => ({ carePlanId, ...r })),
      });
    }

    await tx.carePlanDisasterContact.deleteMany({ where: { carePlanId } });
    if (disasterContacts.length) {
      await tx.carePlanDisasterContact.createMany({
        data: disasterContacts.map((r) => ({ carePlanId, ...r })),
      });
    }
  });

  await saveCustomAnswers(member.clinicId, "ccp", carePlanId, formData);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "CarePlan",
    resourceId: carePlanId,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}

export async function addGoal(memberId: string, carePlanId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const goal = await db.carePlanGoal.create({
    data: { carePlanId, title: "Untitled goal" },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "CarePlanGoal",
    resourceId: goal.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}

export async function saveGoal(memberId: string, carePlanId: string, goalId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const opportunity = str(formData, "opportunity");
  const goalText = str(formData, "goalText");
  const memberActionTargetEndDate = date(formData, "memberActionTargetEndDate");

  await db.carePlanGoal.update({
    where: { id: goalId },
    data: {
      title: opportunity ?? goalText ?? "Untitled goal",
      targetDate: memberActionTargetEndDate,

      opportunity,
      priority: str(formData, "priority"),
      hasAllocationTool: bool(formData, "hasAllocationTool"),

      strengths: str(formData, "strengths"),
      barriers: str(formData, "barriers"),

      memberDeferredDiscussion: bool(formData, "memberDeferredDiscussion"),
      deferredReason: str(formData, "deferredReason"),
      memberDeclinedDiscussion: bool(formData, "memberDeclinedDiscussion"),
      declinedReason: str(formData, "declinedReason"),

      goalText,

      memberActionText: str(formData, "memberActionText"),
      memberActionBeginDate: date(formData, "memberActionBeginDate"),
      memberActionTargetEndDate,
      memberActionAccomplishedDate: date(formData, "memberActionAccomplishedDate"),

      coordinatorActionText: str(formData, "coordinatorActionText"),
      coordinatorActionBeginDate: date(formData, "coordinatorActionBeginDate"),
      coordinatorActionTargetEndDate: date(formData, "coordinatorActionTargetEndDate"),
      coordinatorActionAccomplishedDate: date(formData, "coordinatorActionAccomplishedDate"),
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "CarePlanGoal",
    resourceId: goalId,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath(`/members/${memberId}`);
}

export async function updateGoalStatus(memberId: string, goalId: string, status: GoalStatus) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  await db.carePlanGoal.update({ where: { id: goalId }, data: { status } });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "CarePlanGoal",
    resourceId: goalId,
    metadata: { status },
  });

  revalidatePath(`/members/${memberId}/care-plan`);
  revalidatePath(`/members/${memberId}`);
}

export async function addProgressNote(memberId: string, carePlanId: string, goalId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const note = str(formData, "note");
  if (!note) return;

  const track = formData.get("track") === "COORDINATOR" ? "COORDINATOR" : "MEMBER";

  const progressNote = await db.carePlanProgressNote.create({
    data: {
      goalId,
      track,
      note,
      date: date(formData, "date") ?? new Date(),
    },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "CarePlanProgressNote",
    resourceId: progressNote.id,
  });

  revalidatePath(`/members/${memberId}/care-plan`);
}
