import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { db } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";

// Serves a resource's attached PDF — never a direct bucket URL, same
// authenticated-proxy pattern as /api/documents/[id]. Resources aren't
// member-scoped, so the only check is that the resource belongs to the
// caller's own clinic; not audit-logged, since ResourceEntry is
// non-PHI reference material (referral programs, crisis lines), not a
// patient record.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  // proxy.ts's MFA-enrollment redirect never runs for /api routes — see
  // app/api/documents/[id]/route.ts's matching comment.
  if (!session.mfaEnabled) return new NextResponse("MFA setup required", { status: 403 });
  const { id } = await params;

  const resource = await db.resourceEntry.findUnique({ where: { id } });
  if (!resource || resource.clinicId !== session.clinicId) return new NextResponse("Not found", { status: 404 });
  if (!resource.documentKey) return new NextResponse("No document attached", { status: 404 });

  const object = await s3.send(new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: resource.documentKey }));
  if (!object.Body) return new NextResponse("Unable to retrieve document", { status: 502 });

  return new NextResponse(object.Body.transformToWebStream(), {
    headers: {
      "Content-Type": object.ContentType ?? "application/pdf",
      "Content-Disposition": `inline; filename="${(resource.documentName ?? "resource.pdf").replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
