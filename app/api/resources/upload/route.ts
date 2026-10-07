import { NextResponse } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";
import { requirePermission } from "@/lib/dal";
import { resolveUploadKind, uploadKindSpec, randomStorageKey } from "@/lib/uploads";

// Same presigned-POST pattern as /api/documents/upload — the file goes
// straight from the browser to the private bucket, never through this
// server. Keyed under resources/<clinicId>/... instead of a memberId,
// since ResourceEntry isn't member-scoped.
export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_RESOURCES");
  // proxy.ts's MFA-enrollment redirect never runs for /api routes — see
  // app/api/documents/[id]/route.ts's matching comment.
  if (!session.mfaEnabled) {
    return NextResponse.json({ error: "MFA setup required" }, { status: 403 });
  }
  const { fileName } = (await request.json()) as { fileName?: string };

  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
  }
  const kind = resolveUploadKind(fileName);
  if (!kind) {
    return NextResponse.json({ error: "Only PDF, PNG, or JPEG files can be uploaded." }, { status: 400 });
  }

  const key = randomStorageKey(`resources/${session.clinicId}`, kind);
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
