import { describe, expect, it } from "vitest";
import { zipRows } from "../form-rows";

// Regression test for a real bug: the CCP form has four repeatable-row
// sections (team members, medications, backup contacts, disaster
// contacts) inside one <form>, and several of them share field names
// ("name", "phone"). Without a prefix, formData.getAll("name") on save
// collected every section's inputs mixed together in DOM order, silently
// cross-wiring one section's values into another's rows.
describe("zipRows", () => {
  it("zips same-named fields within one prefixed section correctly", () => {
    const fd = new FormData();
    fd.append("teamMember.name", "Savannah Anderson");
    fd.append("teamMember.name", "Trevor Miller");
    fd.append("teamMember.phone", "575-914-2959");
    fd.append("teamMember.phone", "575-622-6322");

    const rows = zipRows(fd, ["name", "phone"] as const, "teamMember");
    expect(rows).toEqual([
      { name: "Savannah Anderson", phone: "575-914-2959" },
      { name: "Trevor Miller", phone: "575-622-6322" },
    ]);
  });

  it("does not cross-wire rows from a different section sharing the same field names", () => {
    const fd = new FormData();
    // Team members section
    fd.append("teamMember.name", "Savannah Anderson");
    fd.append("teamMember.phone", "575-914-2959");
    // Disaster contacts section — same field names, different prefix
    fd.append("disasterContact.name", "I C");
    fd.append("disasterContact.phone", "");

    const teamMembers = zipRows(fd, ["name", "phone"] as const, "teamMember");
    const disasterContacts = zipRows(fd, ["name", "phone"] as const, "disasterContact");

    expect(teamMembers).toEqual([{ name: "Savannah Anderson", phone: "575-914-2959" }]);
    expect(disasterContacts).toEqual([{ name: "I C", phone: null }]);
  });

  it("drops a row where every field is empty", () => {
    const fd = new FormData();
    fd.append("teamMember.name", "");
    fd.append("teamMember.phone", "");

    expect(zipRows(fd, ["name", "phone"] as const, "teamMember")).toEqual([]);
  });
});
