import { describe, expect, it } from "vitest";
import { nameField } from "../validation";

describe("nameField", () => {
  const schema = nameField("Name is required.");

  it("accepts an ordinary human name", () => {
    expect(schema.safeParse("Mary-Jane O'Brien").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(schema.safeParse("").success).toBe(false);
  });

  // Regression test for a real pentest finding (BreachLock 3.1.3): the Add
  // User form's name field accepted "<h1>HTML</h1>" unvalidated server-side.
  it("rejects HTML-tag-shaped input", () => {
    expect(schema.safeParse("<h1>HTML</h1>").success).toBe(false);
    expect(schema.safeParse("<script>alert(1)</script>").success).toBe(false);
  });
});
