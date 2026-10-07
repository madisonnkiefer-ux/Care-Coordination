import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const sendMock = vi.fn();
vi.mock("@/lib/s3", () => ({
  s3: { send: (command: unknown) => sendMock(command) },
  DOCUMENTS_BUCKET: "test-bucket",
}));

const {
  resolveUploadKind,
  uploadKindSpec,
  contentTypeForKind,
  kindForStorageKey,
  randomStorageKey,
  sanitizeUploadFilename,
  verifyUploadedFile,
} = await import("../uploads");

function bodyOf(bytes: number[] | string) {
  const arr = typeof bytes === "string" ? new TextEncoder().encode(bytes) : new Uint8Array(bytes);
  return { transformToByteArray: async () => arr };
}

const PDF_BYTES = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]; // "%PDF-1.4"
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00];
const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];

describe("resolveUploadKind", () => {
  it("accepts every allowed extension, case-insensitively", () => {
    expect(resolveUploadKind("report.pdf")).toBe("PDF");
    expect(resolveUploadKind("REPORT.PDF")).toBe("PDF");
    expect(resolveUploadKind("photo.png")).toBe("PNG");
    expect(resolveUploadKind("photo.PNG")).toBe("PNG");
    expect(resolveUploadKind("scan.jpg")).toBe("JPEG");
    expect(resolveUploadKind("scan.jpeg")).toBe("JPEG");
    expect(resolveUploadKind("scan.JPG")).toBe("JPEG");
  });

  it("rejects file types outside the allowlist", () => {
    expect(resolveUploadKind("image.svg")).toBeNull();
    expect(resolveUploadKind("page.html")).toBeNull();
    expect(resolveUploadKind("doc.docx")).toBeNull();
    expect(resolveUploadKind("malware.exe")).toBeNull();
    expect(resolveUploadKind("script.php")).toBeNull();
    expect(resolveUploadKind("script.js")).toBeNull();
    expect(resolveUploadKind("archive.zip")).toBeNull();
    expect(resolveUploadKind("noextension")).toBeNull();
  });

  it("rejects double extensions, regardless of which half looks legitimate", () => {
    expect(resolveUploadKind("shell.php.png")).toBeNull();
    expect(resolveUploadKind("invoice.svg.pdf")).toBeNull();
    expect(resolveUploadKind("report.exe.jpg")).toBeNull();
    expect(resolveUploadKind("photo.pdf.png")).toBeNull();
    expect(resolveUploadKind("a.b.c.pdf")).toBeNull();
  });
});

describe("uploadKindSpec / contentTypeForKind", () => {
  it("returns the canonical MIME type and a size ceiling for each kind", () => {
    expect(uploadKindSpec("PDF").mimeType).toBe("application/pdf");
    expect(uploadKindSpec("PNG").mimeType).toBe("image/png");
    expect(uploadKindSpec("JPEG").mimeType).toBe("image/jpeg");
    expect(uploadKindSpec("PDF").maxSizeBytes).toBeGreaterThan(0);
    expect(contentTypeForKind("PNG")).toBe("image/png");
  });
});

describe("kindForStorageKey", () => {
  it("infers the kind from a key this app generated", () => {
    expect(kindForStorageKey("member1/abc-123.pdf")).toBe("PDF");
    expect(kindForStorageKey("resources/clinic1/abc-123.png")).toBe("PNG");
    expect(kindForStorageKey("member1/abc-123.jpeg")).toBe("JPEG");
  });

  it("returns null for an unrecognized extension", () => {
    expect(kindForStorageKey("member1/abc-123.svg")).toBeNull();
    expect(kindForStorageKey("member1/abc-123")).toBeNull();
  });
});

