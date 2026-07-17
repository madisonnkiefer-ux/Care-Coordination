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

  const dateOfBirth = date("dateOfBirth");

  await db.$transaction([
    db.member.update({
      where: { id: memberId },
      data: {
        firstName: str("firstName") ?? member.firstName,
        middleName: str("middleName"),
        lastName: str("lastName") ?? member.lastName,
        ...(dateOfBirth ? { dateOfBirth } : {}),
        phone: str("phoneCell") ?? str("phoneHome"),
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
      },
      update: {
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

  redirect(`/members/${memberId}/intake`);
}
