"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

export async function createNewDemographics(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const latest = await db.demographics.findFirst({ where: { memberId }, orderBy: { createdAt: "desc" } });

  const record = await db.demographics.create({
    data: latest
      ? {
          memberId,
          assessorId: session.userId,
          firstName: latest.firstName,
          middleName: latest.middleName,
          lastName: latest.lastName,
          dateOfBirth: latest.dateOfBirth,
          medicaidId: latest.medicaidId,
          address: latest.address,
          email: latest.email,
          language: latest.language,
          race: latest.race,
          ethnicity: latest.ethnicity,
          tribalAffiliation: latest.tribalAffiliation,
          sexAssignedAtBirth: latest.sexAssignedAtBirth,
          currentGender: latest.currentGender,
          currentGenderOther: latest.currentGenderOther,
          sexualIdentity: latest.sexualIdentity,
          sexualIdentityOther: latest.sexualIdentityOther,
          phoneCell: latest.phoneCell,
          phoneHome: latest.phoneHome,
          preferredContactVoice: latest.preferredContactVoice,
          preferredContactText: latest.preferredContactText,
          emergencyContactName: latest.emergencyContactName,
          emergencyContactPhone: latest.emergencyContactPhone,
          emergencyContactRel: latest.emergencyContactRel,
          primaryPayer: latest.primaryPayer,
          housingStatus: latest.housingStatus,
        }
      : {
          memberId,
          assessorId: session.userId,
          firstName: member.firstName,
          middleName: member.middleName,
          lastName: member.lastName,
          dateOfBirth: member.dateOfBirth,
          medicaidId: member.medicaidId,
          address: member.address,
          email: member.email,
          language: member.language,
        },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "CREATE",
    resource: "Demographics",
    resourceId: record.id,
  });

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake`);
}

export async function saveDemographics(memberId: string, demographicsId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.demographics.findUnique({ where: { id: demographicsId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.signedAt) throw new Error("This record is signed and locked");

  const str = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };

  // A select field's "<name>Custom" companion input overrides the dropdown when filled in.
  const selectOrCustom = (key: string) => str(`${key}Custom`) ?? str(key);

  const yesNo = (key: string) => {
    const value = formData.get(key);
    if (value === "yes") return true;
    if (value === "no") return false;
    return null;
  };

  const checkbox = (key: string) => formData.get(key) === "on";

  const date = (key: string) => {
    const value = str(key);
    return value ? new Date(value) : null;
  };

  const intent = String(formData.get("intent") ?? "draft");
  const status = intent === "complete" ? "COMPLETED" : "DRAFT";

  const data = {
    status: status as "DRAFT" | "COMPLETED",
    firstName: str("firstName"),
    middleName: str("middleName"),
    lastName: str("lastName"),
    dateOfBirth: date("dateOfBirth"),
    medicaidId: str("medicaidId"),
    address: str("address"),
    email: str("email"),
    language: str("language") ?? "English",
    race: selectOrCustom("race"),
    ethnicity: selectOrCustom("ethnicity"),
    tribalAffiliation: str("tribalAffiliation"),
    sexAssignedAtBirth: selectOrCustom("sexAssignedAtBirth"),
    currentGender: selectOrCustom("currentGender"),
    currentGenderOther: str("currentGenderOther"),
    sexualIdentity: selectOrCustom("sexualIdentity"),
    sexualIdentityOther: str("sexualIdentityOther"),
    permissionForOtherToComplete: yesNo("permissionForOtherToComplete"),
    formCompletedByName: str("formCompletedByName"),
    formCompletedByRelationship: str("formCompletedByRelationship"),
    phoneCell: str("phoneCell"),
    phoneHome: str("phoneHome"),
    preferredContactVoice: checkbox("preferredContactVoice"),
    preferredContactText: checkbox("preferredContactText"),
    emergencyContactName: str("emergencyContactName"),
    emergencyContactPhone: str("emergencyContactPhone"),
    emergencyContactRel: str("emergencyContactRel"),
    mcoEnrollmentDate: date("mcoEnrollmentDate"),
    eligibilityCategory: str("eligibilityCategory"),
    medicaidEligibilityBeginDate: date("medicaidEligibilityBeginDate"),
    medicaidEligibilityRenewalDate: date("medicaidEligibilityRenewalDate"),
    justiceInvolved: yesNo("justiceInvolved"),
    justiceInvolvedDetails: str("justiceInvolvedDetails"),
    caraIndividual: yesNo("caraIndividual"),
    cyfdInvolved: yesNo("cyfdInvolved"),
    cyfdInvolvedDetails: str("cyfdInvolvedDetails"),
    hasOtherInsurance: yesNo("hasOtherInsurance"),
    otherInsuranceDetails: str("otherInsuranceDetails"),
    onWaiver: yesNo("onWaiver"),
    waiverType: str("waiverType"),
    cnaCompletedByNameRelation: str("cnaCompletedByNameRelation"),
    representativeName: str("representativeName"),
    representativePhone: str("representativePhone"),
    representativeEmail: str("representativeEmail"),
    decisionMaker: str("decisionMaker"),
    representativeDocumentationSubmitted: yesNo("representativeDocumentationSubmitted"),
    representativeDocumentationType: str("representativeDocumentationType"),
    permissionToContactRepWithoutMember: yesNo("permissionToContactRepWithoutMember"),
    primaryPayer: str("primaryPayer"),
    housingStatus: str("housingStatus"),
  };

  await db.$transaction([
    db.member.update({
      where: { id: memberId },
      data: {
        firstName: data.firstName ?? member.firstName,
        middleName: data.middleName,
        lastName: data.lastName ?? member.lastName,
        ...(data.dateOfBirth ? { dateOfBirth: data.dateOfBirth } : {}),
        phone: data.phoneCell ?? data.phoneHome,
        email: data.email,
        address: data.address,
        language: data.language,
        medicaidId: data.medicaidId,
      },
    }),
    db.demographics.update({ where: { id: demographicsId }, data }),
  ]);

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Demographics",
    resourceId: demographicsId,
  });

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake`);
}

export async function signDemographics(memberId: string, demographicsId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");
  if (session.role !== "ADMIN") throw new Error("Forbidden: only admins can sign");

  const existing = await db.demographics.findUnique({ where: { id: demographicsId } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.signedAt) throw new Error("Already signed");
  if (existing.status !== "COMPLETED") throw new Error("Only completed records can be signed");

  await db.demographics.update({
    where: { id: demographicsId },
    data: { signedAt: new Date(), signedById: session.userId },
  });

  await writeAuditLog({
    userId: session.userId,
    memberId,
    action: "UPDATE",
    resource: "Demographics",
    resourceId: demographicsId,
    metadata: { signed: true },
  });

  if (member.assignedCoordinatorId) {
    await createNotification({
      clinicId: session.clinicId,
      userId: member.assignedCoordinatorId,
      actorId: session.userId,
      priority: "HIGH",
      title: `Demographics/enrollment signed off for ${member.firstName} ${member.lastName}`,
      memberId,
    });
  }

  revalidatePath(`/members/${memberId}/intake`);
  redirect(`/members/${memberId}/intake`);
}
