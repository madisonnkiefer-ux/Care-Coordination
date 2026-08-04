"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function saveDemographics(memberId: string, demographicsId: string, formData: FormData) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) throw new Error("Forbidden");

  const existing = await db.demographics.findUnique({ where: { id: demographicsId }, include: { intakeVersion: true } });
  if (!existing || existing.memberId !== memberId) throw new Error("Not found");
  if (existing.intakeVersion?.signedAt) throw new Error("This record is signed and locked");

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
  redirect(`/members/${memberId}/intake?tab=demographics`);
}
