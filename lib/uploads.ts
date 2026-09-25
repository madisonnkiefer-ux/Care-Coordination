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
