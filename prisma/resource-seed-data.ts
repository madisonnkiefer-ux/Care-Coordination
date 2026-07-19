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
  // Pregnancy/Maternity Program
  {
    name: "Delfina",
    category: "Pregnancy/Maternity Program",
    description:
      "Pregnancy tracking app connecting patient data to Rio Pecos OB providers; includes education, DME ordering, parenting classes, grief counseling, and rewards.",
    notes: "Enroll by sending the member's QR code via text or email. Do not send referral emails or copy leadership on this one.",
  },
  {
    name: "FINITY",
    category: "Pregnancy/Maternity Program",
    description: "BlueCross BlueShield value-added service providing baby supplies (bassinet, car seat, household essentials) for pregnant/6-month postpartum members.",
    contactPhone: "877-806-8964",
    notes: "Member calls directly. Have them provide name, date of birth, address, and Medicaid ID.",
  },

  // Home Visiting Program
  {
    name: "TOBOSA",
    category: "Home Visiting Program",
    description:
      "In-person home visiting program for pregnant individuals and children up to age 5; parenting support, trauma assistance, and supplies (diapers, bassinet, breast pump, ice pads, belly bands).",
    contactEmail: "Mihernandez@lospasitos.org",
    notes: "Email referral; copy William, Madison, Savannah, and Kaylee.",
  },

  // Food/Nutrition
  {
    name: "Food is Medicine Program",
    category: "Food/Nutrition",
    description: "Meal/grocery provision for pregnant patients with type 1, 2, or gestational diabetes. Member chooses meal boxes or grocery bags; allergy/preference accommodations available.",
    eligibility: "11 months pregnancy + 2 months postpartum",
    contactEmail: "support@virtualhp.com",
    notes: "Email referral form; copy William, Madison, Savannah, Kaylee. Include diagnosis, gestational age, and allergies/preferences.",
  },

  // Parenting Support
  {
    name: "Joyful Parenting Program",
    category: "Parenting Support",
    description:
      "Remote parenting support (Zoom/WhatsApp/FaceTime) for first-time parents or those 10+ years since their last child; includes device provision, breast pump, WIC/food support, and language interpretation.",
    contactEmail: "veronica.winsch@commonspirit.org",
    notes: "Email referral, or use the form at stjosephnm.org. Copy William, Madison, Savannah, Kaylee.",
  },

  // Maternity/OB Service
  {
    name: "Maternity Belt Referral",
    category: "Maternity/OB Service",
    description: "Refer members needing a maternity belt.",
    contactName: "Anna Galvan, Lupita Cano, or Sam Carey",
    contactEmail: "agalvan@riopecosmed.com, lcano@riopecosmed.com, scarey@riopecosmed.com",
    notes: "Include member name, chart number, weeks gestation, and provider.",
  },
  {
    name: "Doula/CHW Program",
    category: "Maternity/OB Service",
    description: "Doula and Community Health Worker support for pregnant/postpartum patients, or anyone needing help with social determinants of health.",
    contactName: "Maeve Ebright",
    contactEmail: "mebright@riopecosmed.com",
    notes: "Referral via QR code. Copy William, Madison, Savannah, Kaylee.",
  },
  {
    name: "Breast Pump/Lactation Support",
    category: "Maternity/OB Service",
    contactName: "Leyla Salvo",
    contactPhone: "(724) 833-4601",
    contactEmail: "leyla.salvo@lovelace.com",
    notes: "Include member name, phone, and gestation/postpartum status. Breast pump QR code approval typically works in the third trimester.",
  },

  // Behavioral Health
  {
    name: "Bereavement Support",
    category: "Behavioral Health",
    description: "Grief support following a miscarriage.",
    notes: "Notify William, Madison, and Savannah for timely support coordination.",
  },

  // Crisis/Emergency
  {
    name: "Mental Health Crisis",
    category: "Crisis/Emergency",
    description: "Contact William first; if no answer, call again. Alternatively reach Madison.",
  },

  // Administrative
  {
    name: "Opt-Out / Termination",
    category: "Administrative",
    description: "Email Madison (copy Savannah) with the discharge reason to process a member opt-out or termination.",
  },

  // Housing
  {
    name: "BCBS Housing Specialist",
    category: "Housing",
    contactName: "BCBSNM Care Coordination Customer Service — ask for the Housing Specialist",
    contactPhone: "877-232-5518 (option 3, then option 2)",
    contactEmail: "amanda_witter@bcbsnm.com",
  },
  {
    name: "Catholic Charities",
    category: "Community Resource",
    description: "Support for citizenship-related needs.",
    contactName: "Nancy Hernandez",
    contactPhone: "575-622-1636",
  },

  // Travel/Logistics
  {
    name: "Lodging Form",
    category: "Travel/Logistics",
    description: "Covers lodging for high-risk pregnancy, NICU care, or delivery away from home.",
    contactEmail: "Virginia.billingoperations@modivcare.com",
  },
  {
    name: "Mileage/Meal Reimbursement",
    category: "Travel/Logistics",
    description: "Reimbursement for travel and meal expenses related to medical care. Member must keep receipts.",
    notes: "Form is in the Links tab; submit via fax, mail, or email.",
  },

  // Rewards/Incentives
  {
    name: "Turquoise Rewards",
    category: "Rewards/Incentives",
    description: "Points/rewards program for pregnant/postpartum members who attend appointments; redeemable for baby supplies, household items, and gift cards.",
    notes: "Send the member the enrollment flyer for self-enrollment.",
  },

  // Health Monitoring
  {
    name: "Living365",
    category: "Health Monitoring",
    description: "Health tracking website for GYN/OB members.",
    notes: "Enrollment goes through BCBS.",
  },
  {
    name: "Tobacco Cessation Program",
    category: "Health Monitoring",
    description: "State tobacco cessation support line and education resources.",
    contactPhone: "1-800-784-8669 (1-800-QUITNOW)",
    notes: "https://www.nupacnm.com/",
  },

  // Other
  {
    name: "MARY RUTH Organic Vitamins/Supplements",
    category: "Other",
    description: "Organic supplement products. Cash only — not Medicaid-covered.",
    contactName: "Julia",
    contactEmail: "jpayan@riopecosmed.com",
  },

  // Internal Tool
  {
    name: "Provider Finder",
    category: "Internal Tool",
    description: "Lookup tool for Medicaid referral options.",
  },
  {
    name: "Medicaid Portal",
    category: "Internal Tool",
    description: "Login portal for Medicaid eligibility verification. (Code 45153)",
  },
  {
    name: "AdvancedMD EHR",
    category: "Internal Tool",
    description: "EHR system access. (Code 154522)",
  },
  {
    name: "Enrollment Sheet",
    category: "Internal Tool",
    description: "Tracking document for touchpoints and patient information.",
    notes: "Access by request.",
  },
  {
    name: "Care Coordination Training (Slides)",
    category: "Internal Tool",
    description: "Step-by-step instructional materials for care coordination processes.",
    notes: "Access by request.",
  },
  {
    name: "Care Coordination Operations Manual (v8)",
    category: "Internal Tool",
    description: "Operational guidelines and procedures.",
    notes: "Access by request.",
  },
  {
    name: "Google Drive CC Files",
    category: "Internal Tool",
    description: "PDF repository with forms, CNA guidance, and manuals.",
    notes: "Access by request.",
  },
  {
    name: "Rio OB Packet",
    category: "Internal Tool",
    description: "Resources specifically for pregnant obstetric patients.",
  },
  {
    name: "Rio Pecos Medical Associates Website",
    category: "Internal Tool",
    description: "Clinic and provider information portal.",
  },

  // Referral Contact — Rio Pecos Clinic providers
  {
    name: "Rhianna Shaw (Pediatric NP)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Accepting new patient referrals.",
    contactName: "Evelyn Soto, Trinity Ledesma",
    contactEmail: "esoto@riopecosmed.com, tledesma@riopecosmed.com",
  },
  {
    name: "Dr. Eric Peterson (OB/GYN)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Crystal Maciel, Nubia Santos",
    contactEmail: "cmaciel@riopecosmed.com, nsantos@riopecosmed.com",
  },
  {
    name: "Dr. John Dacanay (OB/GYN)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Hope Kincaid, Alicia Lopez",
    contactEmail: "hkincaid@riopecosmed.com, alopez@riopecosmed.com",
  },
  {
    name: "Dr. David Fucinari (OB/GYN)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Nicole Archuleta",
    contactEmail: "narchuleta@riopecosmed.com",
  },
  {
    name: "Dr. Trevor Miller (PCP/OB)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Alyssa Archuleta, Angie Iglesias",
    contactEmail: "aarchuleta@riopecosmed.com, aiglesias@riopecosmed.com",
  },
  {
    name: "Katrina Kelly (Midwife/Women's Health)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Lupe Hernandez, Araceli Rivas",
    contactEmail: "lhernandez@riopecosmed.com, arivas@riopecosmed.com",
  },
  {
    name: "Kim Hansen (Pediatric NP)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Myrna Ledezma, Veronica Lucero",
    contactEmail: "mledezma@riopecosmed.com, vlucero@riopecosmed.com",
  },
  {
    name: "Dr. Richard Mooney (MD/GYN, non-OB)",
    category: "Referral Contact",
    description: "Rio Pecos Clinic. Not currently accepting new referrals.",
    contactName: "Sally Estrada, Nayelli Wright",
    contactEmail: "sestrada@riopecosmed.com, nlopez@riopecosmed.com",
  },

  // Referral Contact — Ocotillo Clinic providers
  {
    name: "Fallon Moody (PCP/Pediatrics NP)",
    category: "Referral Contact",
    description: "Ocotillo Clinic. Accepting new patient referrals.",
    contactName: "Jeanette Bugarin",
    contactEmail: "jbugarin@ocotillomed.com",
  },
  {
    name: "Tialana Watts (PCP/Pediatrics NP)",
    category: "Referral Contact",
    description: "Ocotillo Clinic. Accepting new patient referrals.",
    contactName: "Dani Herrera",
    contactEmail: "dherrera@ocotillomed.com",
  },
  {
    name: "Nancy Walker (NP, Hormone Therapy/Women's Health)",
    category: "Referral Contact",
    description: "Ocotillo Clinic. Not currently accepting new referrals.",
    contactName: "Dani Herrera",
    contactEmail: "dherrera@ocotillomed.com",
  },
];

// Old generic/renamed entries superseded by more specific or corrected ones
// above — removed on sync so they don't linger as duplicates.
const SUPERSEDED_NAMES = ["Pediatric Referrals", "PCP Referrals", "Food is Medicine", "Housing Specialist"];

// Non-destructive upsert by (clinicId, name) — safe to re-run any time the
// source list grows or an entry's details change without touching anything
// a supervisor/admin has added or edited by hand that isn't in this list.
export async function seedResources(db: PrismaClient, clinicId: string, createdById: string) {
  let created = 0;
  let updated = 0;

  for (const r of RESOURCES) {
    const existing = await db.resourceEntry.findFirst({ where: { clinicId, name: r.name } });
    if (existing) {
      await db.resourceEntry.update({ where: { id: existing.id }, data: r });
      updated++;
    } else {
      await db.resourceEntry.create({ data: { ...r, clinicId, createdById } });
      created++;
    }
  }

  const removed = await db.resourceEntry.deleteMany({ where: { clinicId, name: { in: SUPERSEDED_NAMES } } });

  return { created, updated, removed: removed.count, total: RESOURCES.length };
}
