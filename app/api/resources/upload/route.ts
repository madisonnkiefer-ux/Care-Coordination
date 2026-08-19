import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";
import { requirePermission } from "@/lib/dal";

// Same presigned-POST pattern as /api/documents/upload — the file goes
// straight from the browser to the private bucket, never through this
// server. Keyed under resources/<clinicId>/... instead of a memberId,
// since ResourceEntry isn't member-scoped.
const ALLOWED_CONTENT_TYPE = "application/pdf";
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await requirePermission("MANAGE_RESOURCES");
  const { fileName } = (await request.json()) as { fileName?: string };

  if (!fileName) {
    return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
  }

  const key = `resources/${session.clinicId}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: DOCUMENTS_BUCKET,
      Key: key,
      Conditions: [["content-length-range", 1, MAX_SIZE_BYTES], ["eq", "$Content-Type", ALLOWED_CONTENT_TYPE]],
      Fields: { "Content-Type": ALLOWED_CONTENT_TYPE },
      Expires: 300,
    });

    return NextResponse.json({ url, fields, key });
  } catch {
    return NextResponse.json({ error: "Could not prepare upload." }, { status: 400 });
  }
}
