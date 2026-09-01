// Read-only biweekly HIPAA compliance check — the same four areas the
// Settings tabs (Security Alerts, Audit Log, Patient Rights, Vendors &
// BAAs) surface, run against real data without needing a live login.
// Reuses the actual detection logic (lib/security-alerts-detection.ts's
// computeSecurityAlerts, the same 60-day amendment-response rule, the same
// 60-day BAA "expiring soon" threshold vendors-tab.tsx uses) rather than
// re-deriving it, so this can never quietly drift from what Settings shows.
//
// Meant to run the same way scripts/validate-team-report.ts does: as a
// one-off ECS task in the app's own private subnet, using the DATABASE_URL
// secret already wired into the task definition. Never touches the live
// service. Prints names/emails (already visible to any admin in Settings)
// but no member PHI beyond member IDs already present in AuditLog rows.
//
// Usage:
//   npx tsx scripts/hipaa-compliance-check.ts [--clinic=CODE]
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import { computeSecurityAlerts } from "../lib/security-alerts-detection";
import { AMENDMENT_RESPONSE_DAYS } from "../lib/amendment-requests-shared";

// Mirrors components/settings/vendors-tab.tsx's own EXPIRING_SOON_DAYS —
// not exported from that "use client" file, so kept in sync by hand here.
const BAA_EXPIRING_SOON_DAYS = 60;
// Mirrors components/amendment-requests-card.tsx's dueByBadge() "nearing" cutoff.
const AMENDMENT_NEARING_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(prefix));
  return found?.slice(prefix.length);
}

async function main() {
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
    console.log(`Multiple clinics exist; defaulting to "${clinic.name}" (${clinic.code}). Pass --clinic=CODE to pick another.\n`);
  }

  console.log(`HIPAA Compliance Check — ${clinic.name} — ${new Date().toISOString().slice(0, 10)}\n`);
  let anythingFlagged = false;

  // ---- 1. Security Alerts ----
  const { bulkAccessAlerts, outOfCaseloadAlerts, failedLoginAlerts, lookbackDays } = await computeSecurityAlerts(clinic.id, db);
  console.log(`== Security Alerts (last ${lookbackDays} days) ==`);
  if (bulkAccessAlerts.length === 0 && outOfCaseloadAlerts.length === 0 && failedLoginAlerts.length === 0) {
    console.log("  None.");
  } else {
    anythingFlagged = true;
    for (const a of bulkAccessAlerts) {
      console.log(`  [Bulk Access] ${a.userName} — ${a.day} — ${a.distinctPatients} distinct patients (caseload ${a.caseloadSize})`);
    }
    for (const a of outOfCaseloadAlerts) {
      console.log(`  [Out-of-Caseload] ${a.userName} — ${a.day} — ${a.distinctOutsidePatients} distinct non-caseload patients`);
    }
    for (const a of failedLoginAlerts) {
      console.log(`  [Failed Logins] ${a.userName} <${a.email}> — ${a.day} — ${a.count} failures${a.currentlyLocked ? " (currently locked)" : ""}`);
    }
  }

  // ---- 2. Audit Log — no built-in anomaly detection beyond Security
  // Alerts, so this just surfaces recent EXPORT/DELETE volume per user for
  // a human to eyeball, same lookback window as the alerts above. ----
  const since = new Date(Date.now() - lookbackDays * DAY_MS);
  const notableActions = await db.auditLog.findMany({
    where: { action: { in: ["EXPORT", "DELETE"] }, createdAt: { gte: since }, user: { clinicId: clinic.id } },
    select: { action: true, resource: true, createdAt: true, user: { select: { name: true } } },
  });
  console.log(`\n== Audit Log: EXPORT/DELETE activity (last ${lookbackDays} days) ==`);
  if (notableActions.length === 0) {
    console.log("  None.");
  } else {
    const byUser = new Map<string, { exports: number; deletes: number }>();
    for (const a of notableActions) {
      const name = a.user?.name ?? "(unknown user)";
      const entry = byUser.get(name) ?? { exports: 0, deletes: 0 };
      if (a.action === "EXPORT") entry.exports += 1;
      else entry.deletes += 1;
      byUser.set(name, entry);
    }
    for (const [name, counts] of byUser) {
      console.log(`  ${name} — ${counts.exports} export(s), ${counts.deletes} delete(s)`);
    }
    console.log("  (Volume only — not itself a threshold alert. Worth a glance if any name stands out.)");
  }

  // ---- 3. Patient Rights: amendment requests nearing/past the 60-day deadline ----
  const openAmendments = await db.amendmentRequest.findMany({
    where: { status: "OPEN", member: { clinicId: clinic.id } },
    select: { id: true, createdAt: true, member: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });
  const now = Date.now();
  const amendmentsOfConcern = openAmendments
    .map((r) => {
      const dueBy = new Date(r.createdAt.getTime() + AMENDMENT_RESPONSE_DAYS * DAY_MS);
      const daysLeft = Math.ceil((dueBy.getTime() - now) / DAY_MS);
      return { ...r, daysLeft };
    })
    .filter((r) => r.daysLeft <= AMENDMENT_NEARING_DAYS);
  console.log(`\n== Patient Rights: OPEN amendment requests within ${AMENDMENT_NEARING_DAYS} days of the ${AMENDMENT_RESPONSE_DAYS}-day deadline ==`);
  if (amendmentsOfConcern.length === 0) {
    console.log(`  None. (${openAmendments.length} open amendment request(s) total, all outside the ${AMENDMENT_NEARING_DAYS}-day window.)`);
  } else {
    anythingFlagged = true;
    for (const r of amendmentsOfConcern) {
      const status = r.daysLeft < 0 ? `OVERDUE by ${-r.daysLeft}d` : `${r.daysLeft}d left`;
      console.log(`  ${r.member.firstName} ${r.member.lastName} — requested ${r.createdAt.toISOString().slice(0, 10)} — ${status}`);
    }
  }

  // ---- 4. Vendors & BAAs ----
  const vendors = await db.vendor.findMany({ where: { clinicId: clinic.id, active: true }, select: { name: true, hasBaa: true, baaExpiresAt: true } });
  const missingBaa = vendors.filter((v) => !v.hasBaa);
  const expiringOrExpired = vendors
    .filter((v) => v.hasBaa && v.baaExpiresAt)
    .map((v) => ({ ...v, daysUntilExpiry: Math.floor((v.baaExpiresAt!.getTime() - now) / DAY_MS) }))
    .filter((v) => v.daysUntilExpiry <= BAA_EXPIRING_SOON_DAYS);
  console.log(`\n== Vendors & BAAs (${vendors.length} active vendor(s)) ==`);
  if (missingBaa.length === 0 && expiringOrExpired.length === 0) {
    console.log("  None flagged — every active vendor has a BAA on file with no expiry within the next 60 days.");
  } else {
    anythingFlagged = true;
    for (const v of missingBaa) console.log(`  [No BAA] ${v.name}`);
    for (const v of expiringOrExpired) {
      const status = v.daysUntilExpiry < 0 ? `EXPIRED ${-v.daysUntilExpiry}d ago` : `expires in ${v.daysUntilExpiry}d`;
      console.log(`  [BAA ${v.daysUntilExpiry < 0 ? "Expired" : "Expiring Soon"}] ${v.name} — ${status}`);
    }
  }

  console.log(`\n${anythingFlagged ? "⚠ Items flagged above — see detail." : "✓ Nothing flagged in any of the four areas."}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