describe("randomStorageKey", () => {
  it("never includes anything caller-supplied — just the prefix, a random id, and the canonical extension", () => {
    const key = randomStorageKey("member1", "PDF");
    expect(key).toMatch(/^member1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("uses the canonical extension for a kind with multiple accepted spellings", () => {
    expect(randomStorageKey("member1", "JPEG")).toMatch(/\.jpg$/);
  });

  it("produces a different key on every call", () => {
    expect(randomStorageKey("member1", "PDF")).not.toBe(randomStorageKey("member1", "PDF"));
  });
});

describe("sanitizeUploadFilename", () => {
  it("keeps a clean name as-is aside from normalizing the extension", () => {
    expect(sanitizeUploadFilename("invoice.pdf", "PDF")).toBe("invoice.pdf");
    expect(sanitizeUploadFilename("INVOICE.PDF", "PDF")).toBe("INVOICE.pdf");
  });

  it("strips every extension a caller supplied, real or fake, down to the verified kind's canonical one", () => {
    expect(sanitizeUploadFilename("invoice.svg", "PDF")).toBe("invoice.pdf");
    expect(sanitizeUploadFilename("shell.svg.pdf", "PDF")).toBe("shell.pdf");
    expect(sanitizeUploadFilename("photo.exe.png", "PNG")).toBe("photo.png");
  });

  it("falls back to a generic name if nothing usable precedes the first dot", () => {
    expect(sanitizeUploadFilename(".pdf", "PDF")).toBe("file.pdf");
    expect(sanitizeUploadFilename("", "PDF")).toBe("file.pdf");
  });
});

// Regression tests for real pentest findings:
//   - BreachLock 3.1.4: a presigned POST's Content-Type condition only
//     checks what the uploader *declared*, never what actually landed in
//     the bucket.
//   - BreachLock 3.1.1: an SVG (or any other mislabeled file) uploaded
//     under an accepted extension must still be caught by its real bytes,
//     not its name or declared Content-Type.
// These confirm the object's real bytes are checked against the kind the
// server resolved, independent of filename or declared Content-Type.
describe("verifyUploadedFile", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("accepts a genuinely matching PDF", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf(PDF_BYTES) };
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/real.pdf", "PDF")).resolves.toBe(true);
  });

  it("accepts a genuinely matching PNG", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf(PNG_BYTES) };
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/real.png", "PNG")).resolves.toBe(true);
  });

  it("accepts a genuinely matching JPEG", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf(JPEG_BYTES) };
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/real.jpg", "JPEG")).resolves.toBe(true);
  });

  it("rejects and deletes an SVG/HTML payload uploaded under a .pdf key (the 3.1.1 finding)", async () => {
    let deletedKey: string | undefined;
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf("<svg onload=alert(1)>") };
      if (command instanceof DeleteObjectCommand) {
        deletedKey = (command as { input: { Key?: string } }).input.Key;
        return {};
      }
      throw new Error("unexpected command");
    });

    await expect(verifyUploadedFile("member1/fake.pdf", "PDF")).resolves.toBe(false);
    expect(deletedKey).toBe("member1/fake.pdf");
  });

  it("rejects and deletes a real PDF uploaded under a .png key — MIME/extension spoofing", async () => {
    let deletedKey: string | undefined;
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf(PDF_BYTES) };
      if (command instanceof DeleteObjectCommand) {
        deletedKey = (command as { input: { Key?: string } }).input.Key;
        return {};
      }
      throw new Error("unexpected command");
    });

    await expect(verifyUploadedFile("member1/fake.png", "PNG")).resolves.toBe(false);
    expect(deletedKey).toBe("member1/fake.png");
  });

  it("rejects a truncated/malformed file with fewer bytes than the signature itself", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf([0x89, 0x50]) }; // truncated PNG signature
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/truncated.png", "PNG")).resolves.toBe(false);
  });

  it("rejects an empty file", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf([]) };
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/empty.pdf", "PDF")).resolves.toBe(false);
  });

  it("returns false if the object can't be fetched at all", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) throw new Error("NoSuchKey");
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error("unexpected command");
    });
    await expect(verifyUploadedFile("member1/missing.pdf", "PDF")).resolves.toBe(false);
  });
});
