import type { PrismaClient } from "../app/generated/prisma/client";

// Sourced from the team's internal resource/referral reference doc. Skips
// the documentation-standards/assessment-framework/communication-template
// sections of that doc — those are internal policy, not referral resources.
const RESOURCES: {
  name: string;
  category: string;
  description?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  eligibility?: string;
  notes?: string;
}[] = [
  {
    name: "Delfina",
    category: "Pregnancy/Maternity Program",
    description:
      "Pregnancy tracking app connecting patient data to Rio Pecos OB providers; includes parenting classes, nutrition support, and Medicaid-covered incentives.",
  },
  {
    name: "FINITY",
    category: "Pregnancy/Maternity Program",
    description:
      "BlueCross BlueShield value-added service providing baby supplies (bassinet, car seat points) for pregnant/6-month postpartum members.",
  },
  {
    name: "TOBOSA",
    category: "Home Visiting Program",
    description: "In-person home visiting program offering parenting support, trauma assistance, and supplies like diapers and breast pumps.",
  },
  {
    name: "Food is Medicine",
    category: "Food/Nutrition",
    description: "Meal/grocery provision for pregnant patients with type 1, 2, or gestational diabetes.",
    eligibility: "11 months pregnancy + 2 months postpartum",
  },
  {
    name: "Joyful Parenting Program",
    category: "Parenting Support",
    description: "Online parenting support for first-time parents with device provision and WIC assistance.",
  },
  {
    name: "Maternity Belt Referral",
    category: "Maternity/OB Service",
    description: "Refer members needing a maternity belt.",
    contactName: "Anna, Lupita, or Sam",
  },
  {
    name: "Doula/CHW Program",
    category: "Maternity/OB Service",
    description: "Doula and Community Health Worker program.",
    contactName: "Maeve Ebright",
  },
  {
    name: "Breast Pump/Lactation Support",
    category: "Maternity/OB Service",
    contactName: "Leyla Salvo",
    contactPhone: "(724) 833-4601",
    notes: "Breast pump QR code approval typically works in third trimester.",
  },
  {
    name: "Pediatric Referrals",
    category: "Referral Contact",
    description: "Pediatric referral routing (Rio Pecos).",
    contactName: "Rhianna Shaw",
  },
  {
    name: "PCP Referrals",
    category: "Referral Contact",
    description: "Primary care provider referral routing (Ocotillo).",
    contactName: "Tialana Watts",
  },
  {
    name: "Mental Health Crisis",
    category: "Crisis/Emergency",
    description: "Contact William first; if no answer, call again. Alternatively reach Madison.",
  },
  {
    name: "Opt-Out / Termination",
    category: "Administrative",
    description: "Email Madison (copy Savannah) with the discharge reason to process a member opt-out or termination.",
  },
  {
    name: "Housing Specialist",
    category: "Housing",
    contactName: "BCBSNM Housing Specialist",
    contactPhone: "877-232-5518 (option 3, option 2)",
    contactEmail: "amanda_witter@bcbsnm.com",
  },
  {
    name: "Provider Finder",
    category: "Internal Tool",
    description: "Lookup tool for Medicaid referral options.",
  },
  {
    name: "Medicaid Portal",
    category: "Internal Tool",
    description: "Login portal for Medicaid eligibility verification.",
  },
  {
    name: "AdvancedMD EHR",
    category: "Internal Tool",
    description: "EHR system access.",
  },
];

export async function seedResources(db: PrismaClient, clinicId: string, createdById: string) {
  const existingCount = await db.resourceEntry.count({ where: { clinicId } });
  if (existingCount > 0) return { seeded: 0, skipped: true };

  await db.resourceEntry.createMany({
    data: RESOURCES.map((r) => ({ ...r, clinicId, createdById })),
  });

  return { seeded: RESOURCES.length, skipped: false };
}
