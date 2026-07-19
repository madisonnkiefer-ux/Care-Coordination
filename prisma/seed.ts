// Demo/dev seed data only. All names, IDs, and contact details below are
// fictional placeholders — never load real PHI into this script or a
// non-production database.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "DemoPass123!";

async function main() {
  console.log("Seeding demo data...");

  const clinic = await db.clinic.upsert({
    where: { id: "demo-clinic" },
    update: {},
    create: { id: "demo-clinic", name: "Rio Pecos Care Coordination (Demo)" },
  });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const [jessica, amanda, michael, supervisor, admin] = await Promise.all([
    upsertUser("jessica.martinez@demo.carecoord.local", "Jessica Martinez", "CARE_COORDINATOR", clinic.id, passwordHash),
    upsertUser("amanda.johnson@demo.carecoord.local", "Amanda Johnson", "CARE_COORDINATOR", clinic.id, passwordHash),
    upsertUser("michael.brown@demo.carecoord.local", "Michael Brown", "CARE_COORDINATOR", clinic.id, passwordHash),
    upsertUser("dana.whitfield@demo.carecoord.local", "Dana Whitfield", "SUPERVISOR", clinic.id, passwordHash),
    upsertUser("admin@demo.carecoord.local", "System Admin", "ADMIN", clinic.id, passwordHash),
  ]);

  const coordinators = [jessica, amanda, michael];

  const memberSeeds = [
    { first: "Elena", last: "Ramirez", program: "Prenatal", ccl: "CCL1" as const, highRisk: false, dob: "1999-05-14", edd: "2026-08-15" },
    { first: "Nadia", last: "Coleman", program: "Prenatal", ccl: "HIGH_RISK" as const, highRisk: true, dob: "1996-11-02", edd: "2026-09-01" },
    { first: "Priya", last: "Desai", program: "Postpartum", ccl: "CCL2" as const, highRisk: false, dob: "1994-02-20", edd: null },
    { first: "Grace", last: "Okafor", program: "Chronic Care", ccl: "CCL3" as const, highRisk: false, dob: "1987-07-09", edd: null },
    { first: "Sofia", last: "Mendez", program: "Prenatal", ccl: "CCL1" as const, highRisk: false, dob: "2001-03-30", edd: "2026-10-12" },
    { first: "Keisha", last: "Turner", program: "Postpartum", ccl: "HIGH_RISK" as const, highRisk: true, dob: "1998-09-18", edd: null },
    { first: "Lucia", last: "Fernandez", program: "Chronic Care", ccl: "CCL2" as const, highRisk: false, dob: "1985-12-05", edd: null },
    { first: "Hannah", last: "Whitaker", program: "Prenatal", ccl: "CCL1" as const, highRisk: false, dob: "1997-06-25", edd: "2026-11-03" },
    { first: "Mei", last: "Chen", program: "Postpartum", ccl: "CCL2" as const, highRisk: false, dob: "1993-01-11", edd: null },
    { first: "Aaliyah", last: "Robinson", program: "Chronic Care", ccl: "HIGH_RISK" as const, highRisk: true, dob: "1980-04-22", edd: null },
  ];

  for (let i = 0; i < memberSeeds.length; i++) {
    const seed = memberSeeds[i];
    const coordinator = coordinators[i % coordinators.length];

    const member = await db.member.create({
      data: {
        clinicId: clinic.id,
        firstName: seed.first,
        lastName: seed.last,
        dateOfBirth: new Date(seed.dob),
        phone: `(505) 555-${String(1000 + i).slice(1)}`,
        email: `${seed.first.toLowerCase()}.${seed.last.toLowerCase()}@demo-member.local`,
        medicaidId: `DEMO${String(100000000 + i)}`,
        program: seed.program,
        status: "ACTIVE",
        cclLevel: seed.ccl,
        edd: seed.edd ? new Date(seed.edd) : null,
        attributedDate: new Date("2026-05-15"),
        assignedCoordinatorId: coordinator.id,
        demographics: {
          create: {
            emergencyContactName: `${seed.first} Emergency Contact`,
            emergencyContactPhone: `(505) 555-${String(2000 + i).slice(1)}`,
            emergencyContactRel: "Spouse",
            race: "Prefers not to say",
            ethnicity: "Prefers not to say",
            primaryPayer: "Medicaid",
            housingStatus: "Stable housing",
          },
        },
      },
    });

    const cna = await db.cnaAssessment.create({
      data: {
        memberId: member.id,
        assessorId: coordinator.id,
        assessmentType: "Initial CNA",
        status: "COMPLETED",
        summaryNotes: "Member engaged and attending scheduled appointments.",
        domains: {
          create: [
            { domain: "PHYSICAL_HEALTH", hasNeeds: i % 3 === 0, needsCount: i % 3 === 0 ? 2 : 0 },
            { domain: "BEHAVIORAL_HEALTH", hasNeeds: seed.highRisk, needsCount: seed.highRisk ? 1 : 0 },
            { domain: "SOCIAL_RELATIONSHIPS", hasNeeds: false, needsCount: 0, strengths: "Strong family support" },
            { domain: "PRACTICAL_NEEDS", hasNeeds: i % 4 === 0, needsCount: i % 4 === 0 ? 3 : 0 },
            { domain: "SAFETY", hasNeeds: false, needsCount: 0 },
            { domain: "PREGNANCY_POSTPARTUM", hasNeeds: seed.program !== "Chronic Care", needsCount: seed.program !== "Chronic Care" ? 1 : 0 },
          ],
        },
      },
    });
    void cna;

    await db.hraAssessment.create({
      data: {
        memberId: member.id,
        assessorId: coordinator.id,
        status: "COMPLETED",
        assessmentType: "Initial assessment",
        assessmentMethod: "In-person",
        languageNeedOtherThanEnglish: false,
        needsTranslationServices: false,
        healthConditions: seed.highRisk ? "Behavioral health diagnosis" : "None",
        sexAssignedAtBirth: "Female",
        currentGender: "Female",
        sexualIdentity: "Straight, that is not gay or lesbian",
        isPregnant: seed.program !== "Chronic Care",
        perinatalPostpartumOrYoungChild: seed.program !== "Chronic Care" ? "yes" : "no",
        usesTobaccoNicotine: "no",
        worriedAboutFood: i % 4 === 0 ? "yes" : "no",
        reliableTransportation: "yes",
        needsHelpFindingProvider: "no",
        erVisitsPast12Months: seed.highRisk,
        erVisitCount: seed.highRisk ? "5" : "0",
        hospitalOvernightPast6Months: false,
        medicationsCount: "2",
        needsHelpWith2OrMoreAdls: false,
        interestedInCareCoordination: true,
        mainHealthConcerns: seed.highRisk ? "Elevated depression screening, needs follow-up." : "None reported.",
      },
    });

    const carePlan = await db.carePlan.create({
      data: {
        memberId: member.id,
        createdById: coordinator.id,
        goals: {
          create: [
            {
              title: "Improve prenatal care attendance",
              description: "Member will attend all scheduled prenatal appointments.",
              status: "ON_TRACK",
              targetDate: new Date("2026-08-15"),
            },
            {
              title: "Reduce tobacco use",
              description: "Member will be tobacco-free during pregnancy.",
              status: i % 2 === 0 ? "IN_PROGRESS" : "ON_TRACK",
              targetDate: new Date("2026-08-15"),
            },
            {
              title: "Healthy weight gain",
              description: "Member will gain weight within recommended range.",
              status: "ON_TRACK",
              targetDate: new Date("2026-08-15"),
            },
            {
              title: "Plan for postpartum support",
              description: "Member will identify a support person and community resources.",
              status: seed.highRisk ? "NOT_STARTED" : "IN_PROGRESS",
              targetDate: new Date("2026-09-01"),
            },
          ],
        },
      },
    });
    void carePlan;

    await db.touchpoint.createMany({
      data: [
        { memberId: member.id, userId: coordinator.id, type: "PHONE_CALL", outcome: "COMPLETED", date: daysAgo(3) },
        { memberId: member.id, userId: coordinator.id, type: "TEXT_MESSAGE", outcome: "COMPLETED", date: daysAgo(10) },
        {
          memberId: member.id,
          userId: coordinator.id,
          type: "PHONE_CALL",
          outcome: i % 5 === 0 ? "ATTEMPTED" : "COMPLETED",
          date: daysAgo(18),
        },
      ],
    });

    await db.appointment.create({
      data: {
        memberId: member.id,
        title: seed.program === "Postpartum" ? "OB Postpartum Visit" : "Prenatal Care Visit",
        location: "Rio Pecos Medical Associates",
        startsAt: daysFromNow(5 + i),
        isVirtual: i % 3 === 0,
      },
    });

    await db.task.create({
      data: {
        memberId: member.id,
        assigneeId: coordinator.id,
        title: seed.highRisk ? "Follow up on high-risk screening result" : "Annual CNA due",
        priority: seed.highRisk ? "HIGH" : "MEDIUM",
        dueDate: daysFromNow(i - 3),
      },
    });

    await db.quickNote.create({
      data: {
        memberId: member.id,
        authorId: coordinator.id,
        body: "Member is engaged and attending all appointments. Discussed birth plan and available resources.",
      },
    });

    await db.document.create({
      data: {
        memberId: member.id,
        uploadedById: coordinator.id,
        name: `Care Plan - ${seed.first} ${seed.last}.pdf`,
        category: "CARE_PLAN",
        storageKey: `demo/${member.id}/care-plan.pdf`,
      },
    });
  }

  console.log(`Seeded clinic "${clinic.name}" with ${memberSeeds.length} demo members.`);
  console.log(`Demo login password for all users: ${DEMO_PASSWORD}`);
  console.log(
    "Users:",
    [jessica, amanda, michael, supervisor, admin].map((u) => `${u.email} (${u.role})`).join(", ")
  );
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function upsertUser(
  email: string,
  name: string,
  role: "CARE_COORDINATOR" | "SUPERVISOR" | "ADMIN",
  clinicId: string,
  passwordHash: string
) {
  return db.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, clinicId, passwordHash },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
