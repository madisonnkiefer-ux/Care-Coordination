"use server";

import { verifySession } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";

// Bulk CSV exports (roster, caseload, outreach, CNA status, monthly
// dashboard) are generated entirely client-side from data the page already
// fetched via an audited server call — there's no server round trip at
// download time for writeAuditLog (server-only) to hook into. Every export
// button calls this first so the EXPORT still lands in the audit trail,
// same accounting-of-disclosures requirement PRINT logging already covers
// for single-record prints — see app/actions/print.ts.
export async function logBulkExport(resource: string, memberIds: string[]) {
  const session = await verifySession();

  await writeAuditLog({
    userId: session.userId,
    action: "EXPORT",
    resource,
    metadata: { memberIds, memberCount: memberIds.length },
  });
}
