import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { verifySession, authorizeMemberAccess } from "@/lib/dal";
import { writeAuditLog } from "@/lib/audit";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";

// Every document view goes through here — never a direct bucket URL — so
// access is checked and audit-logged on every open, not just on upload.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  // proxy.ts's MFA-enrollment redirect never runs for /api routes (its
  // matcher explicitly excludes them), so this route needs its own check —
  // otherwise a session that authenticated with a password but hasn't
  // finished MFA setup could still pull PHI documents directly.
  if (!session.mfaEnabled) return new NextResponse("MFA setup required", { status: 403 });
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  // Both "no such document" and "exists but belongs to another clinic"
  // return the same 404 — a distinct 403 here would let a caller enumerate
  // which document IDs are real across other clinics.
  if (!document) return new NextResponse("Not found", { status: 404 });

  const { member } = await authorizeMemberAccess(document.memberId);
  if (!member) return new NextResponse("Not found", { status: 404 });

  await writeAuditLog({
    userId: session.userId,
    memberId: document.memberId,
    action: "VIEW",
    resource: "Document",
    resourceId: document.id,
  });

  const object = await s3.send(new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: document.storageKey }));
  if (!object.Body) return new NextResponse("Unable to retrieve document", { status: 502 });

  return new NextResponse(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": object.ContentType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${document.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      // The upload's declared Content-Type isn't verified against the
      // file's actual bytes — this stops a browser from content-sniffing
      // a mislabeled upload and rendering it as something other than the
      // declared type on this same-origin PHI page.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
