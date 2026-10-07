import "server-only";
import { randomUUID } from "crypto";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, DOCUMENTS_BUCKET } from "@/lib/s3";

// The app's two file-upload paths (member Documents, Resource Directory
// attachments) share this allowlist. Each kind pairs a canonical extension,
// the MIME type forced onto the presigned POST (never the caller's
// declared Content-Type — see the upload routes), a maxSizeBytes ceiling,
// and the real byte signature(s) its files start with. The signature check
// (verifyUploadedFile) is the actual security boundary — filename and
// declared Content-Type are both caller-controlled and prove nothing about
// what bytes actually land in the bucket (BreachLock 3.1.4); everything
// else here (extension allowlist, forced Content-Type, random storage
// keys, nosniff on retrieval) is defense in depth around that boundary
// (BreachLock 3.1.1, 3.1.2).
export type UploadKind = "PDF" | "PNG" | "JPEG";

type KindSpec = {
  extensions: string[]; // lowercase, no leading dot; first is canonical
  mimeType: string;
  maxSizeBytes: number;
  signatures: number[][];
};

const KIND_SPECS: Record<UploadKind, KindSpec> = {
  PDF: {
    extensions: ["pdf"],
    mimeType: "application/pdf",
    maxSizeBytes: 25 * 1024 * 1024,
    signatures: [[0x25, 0x50, 0x44, 0x46, 0x2d]], // %PDF-
  },
  PNG: {
    extensions: ["png"],
    mimeType: "image/png",
    maxSizeBytes: 10 * 1024 * 1024,
    signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  JPEG: {
    extensions: ["jpg", "jpeg"],
    mimeType: "image/jpeg",
    maxSizeBytes: 10 * 1024 * 1024,
    signatures: [[0xff, 0xd8, 0xff]],
  },
};

const EXTENSION_TO_KIND: Record<string, UploadKind> = Object.fromEntries(
  (Object.entries(KIND_SPECS) as [UploadKind, KindSpec][]).flatMap(([kind, spec]) =>
    spec.extensions.map((ext) => [ext, kind])
  )
);

export function uploadKindSpec(kind: UploadKind): { mimeType: string; maxSizeBytes: number } {
  const { mimeType, maxSizeBytes } = KIND_SPECS[kind];
  return { mimeType, maxSizeBytes };
}

// Exactly one "." is required — the simplest rule that fully closes every
// double-extension trick (shell.php.pdf, invoice.svg.pdf, report.exe.png)
// without maintaining a blocklist of "dangerous" extensions that could
// always miss one. Legitimate multi-word names still work fine; the
// original filename is only ever used for display anyway (see
// sanitizeUploadFilename) — the storage key is always a random UUID.
const SAFE_FILENAME = /^[^.]+\.([a-zA-Z0-9]+)$/;

// Resolves a caller-supplied filename to an allowed upload kind, or null if
// it's not recognized, has more than one extension, or isn't on the
// allowlist at all (including every extension this app doesn't accept —
// .svg, .html, .exe, .php, .js, etc.).
export function resolveUploadKind(fileName: string): UploadKind | null {
  const match = SAFE_FILENAME.exec(fileName.trim());
  if (!match) return null;
  return EXTENSION_TO_KIND[match[1].toLowerCase()] ?? null;
}

export function contentTypeForKind(kind: UploadKind): string {
  return KIND_SPECS[kind].mimeType;
}

// Infers a kind from a storage key this app generated itself (always
// "<prefix>/<uuid>.<ext>" — see randomStorageKey) — used only as a
// last-resort Content-Type fallback when serving a file back and S3
// didn't return stored object metadata.
export function kindForStorageKey(key: string): UploadKind | null {
  const ext = key.split(".").pop()?.toLowerCase();
  return ext ? (EXTENSION_TO_KIND[ext] ?? null) : null;
}

// A purely random storage key — the caller's original filename never flows
// into where the file is actually stored, only into the display name kept
// separately in the database (sanitizeUploadFilename).
export function randomStorageKey(prefix: string, kind: UploadKind): string {
  return `${prefix}/${randomUUID()}.${KIND_SPECS[kind].extensions[0]}`;
}

// Keeps only the text before the caller's first dot for display, then
// appends the canonical extension for the verified kind — "invoice.PDF"
// displays as "invoice.pdf"; nothing else about the original name (real or
// fake extensions) survives.
export function sanitizeUploadFilename(fileName: string, kind: UploadKind): string {
  const base = fileName.trim().split(".")[0].trim();
  return `${base || "file"}.${KIND_SPECS[kind].extensions[0]}`;
}

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

// Fetches the first few bytes of the object actually stored at `key` and
// checks them against the real signature for `kind` — independent of the
// key's extension, the object's declared Content-Type, or anything else a
// caller controls. A mismatch (wrong kind, spoofed MIME, corrupt/truncated
// upload) deletes the object outright: a bad upload never lingers in the
// bucket even though the save action it was headed for will now reject it.
export async function verifyUploadedFile(key: string, kind: UploadKind): Promise<boolean> {
  const { signatures } = KIND_SPECS[kind];
  const maxLen = Math.max(...signatures.map((s) => s.length));

  let matches: boolean;
  try {
    const obj = await s3.send(new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key, Range: `bytes=0-${maxLen - 1}` }));
    const bytes = await obj.Body?.transformToByteArray();
    matches = bytes ? signatures.some((sig) => bytesStartWith(bytes, sig)) : false;
  } catch {
    matches = false;
  }

  if (!matches) {
    await s3.send(new DeleteObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key })).catch(() => {});
  }

  return matches;
}
