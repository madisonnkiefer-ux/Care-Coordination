// Read-only spot-check for the Team Monthly Snapshot report — runs the
// exact same lib/team-performance.ts math against real data, so a
// supervisor (or whoever has DB access) can confirm the report's numbers
// without trusting a hand re-derivation.
//
// The production database has no public endpoint on purpose (see
// infra/README.md) — this is meant to run the same way schema syncs do:
// as a one-off ECS Fargate task, in the same private subnet as the app,
// using the DATABASE_URL secret already wired into the task definition.
// It never touches the live service. Prints only aggregate counts per
// coordinator (names, not individual member PHI) to stdout/CloudWatch.
//
// Usage (inside the container, or via an ECS run-task command override):
//   npx tsx scripts/validate-team-report.ts [--clinic=CODE] [--month=YYYY-MM]
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { firstEnrollmentDate, progressNotesToContacts } from "../lib/touchpoint-compliance";
import { computeCoordinatorRow, monthBounds } from "../lib/team-performance";

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const month = arg("month") ?? currentMonthValue();
  const clinicCode = arg("clinic");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const clinics = await db.clinic.findMany({ select: { id: true, name: true, code: true } });
  if (clinics.length === 0) {
    console.error("No clinics found.");
    process.exit(1);
  }
  const clinic = clinicCode ? clinics.find((c) => c.code === clinicCode) : clinics[0];
  if (!clinic) {
    console.error(`Clinic "${clinicCode}" not found. Available: ${clinics.map((c) => c.code).join(", ")}`);
    process.exit(1);
  }
  if (!clinicCode && clinics.length > 1) {
    console.log(`Multiple clinics exist; defaulting to "${clinic.name}" (${clinic.code}). Pass --clinic=CODE to pick another.`);
  }

  const [members, coordinators] = await Promise.all([
    db.member.findMany({
      where: { clinicId: clinic.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        status: true,
        program: true,
        assignedCoordinatorId: true,
        createdAt: true,
        cnaAssessments: {
          where: { status: "COMPLETED" },
          orderBy: { assessmentDate: "desc" },
          select: { assessmentDate: true },
        },
        generalCommunications: { select: { createdAt: true, successful: true } },
        carePlans: {
          select: {
            goals: {
              select: {
                progressNotes: { where: { track: "MEMBER" }, select: { date: true, createdAt: true } },
              },
            },
          },
        },
        intakeVersions: { where: { signedAt: { not: null } }, orderBy: { signedAt: "asc" }, take: 1, select: { signedAt: true } },
      },
    }),
    db.user.findMany({
      where: { clinicId: clinic.id, role: "CARE_COORDINATOR", active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (coordinators.length === 0) {
    const allUsers = await db.user.findMany({
      where: { clinicId: clinic.id },
      select: { role: true, active: true },
    });
    const byRoleActive = new Map<string, number>();
    for (const u of allUsers) {
      const key = `${u.role} / active=${u.active}`;
      byRoleActive.set(key, (byRoleActive.get(key) ?? 0) + 1);
    }
    console.log(`\nNo active CARE_COORDINATOR users found for this clinic. All ${allUsers.length} users by role/active status:`);
    for (const [key, count] of byRoleActive) console.log(`  ${key}: ${count}`);

    const namesToCheck = arg("check-names")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
    if (namesToCheck.length > 0) {
      const matches = await db.user.findMany({
        where: { clinicId: clinic.id, OR: namesToCheck.map((n) => ({ name: { contains: n, mode: "insensitive" as const } })) },
        select: { name: true, role: true, active: true },
      });
      console.log(`\nLooking for: ${namesToCheck.join(", ")}`);
      if (matches.length === 0) {
        console.log("  None of those names found in this clinic's users at all.");
      } else {
        for (const m of matches) console.log(`  ${m.name} — role=${m.role} active=${m.active}`);
      }
    }
    console.log("");
  }

  const performanceMembers = members.map((m) => {
    const lastCna = m.cnaAssessments[0] ?? null;
    return {
      id: m.id,
      name: `${m.firstName} ${m.lastName}`,
      status: m.status,
      program: m.program,
      enrollmentDate: firstEnrollmentDate(m),
      contacts: [
        ...m.generalCommunications,
        ...progressNotesToContacts(m.carePlans.flatMap((cp) => cp.goals.flatMap((g) => g.progressNotes))),
      ],
      cnaCompletions: m.cnaAssessments.map((c) => c.assessmentDate),
      lastCnaDate: lastCna?.assessmentDate ?? null,
      coordinatorId: m.assignedCoordinatorId,
    };
  });

  const { monthStart, monthEnd } = monthBounds(month);
  const now = new Date();

  const rows = coordinators.map((c) =>
    computeCoordinatorRow(
      c.id,
      c.name,
      performanceMembers.filter((m) => m.coordinatorId === c.id),
      monthStart,
      monthEnd,
      now
    )
  );

  console.log(`\nTeam Monthly Snapshot — ${clinic.name} — ${month}\n`);
  console.log(
    ["Care Coordinator", "# Members", "Successful TP", "% Successful", "Attempts", "CNAs Done", "CNAs Due"]
      .map((h) => h.padEnd(18))
      .join("")
  );
  for (const r of rows) {
    console.log(
      [
        r.name,
        String(r.members),
        String(r.successfulTouchpoints),
        r.successRate === null ? "—" : `${r.successRate}%`,
        String(r.totalAttempts),
        String(r.cnasCompleted),
        String(r.cnasStillDue),
      ]
        .map((v) => v.padEnd(18))
        .join("")
    );
  }
  const ratedRows = rows.filter((r) => r.successRate !== null);
  const totals = {
    members: rows.reduce((s, r) => s + r.members, 0),
    successful: rows.reduce((s, r) => s + r.successfulTouchpoints, 0),
    avgPct: ratedRows.length ? Math.round(ratedRows.reduce((s, r) => s + (r.successRate ?? 0), 0) / ratedRows.length) : null,
    attempts: rows.reduce((s, r) => s + r.totalAttempts, 0),
    cnasDone: rows.reduce((s, r) => s + r.cnasCompleted, 0),
    cnasDue: rows.reduce((s, r) => s + r.cnasStillDue, 0),
  };
  console.log(
    [
      "Total",
      String(totals.members),
      String(totals.successful),
      totals.avgPct === null ? "—" : `Avg ${totals.avgPct}%`,
      String(totals.attempts),
      String(totals.cnasDone),
      String(totals.cnasDue),
    ]
      .map((v) => v.padEnd(18))
      .join("")
  );
  console.log("");

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
