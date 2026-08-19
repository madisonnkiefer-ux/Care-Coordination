// Demo/dev data only — generates additional fictional members on top of the
// base seedDemoData() clinic, for exploring lists/reports/exports at volume.
// Run via: npx tsx prisma/generate-bulk-demo-members.ts
// Count is controlled by the BULK_MEMBER_COUNT env var (default 100).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const COUNT = Number(process.env.BULK_MEMBER_COUNT ?? 100);

const FIRST_NAMES = [
  "Olivia", "Emma", "Ava", "Sophia", "Isabella", "Mia", "Amelia", "Harper", "Evelyn", "Camila",
  "Luna", "Gianna", "Aria", "Layla", "Nora", "Zoey", "Riley", "Victoria", "Lily", "Hannah",
  "Zara", "Fatima", "Ngozi", "Chioma", "Amara", "Yara", "Leila", "Rosa", "Ines", "Carmen",
  "Destiny", "Jasmine", "Alicia", "Maya", "Simone", "Tanya", "Brianna", "Kayla", "Alexis", "Jada",
  "Wei", "Ling", "Yuki", "Anh", "Thu", "Trang", "Sana", "Aisha", "Noor", "Priya",
];

const LAST_NAMES = [
  "Garcia", "Martinez", "Rodriguez", "Lopez", "Hernandez", "Gonzalez", "Perez", "Sanchez", "Ramirez", "Torres",
  "Flores", "Rivera", "Gomez", "Diaz", "Reyes", "Morales", "Ortiz", "Gutierrez", "Chavez", "Ramos",
  "Johnson", "Williams", "Brown", "Jones", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson",
  "Thomas", "Jackson", "White", "Harris", "Clark", "Lewis", "Walker", "Young", "Allen", "King",
  "Nguyen", "Tran", "Le", "Kim", "Chen", "Wang", "Patel", "Khan", "Ahmed", "Hassan",
];

const PROGRAMS = ["Prenatal", "Postpartum", "GYN"] as const;
const CCL_LEVELS = ["CCL1", "CCL2", "CCL3", "HIGH_RISK"] as const;

