import "server-only";
import { db } from "@/lib/db";
import { authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

export async function getTocFormData(memberId: string) {
  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) return null;

  const records = await db.tocRecord.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    include: { signedBy: { select: { name: true } }, needs: true },
  });

  await writeAuditLog({ userId: session.userId, memberId, action: "VIEW", resource: "TocRecord", resourceId: memberId });

  return { member, records };
}

// Lightweight summary for the member page's "Charts" list — just enough to
// render a dated, clickable history of past TOC records.
export async function getTocHistorySummary(memberId: string) {
  return db.tocRecord.findMany({
    where: { memberId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, status: true, signedAt: true },
  });
}
