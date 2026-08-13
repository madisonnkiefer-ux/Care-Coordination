import "server-only";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/dal";

const LOOKBACK_DAYS = 30;

// A care coordinator's day-to-day work is bounded by their own caseload —
// these thresholds exist to surface real outliers (a compromised account
// being used to scrape records, a departing employee exporting data) without
// flagging normal cross-coverage (covering a colleague's patient for a day,
// a supervisor spot-checking a chart).
const BULK_ACCESS_BUFFER = 10; // distinct patients/day beyond their own caseload size
const OUT_OF_CASELOAD_THRESHOLD = 5; // distinct non-caseload patients/day
const FAILED_LOGIN_THRESHOLD = 5; // LOGIN_FAILED events/day for one account

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type BulkAccessAlert = {
  userId: string;
  userName: string;
  day: string;
  distinctPatients: number;
  caseloadSize: number;
};

export type OutOfCaseloadAlert = {
  userId: string;
  userName: string;
  day: string;
  distinctOutsidePatients: number;
};

export type FailedLoginAlert = {
  userId: string;
  userName: string;
  email: string;
  day: string;
  count: number;
  currentlyLocked: boolean;
};

export async function getSecurityAlerts() {
  const session = await requireRole("ADMIN");
  const clinicId = session.clinicId;
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const [coordinators, viewLogs, failedLogins] = await Promise.all([
    db.user.findMany({
      where: { clinicId, role: "CARE_COORDINATOR" },
      select: {
        id: true,
        name: true,
        lockedUntil: true,
        assignedMembers: { select: { id: true } },
      },
    }),
    db.auditLog.findMany({
      where: {
        action: "VIEW",
        resource: "Member",
        createdAt: { gte: since },
        user: { clinicId, role: "CARE_COORDINATOR" },
      },
      select: { userId: true, memberId: true, createdAt: true },
    }),
    db.auditLog.findMany({
      where: { action: "LOGIN_FAILED", createdAt: { gte: since }, user: { clinicId } },
      select: { userId: true, createdAt: true, user: { select: { id: true, name: true, email: true, lockedUntil: true } } },
    }),
  ]);

  const coordinatorById = new Map(coordinators.map((c) => [c.id, c]));

  // userId -> day -> Set<memberId>, split into in-caseload / out-of-caseload
  const inCaseloadByDay = new Map<string, Map<string, Set<string>>>();
  const outOfCaseloadByDay = new Map<string, Map<string, Set<string>>>();

  for (const log of viewLogs) {
    if (!log.userId || !log.memberId) continue;
    const coordinator = coordinatorById.get(log.userId);
    if (!coordinator) continue;
    const inCaseload = coordinator.assignedMembers.some((m) => m.id === log.memberId);
    const bucket = inCaseload ? inCaseloadByDay : outOfCaseloadByDay;
    const day = dayKey(log.createdAt);
    let byDay = bucket.get(log.userId);
    if (!byDay) {
      byDay = new Map();
      bucket.set(log.userId, byDay);
    }
    let set = byDay.get(day);
    if (!set) {
      set = new Set();
      byDay.set(day, set);
    }
    set.add(log.memberId);
  }

  const bulkAccessAlerts: BulkAccessAlert[] = [];
  const outOfCaseloadAlerts: OutOfCaseloadAlert[] = [];

  for (const coordinator of coordinators) {
    const caseloadSize = coordinator.assignedMembers.length;
    const threshold = caseloadSize + BULK_ACCESS_BUFFER;

    const inDays = inCaseloadByDay.get(coordinator.id) ?? new Map();
    const outDays = outOfCaseloadByDay.get(coordinator.id) ?? new Map();
    const allDays = new Set([...inDays.keys(), ...outDays.keys()]);

    for (const day of allDays) {
      const totalDistinct = (inDays.get(day)?.size ?? 0) + (outDays.get(day)?.size ?? 0);
      if (totalDistinct > threshold) {
        bulkAccessAlerts.push({ userId: coordinator.id, userName: coordinator.name, day, distinctPatients: totalDistinct, caseloadSize });
      }
      const outsideCount = outDays.get(day)?.size ?? 0;
      if (outsideCount > OUT_OF_CASELOAD_THRESHOLD) {
        outOfCaseloadAlerts.push({ userId: coordinator.id, userName: coordinator.name, day, distinctOutsidePatients: outsideCount });
      }
    }
  }

  bulkAccessAlerts.sort((a, b) => b.day.localeCompare(a.day) || b.distinctPatients - a.distinctPatients);
  outOfCaseloadAlerts.sort((a, b) => b.day.localeCompare(a.day) || b.distinctOutsidePatients - a.distinctOutsidePatients);

  // userId -> day -> count, plus each user's current lock state
  const failedByUserDay = new Map<string, Map<string, number>>();
  const userMeta = new Map<string, { name: string; email: string; lockedUntil: Date | null }>();
  for (const log of failedLogins) {
    if (!log.userId || !log.user) continue;
    userMeta.set(log.userId, { name: log.user.name, email: log.user.email, lockedUntil: log.user.lockedUntil });
    const day = dayKey(log.createdAt);
    let byDay = failedByUserDay.get(log.userId);
    if (!byDay) {
      byDay = new Map();
      failedByUserDay.set(log.userId, byDay);
    }
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }

  const failedLoginAlerts: FailedLoginAlert[] = [];
  const now = new Date();
  for (const [userId, byDay] of failedByUserDay) {
    const meta = userMeta.get(userId)!;
    for (const [day, count] of byDay) {
      if (count >= FAILED_LOGIN_THRESHOLD) {
        failedLoginAlerts.push({
          userId,
          userName: meta.name,
          email: meta.email,
          day,
          count,
          currentlyLocked: Boolean(meta.lockedUntil && meta.lockedUntil > now),
        });
      }
    }
  }
  failedLoginAlerts.sort((a, b) => b.day.localeCompare(a.day) || b.count - a.count);

  return { bulkAccessAlerts, outOfCaseloadAlerts, failedLoginAlerts, lookbackDays: LOOKBACK_DAYS };
}
