import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getIntakeFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const versions = await db.intakeVersion.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: {
      demographics: true,
      hra: true,
      cna: true,
      note: true,
      signedBy: { select: { name: true } },
    },
  });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "IntakeVersion", resourceId: memberId });

  return { member, versions };
}

// Lightweight summary (no field-level data) for the member page's "Charts"
// list — just enough to render a dated, clickable history of past charts.
export async function getChartHistorySummary(memberId: string) {
  return db.intakeVersion.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      signedAt: true,
      demographics: { select: { status: true } },
      hra: { select: { status: true } },
      cna: { select: { status: true } },
      note: { select: { status: true } },
    },
  });
}
