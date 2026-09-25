import { describe, expect, it } from "vitest";
import { isPdfFilename, sanitizePdfFilename } from "../uploads";

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
