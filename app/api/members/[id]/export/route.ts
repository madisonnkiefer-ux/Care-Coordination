import { requireRole } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { getFullMemberRecordForExport } from "@/lib/data/record-export";

// HIPAA right-to-access fulfillment (45 CFR §164.524): a complete export of
// a member's designated record set, for release to the patient or their
// representative. Restricted to supervisor/admin since it's a formal
// disclosure, not routine chart access — and every call here is itself
// logged as an EXPORT audit event, which is the accounting-of-disclosures
// trail for these releases (see Settings > Patient Rights).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("SUPERVISOR", "ADMIN");

  const record = await getFullMemberRecordForExport(id);
  if (!record) return new Response("Not found", { status: 404 });

  await writeAuditLog({
    userId: session.userId,
    memberId: id,
    action: "EXPORT",
    resource: "MemberRecordExport",
    metadata: { reason: "right_to_access_request" },
  });

  const filename = `${record.lastName}-${record.firstName}-record-export-${new Date().toISOString().slice(0, 10)}.json`
    .replace(/\s+/g, "-")
    .toLowerCase();

  return new Response(JSON.stringify(record, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
