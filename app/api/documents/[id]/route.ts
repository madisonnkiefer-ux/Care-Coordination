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
  const { id } = await params;

  const document = await db.document.findUnique({ where: { id } });
  if (!document) return new NextResponse("Not found", { status: 404 });

  const { member } = await authorizeMemberAccess(document.memberId);
  if (!member) return new NextResponse("Forbidden", { status: 403 });

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
    },
  });
}
