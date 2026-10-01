import { describe, expect, it } from "vitest";
import { assertNotStale, StaleWriteError } from "../concurrency";

function formDataWith(expectedUpdatedAt: string) {
  const fd = new FormData();
  fd.set("_expectedUpdatedAt", expectedUpdatedAt);
  return fd;
}

describe("assertNotStale", () => {
  it("allows the save when the expected timestamp matches the record's current updatedAt", () => {
    const now = new Date();
    expect(() => assertNotStale(formDataWith(String(now.getTime())), now)).not.toThrow();
  });

  it("throws StaleWriteError when someone else saved in between", () => {
    const loadedAt = new Date("2026-01-01T00:00:00Z");
    const savedBysomeoneElseAt = new Date("2026-01-01T00:05:00Z");
    expect(() => assertNotStale(formDataWith(String(loadedAt.getTime())), savedBysomeoneElseAt)).toThrow(
      StaleWriteError
    );
  });

  it("fails open (no throw) when the field is missing, e.g. a brand-new record", () => {
    const fd = new FormData();
    expect(() => assertNotStale(fd, new Date())).not.toThrow();
  });

  it("fails open on a malformed value rather than blocking a legitimate save", () => {
    expect(() => assertNotStale(formDataWith("not-a-number"), new Date())).not.toThrow();
  });
});
