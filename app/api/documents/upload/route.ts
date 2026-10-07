import { NextResponse } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";
import { authorizeMemberAccess } from "@/lib/dal";
import { resolveUploadKind, uploadKindSpec, randomStorageKey } from "@/lib/uploads";

// Issues a presigned S3 POST policy so the browser can upload straight to
// the private documents bucket (bypasses the serverless function body size
// limit, which matters for scanned multi-page PDFs) without the file ever
// passing through this server. The bucket itself has all public access
// blocked (infra/s3.tf) — the presigned POST is the only way in, and it's
// scoped to one key, one content type, and a size ceiling, expiring in 5
// minutes. Viewing documents afterward goes through /api/documents/[id],
// never a direct bucket URL.
export async function POST(request: Request) {
  const { memberId, fileName } = (await request.json()) as { memberId?: string; fileName?: string };

  if (!memberId || !fileName) {
    return NextResponse.json({ error: "Missing memberId or fileName" }, { status: 400 });
  }
  const kind = resolveUploadKind(fileName);
  if (!kind) {
    return NextResponse.json({ error: "Only PDF, PNG, or JPEG files can be uploaded." }, { status: 400 });
  }

  const { session, member } = await authorizeMemberAccess(memberId);
  if (!member) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // proxy.ts's MFA-enrollment redirect never runs for /api routes — see
  // app/api/documents/[id]/route.ts's matching comment.
  if (!session.mfaEnabled) {
    return NextResponse.json({ error: "MFA setup required" }, { status: 403 });
  }

  // A purely random key — see lib/uploads.ts's randomStorageKey — the
  // caller's original filename never flows into the storage path.
  const key = randomStorageKey(memberId, kind);
  const { mimeType, maxSizeBytes } = uploadKindSpec(kind);

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: DOCUMENTS_BUCKET,
      Key: key,
      Conditions: [["content-length-range", 1, maxSizeBytes], ["eq", "$Content-Type", mimeType]],
      Fields: { "Content-Type": mimeType },
      Expires: 300,
    });

    return NextResponse.json({ url, fields, key });
  } catch {
    return NextResponse.json({ error: "Could not prepare upload." }, { status: 400 });
  }
}
