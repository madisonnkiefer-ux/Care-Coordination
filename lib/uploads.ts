import "server-only";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";

// The app's only two file-upload paths (member Documents, Resource
// Directory attachments) both accept PDFs only. The real security
// boundary is already the S3 presigned POST's own hard Content-Type
// condition (see app/api/documents/upload/route.ts and
// app/api/resources/upload/route.ts) plus the "X-Content-Type-Options:
// nosniff" header set when serving the file back (app/api/documents/[id]
// and app/api/resources/[id]) — together they mean whatever bytes a
// caller actually uploads, the file is always served as
// application/pdf with sniffing disabled, so a mislabeled upload (e.g.
// an SVG containing a script) can never get rendered as anything else.
//
// These two helpers close the remaining, purely cosmetic gap a pentest
// flagged (3.1.2): the caller-supplied *original filename* — which a
// server-side Content-Type lock does nothing to constrain — otherwise
// flows straight through into the stored/displayed name and the
// Content-Disposition header. A name like "invoice.svg" or a crafted
// double extension like "shell.svg.pdf" would still look exactly like
// what it claims not to be. isPdfFilename() rejects an upload outright
// if its name doesn't already look like a PDF; sanitizePdfFilename()
// then normalizes whatever survives down to a single, unambiguous
// "<name>.pdf" before it's ever persisted.
const PDF_EXTENSION = /\.pdf$/i;

export function isPdfFilename(fileName: string): boolean {
  return PDF_EXTENSION.test(fileName.trim());
}

// Keeps only the text before the FIRST dot, discarding every extension
// (real or fake) the caller supplied, then appends exactly one ".pdf" —
// "shell.svg.pdf" and "invoice.svg" both become "<name>.pdf".
export function sanitizePdfFilename(fileName: string): string {
  const base = fileName.trim().split(".")[0].trim();
  return `${base || "document"}.pdf`;
}

const PDF_MAGIC_BYTES = "%PDF-";

// Closes the actual gap a pentest flagged (3.1.4): the presigned POST's
// Content-Type condition only checks what the uploader *declared* in the
// multipart form, never the bytes that actually land in the bucket — a
// caller can upload anything (an .exe, a script, real malware) and just
// claim Content-Type: application/pdf, and S3 has no opinion on whether
// that's true. This fetches the first few bytes of the object actually
// stored at `key` and checks for the real PDF magic number. A mismatch
// deletes the object outright — a bad upload never lingers in the bucket
// even though the save action it was headed for will now reject it.
export async function verifyIsPdfObject(key: string): Promise<boolean> {
  let isPdf: boolean;
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key, Range: `bytes=0-${PDF_MAGIC_BYTES.length - 1}` })
    );
    const bytes = await obj.Body?.transformToByteArray();
    isPdf = bytes ? Buffer.from(bytes).toString("latin1").startsWith(PDF_MAGIC_BYTES) : false;
  } catch {
    isPdf = false;
  }

  if (!isPdf) {
    await s3.send(new DeleteObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key })).catch(() => {});
  }

  return isPdf;
}