function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDob() {
  const year = 1970 + Math.floor(Math.random() * 35); // 1970-2004
  const month = Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return new Date(year, month, day);
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

async function main() {
  const clinic = await db.clinic.findUnique({ where: { id: "demo-clinic" } });
  if (!clinic) throw new Error("Demo clinic not found — run the base seed (seedDemoData) first.");

  const coordinators = await db.user.findMany({
    where: { clinicId: clinic.id, role: "CARE_COORDINATOR" },
    orderBy: { email: "asc" },
  });
  if (coordinators.length === 0) throw new Error("No demo coordinators found — run the base seed first.");

  const alreadyCreated = await db.member.count({
    where: { clinicId: clinic.id, medicaidId: { startsWith: "DEMOBULK" } },
  });

  let created = 0;
  for (let n = 0; n < COUNT; n++) {
    const idx = alreadyCreated + n;
    const first = randomFrom(FIRST_NAMES);
    const last = randomFrom(LAST_NAMES);
    const program = randomFrom(PROGRAMS);
    const ccl = randomFrom(CCL_LEVELS);
    const highRisk = ccl === "HIGH_RISK";
    const coordinator = coordinators[idx % coordinators.length];
    const dob = randomDob();
    const edd = program === "Prenatal" ? daysFromNow(10 + Math.floor(Math.random() * 200)) : null;
    const medicaidId = `DEMOBULK${String(900000000 + idx)}`;
    const email = `${first.toLowerCase()}.${last.toLowerCase()}.${idx}@demo-member.local`;

    const member = await db.member.create({
      data: {
        clinicId: clinic.id,
        firstName: first,
        lastName: last,
        dateOfBirth: dob,
        phone: `(505) 555-${String(9000 + (idx % 1000)).slice(-4)}`,
        email,
        medicaidId,
        memberIdExternal: `CHB-${2000 + idx}`,
        program,
        status: "ACTIVE",
        cclLevel: ccl,
        edd,
        attributedDate: daysAgo(Math.floor(Math.random() * 90)),
        assignedCoordinatorId: coordinator.id,
      },
    });

    await db.intakeVersion.create({
      data: {
        memberId: member.id,
        demographics: {
          create: {
            memberId: member.id,
            assessorId: coordinator.id,
            status: "COMPLETED",
            firstName: first,
            lastName: last,
            dateOfBirth: dob,
            medicaidId,
            email,
            language: "English",
            emergencyContactName: `${first} Emergency Contact`,
            emergencyContactPhone: `(505) 555-${String(9500 + (idx % 500)).slice(-4)}`,
            emergencyContactRel: "Spouse",
            race: "Prefers not to say",
            ethnicity: "Prefers not to say",
            primaryPayer: "Medicaid",
            housingStatus: "Stable housing",
          },
        },
        cna: {
          create: {
            memberId: member.id,
            assessorId: coordinator.id,
            assessmentType: ["Initial"],
            assessmentMethod: "In-person in-home",
            status: "COMPLETED",
            hasImminentRisk: false,
            meetsCbsqCbma: false,
            languageNeedOtherThanEnglish: false,
            overallHealthVsYearAgo: "Good",
            physicalHealthConditionsSelfReported: idx % 3 === 0,
            behavioralHealthConditionsSelfReported: highRisk,
            behavioralHealthConditionsNa: !highRisk,
            phqLittleInterest: highRisk ? 2 : 0,
            phqFeelingDown: highRisk ? 2 : 0,
            cageCutDown: false,
            cageAnnoyed: false,
            cageGuilty: false,
            cageEyeOpener: false,
            hasHousingInsecurity: idx % 4 === 0,
            isCurrentlyPregnant: program === "Prenatal",
            mainHealthGoal: "Stay engaged with scheduled appointments and care plan goals.",
            mostSignificantNeedsToday: "Member engaged and attending scheduled appointments.",
            interestedInCareCoordination: true,
          },
        },
        hra: {
          create: {
            memberId: member.id,
            assessorId: coordinator.id,
            status: "COMPLETED",
            assessmentType: "Initial assessment",
            assessmentMethod: "In-person",
            languageNeedOtherThanEnglish: false,
            needsTranslationServices: false,
            healthConditions: highRisk ? "Behavioral health diagnosis" : "None",
            sexAssignedAtBirth: "Female",
            currentGender: "Female",
            sexualIdentity: "Straight, that is not gay or lesbian",
            isPregnant: program === "Prenatal",
            perinatalPostpartumOrYoungChild: program === "Prenatal" || program === "Postpartum" ? "yes" : "no",
            usesTobaccoNicotine: "no",
            worriedAboutFood: idx % 4 === 0 ? "yes" : "no",
            reliableTransportation: "yes",
            needsHelpFindingProvider: "no",
            erVisitsPast12Months: highRisk,
            erVisitCount: highRisk ? "5" : "0",
            hospitalOvernightPast6Months: false,
            medicationsCount: "2",
            needsHelpWith2OrMoreAdls: false,
            interestedInCareCoordination: true,
            mainHealthConcerns: highRisk ? "Elevated depression screening, needs follow-up." : "None reported.",
          },
        },
        note: {
          create: {
            memberId: member.id,
            assessorId: coordinator.id,
            status: "COMPLETED",
            physicalHealthSummary: "Member reports stable physical health with no new concerns since last contact.",
            behavioralHealthSummary: highRisk
              ? "Elevated depression screening noted; member engaged in follow-up discussion."
              : "No behavioral health concerns observed.",
            careCoordinationLevel: ccl,
            eligibilityConclusionsSummary: "Member meets criteria for continued care coordination at the identified level.",
          },
        },
      },
    });

    await db.carePlan.create({
      data: {
        memberId: member.id,
        createdById: coordinator.id,
        goals: {
          create: [
            {
              title: "Improve appointment attendance",
              description: "Member will attend all scheduled care appointments.",
              status: "ON_TRACK",
              targetDate: daysFromNow(60),
            },
            {
              title: "Reduce tobacco use",
              description: "Member will reduce or eliminate tobacco use.",
              status: idx % 2 === 0 ? "IN_PROGRESS" : "ON_TRACK",
              targetDate: daysFromNow(60),
            },
            {
              title: "Connect with community resources",
              description: "Member will identify and connect with at least one community support resource.",
              status: highRisk ? "NOT_STARTED" : "IN_PROGRESS",
              targetDate: daysFromNow(90),
            },
          ],
        },
      },
    });

    await db.touchpoint.createMany({
      data: [
        { memberId: member.id, userId: coordinator.id, type: "PHONE_CALL", outcome: "COMPLETED", date: daysAgo(3) },
        { memberId: member.id, userId: coordinator.id, type: "TEXT_MESSAGE", outcome: "COMPLETED", date: daysAgo(10) },
        {
          memberId: member.id,
          userId: coordinator.id,
          type: "PHONE_CALL",
          outcome: idx % 5 === 0 ? "ATTEMPTED" : "COMPLETED",
          date: daysAgo(18),
        },
      ],
    });

    await db.appointment.create({
      data: {
        memberId: member.id,
        title: program === "Postpartum" ? "OB Postpartum Visit" : program === "GYN" ? "GYN Annual Visit" : "Prenatal Care Visit",
        location: "Rio Pecos Medical Associates",
        startsAt: daysFromNow(5 + (idx % 30)),
        isVirtual: idx % 3 === 0,
      },
    });

    await db.task.create({
      data: {
        memberId: member.id,
        assigneeId: coordinator.id,
        title: highRisk ? "Follow up on high-risk screening result" : "Annual CNA due",
        priority: highRisk ? "HIGH" : "MEDIUM",
        dueDate: daysFromNow((idx % 14) - 3),
      },
    });

    await db.quickNote.create({
      data: {
        memberId: member.id,
        authorId: coordinator.id,
        body: "Member is engaged and attending scheduled appointments. Discussed care plan and available resources.",
      },
    });

    await db.document.create({
      data: {
        memberId: member.id,
        uploadedById: coordinator.id,
        name: `Care Plan - ${first} ${last}.pdf`,
        category: "CARE_PLAN",
        storageKey: `demo/${member.id}/care-plan.pdf`,
      },
    });

    created++;
    if (created % 10 === 0) console.log(`  ...${created}/${COUNT} created`);
  }

  console.log(`Created ${created} bulk demo members for clinic "${clinic.name}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
