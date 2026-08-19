// Demo/dev data only — takes the bulk-generated demo members (all
// compliant/complete by default) and deliberately pushes small groups of
// them out of compliance on each thing the app actually tracks, so the
// dashboards, reports, and alerts have real examples to show instead of a
// wall of green checkmarks. Everyone not touched here stays compliant.
// Run via: npx tsx prisma/inject-compliance-variety.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const clinic = await db.clinic.findUnique({ where: { id: "demo-clinic" } });
  if (!clinic) throw new Error("Demo clinic not found — run the base seed first.");

  const bulkMembers = await db.member.findMany({
    where: { clinicId: clinic.id, medicaidId: { startsWith: "DEMOBULK" } },
    orderBy: { medicaidId: "asc" },
    include: { intakeVersions: true, cnaAssessments: true, carePlans: true },
  });
  if (bulkMembers.length === 0) throw new Error("No bulk demo members found — run generate-bulk-demo-members.ts first.");

  // --- Baseline: make everyone compliant first, so only the groups below stand out ---
  // Touchpoint compliance is driven by GeneralCommunication + member-track
  // progress notes (see lib/touchpoint-compliance.ts) — NOT the separate
  // Touchpoint model the bulk generator logs for the activity feed. Neither
  // the curated 10 nor the bulk 100 have any GeneralCommunication rows yet,
  // so every member currently reads as touchpoint-non-compliant. Give
  // everyone one recent successful contact here; group 6 below removes it
  // again for a handful.
  await db.$transaction(
    bulkMembers.flatMap((m) => [
      db.member.update({ where: { id: m.id }, data: { medicaidEligibilityVerified: true } }),
      ...(m.intakeVersions[0]
        ? [db.intakeVersion.update({ where: { id: m.intakeVersions[0].id }, data: { signedAt: m.createdAt } })]
        : []),
      db.generalCommunication.create({
        data: {
          memberId: m.id,
          authorId: m.assignedCoordinatorId ?? bulkMembers[0].assignedCoordinatorId!,
          body: "Spoke with member — engaged and attending scheduled appointments.",
          contactMethod: "Phone",
          successful: true,
          personContacted: "Member",
          createdAt: daysAgo(5),
        },
      }),
    ])
  );

  let cursor = 0;
  function take(n: number) {
    const slice = bulkMembers.slice(cursor, cursor + n);
    cursor += n;
    return slice;
  }

  // 1) Unsigned intakes (open TOC-adjacent compliance signal on the Supervisor Dashboard)
  const unsigned = take(7);
  for (const m of unsigned) {
    if (m.intakeVersions[0]) {
      await db.intakeVersion.update({ where: { id: m.intakeVersions[0].id }, data: { signedAt: null } });
    }
  }

  // 2) Unverified Medicaid eligibility (Billing roster filter)
  const unverified = take(7);
  await db.member.updateMany({
    where: { id: { in: unverified.map((m) => m.id) } },
    data: { medicaidEligibilityVerified: false },
  });

  // 3) Unassigned coordinator (Supervisor Dashboard "needs assignment")
  const unassigned = take(7);
  await db.member.updateMany({
    where: { id: { in: unassigned.map((m) => m.id) } },
    data: { assignedCoordinatorId: null },
  });

  // 4) Annual CNA past due (assessment more than a year old)
  const cnaPastDue = take(8);
  for (const m of cnaPastDue) {
    if (m.cnaAssessments[0]) {
      await db.cnaAssessment.update({ where: { id: m.cnaAssessments[0].id }, data: { assessmentDate: daysAgo(400) } });
    }
  }

  // 5) CNA never completed (still in draft — counts toward the coordinator's "CNA due" stat)
  const cnaDraft = take(3);
  for (const m of cnaDraft) {
    if (m.cnaAssessments[0]) {
      await db.cnaAssessment.update({ where: { id: m.cnaAssessments[0].id }, data: { status: "DRAFT" } });
    }
  }

  // 6) Touchpoint compliance gaps (no contact within the current cadence window) —
  // push the baseline contact created above outside the window instead of
  // deleting it, so the chart still shows contact history, just stale.
  const touchpointGap = take(8);
  await db.generalCommunication.updateMany({
    where: { memberId: { in: touchpointGap.map((m) => m.id) } },
    data: { createdAt: daysAgo(150) },
  });

  // 7) Overdue CCP (no care plan on file, well past the 14-business-day grace period)
  const overdueCcp = take(5);
  for (const m of overdueCcp) {
    await db.carePlanGoal.deleteMany({ where: { carePlan: { memberId: m.id } } });
    await db.carePlan.deleteMany({ where: { memberId: m.id } });
    await db.member.update({ where: { id: m.id }, data: { createdAt: daysAgo(35) } });
  }

  // 8) Billing-excluded members
  const billingExcluded = take(5);
  const exclusionReasons = ["Member declined services", "Duplicate enrollment", "Pending eligibility redetermination"];
  for (let i = 0; i < billingExcluded.length; i++) {
    await db.member.update({
      where: { id: billingExcluded[i].id },
      data: { billingExcluded: true, billingExclusionReason: exclusionReasons[i % exclusionReasons.length] },
    });
  }

  // 9) Graduation review overdue (Postpartum members ~13 months past delivery)
  const postpartumCandidates = bulkMembers.filter((m) => m.program === "Postpartum").slice(0, 5);
  for (const m of postpartumCandidates) {
    await db.hedisMeasures.upsert({
      where: { memberId: m.id },
      update: { deliveryDate: daysAgo(395) },
      create: { memberId: m.id, deliveryDate: daysAgo(395) },
    });
  }

  // 10) A few open (unsigned) TOC cases for variety
  const admin = await db.user.findFirst({ where: { clinicId: clinic.id, role: "ADMIN" } });
  const tocCandidates = take(5);
  if (admin) {
    for (const m of tocCandidates) {
      await db.tocRecord.create({
        data: { memberId: m.id, assessorId: admin.id, status: "DRAFT" },
      });
    }
  }

  console.log(
    [
      `Unsigned intakes: ${unsigned.length}`,
      `Unverified eligibility: ${unverified.length}`,
      `Unassigned coordinator: ${unassigned.length}`,
      `CNA past due: ${cnaPastDue.length}`,
      `CNA still draft: ${cnaDraft.length}`,
      `Touchpoint gaps: ${touchpointGap.length}`,
      `Overdue CCP: ${overdueCcp.length}`,
      `Billing excluded: ${billingExcluded.length}`,
      `Graduation review overdue: ${postpartumCandidates.length}`,
      `Open TOC cases: ${admin ? tocCandidates.length : 0}`,
    ].join("\n")
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
