import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { formatDate } from "../format";

describe("formatDate", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // Regression test for a real bug: a coordinator in Mountain Time saw a
    // CNA's assessment date (a date-only field, stored as UTC midnight)
    // displayed a day early. Pin the process to a timezone behind UTC so
    // this reproduces without depending on the machine running the tests.
    process.env.TZ = "America/Denver";
  });

  afterAll(() => {
    process.env.TZ = originalTz;
  });

  it("displays a UTC-midnight calendar date as the same day, regardless of local timezone", () => {
    expect(formatDate(new Date("2026-09-25"))).toBe("09/25/2026");
    expect(formatDate("2026-09-25")).toBe("09/25/2026");
  });

  it("returns an em dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});
