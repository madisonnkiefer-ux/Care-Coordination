import { describe, expect, it, vi, beforeEach } from "vitest";
import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const sendMock = vi.fn();
vi.mock("@/lib/s3", () => ({
  s3: { send: (command: unknown) => sendMock(command) },
  DOCUMENTS_BUCKET: "test-bucket",
}));

const { isPdfFilename, sanitizePdfFilename, verifyIsPdfObject } = await import("../uploads");

function bodyOf(text: string) {
  return { transformToByteArray: async () => new TextEncoder().encode(text) };
}

describe("isPdfFilename", () => {
  it("accepts a plain .pdf filename, case-insensitively", () => {
    expect(isPdfFilename("invoice.pdf")).toBe(true);
    expect(isPdfFilename("INVOICE.PDF")).toBe(true);
  });

  it("rejects anything not ending in .pdf, including a disguised double extension", () => {
    expect(isPdfFilename("invoice.svg")).toBe(false);
    expect(isPdfFilename("shell.php.png")).toBe(false);
    expect(isPdfFilename("invoice.pdf.svg")).toBe(false);
  });
});

describe("sanitizePdfFilename", () => {
  it("keeps a clean name as-is aside from normalizing the extension", () => {
    expect(sanitizePdfFilename("invoice.pdf")).toBe("invoice.pdf");
  });

  it("strips every extension a caller supplied, real or fake, down to one .pdf", () => {
    expect(sanitizePdfFilename("invoice.svg")).toBe("invoice.pdf");
    expect(sanitizePdfFilename("shell.svg.pdf")).toBe("shell.pdf");
    expect(sanitizePdfFilename("shell.php.png")).toBe("shell.pdf");
  });

  it("falls back to a generic name if nothing usable precedes the first dot", () => {
    expect(sanitizePdfFilename(".svg")).toBe("document.pdf");
    expect(sanitizePdfFilename("")).toBe("document.pdf");
  });
});

// Regression tests for a real pentest finding (BreachLock 3.1.4): a
// presigned POST's Content-Type condition only checks what the uploader
// declared, not what actually landed in the bucket — these confirm the
// object's real bytes are checked, independent of its name or declared
// Content-Type.
describe("verifyIsPdfObject", () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it("returns true when the stored object actually starts with the PDF magic bytes", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf("%PDF-1.4\n...") };
      throw new Error("unexpected command");
    });

    await expect(verifyIsPdfObject("member1/real.pdf")).resolves.toBe(true);
  });

  it("returns false and deletes the object when the bytes don't match, e.g. an SVG renamed to .pdf", async () => {
    let deletedKey: string | undefined;
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) return { Body: bodyOf("<svg onload=alert(1)>") };
      if (command instanceof DeleteObjectCommand) {
        deletedKey = (command as { input: { Key?: string } }).input.Key;
        return {};
      }
      throw new Error("unexpected command");
    });

    await expect(verifyIsPdfObject("member1/fake.pdf")).resolves.toBe(false);
    expect(deletedKey).toBe("member1/fake.pdf");
  });

  it("returns false if the object can't be fetched at all", async () => {
    sendMock.mockImplementation(async (command: unknown) => {
      if (command instanceof GetObjectCommand) throw new Error("NoSuchKey");
      if (command instanceof DeleteObjectCommand) return {};
      throw new Error("unexpected command");
    });

    await expect(verifyIsPdfObject("member1/missing.pdf")).resolves.toBe(false);
  });
});
