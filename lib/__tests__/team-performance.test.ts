import { describe, expect, it } from "vitest";
import { computeCoordinatorRow, computeFunnel, computeTrend, monthBounds, trailingMonths, type PerformanceMember } from "../team-performance";

const { monthStart, monthEnd } = monthBounds("2026-07");
const now = new Date("2026-07-20");

let nextMemberId = 0;

function memberWithContacts(successfulCount: number, unsuccessfulCount: number, extra?: Partial<PerformanceMember>): PerformanceMember {
  const contacts = [
    ...Array.from({ length: successfulCount }, (_, i) => ({ createdAt: new Date(2026, 6, 1 + i), successful: true })),
    ...Array.from({ length: unsuccessfulCount }, (_, i) => ({ createdAt: new Date(2026, 6, 15 + i), successful: false })),
  ];
  nextMemberId += 1;
  return {
    id: `member-${nextMemberId}`,
    name: `Member ${nextMemberId}`,
    status: "ACTIVE",
    program: "Prenatal",
    enrollmentDate: new Date(2026, 0, 1),
    contacts,
    cnaCompletions: [],
    lastCnaDate: new Date(2026, 0, 1),
    ...extra,
  };
}

describe("computeCoordinatorRow — July validation example", () => {
  // Supervisor-provided July report, used as a ground-truth check that the
  // new report's math matches the existing reporting methodology:
  //   CC        Members  Successful  %    Attempts  CNAs Done  CNAs Due
  //   Ambar     70       41          58%  69        1          4
  //   Julia     38       29          76%  18        0          3
  //   Madeline  73       52          71%  46        5          11
  //   Maryn     76       39          51%  73        3          14
  //   Samantha  47       29          61%  25        5          12
  //   Sofie     29       19          65%  23        0          0
  //   Valerie   75       38          50%  53        3          11
  //   Total     408      247         Avg 62%  307   17         55
  const julyExample = [
    { name: "Ambar", members: 70, successful: 41, pct: 58, attempts: 69, cnasDone: 1, cnasDue: 4 },
    { name: "Julia", members: 38, successful: 29, pct: 76, attempts: 18, cnasDone: 0, cnasDue: 3 },
    { name: "Madeline", members: 73, successful: 52, pct: 71, attempts: 46, cnasDone: 5, cnasDue: 11 },
    { name: "Maryn", members: 76, successful: 39, pct: 51, attempts: 73, cnasDone: 3, cnasDue: 14 },
    { name: "Samantha", members: 47, successful: 29, pct: 61, attempts: 25, cnasDone: 5, cnasDue: 12 },
    { name: "Sofie", members: 29, successful: 19, pct: 65, attempts: 23, cnasDone: 0, cnasDue: 0 },
    { name: "Valerie", members: 75, successful: 38, pct: 50, attempts: 53, cnasDone: 3, cnasDue: 11 },
  ];

  it.each(julyExample)("$name: % Successful Touchpoints is floored, matching the July figure", ({ name, members, successful, pct }) => {
    // Build a synthetic caseload with exactly `successful` members having a
    // successful contact this month, and the rest with none — the row's
    // successRate only depends on successfulTouchpoints/members, so the
    // exact attempts/CNA figures here don't need to reproduce the real data.
    const caseload: PerformanceMember[] = [
      ...Array.from({ length: successful }, () => memberWithContacts(1, 0)),
      ...Array.from({ length: members - successful }, () => memberWithContacts(0, 0)),
    ];
    const row = computeCoordinatorRow(name, name, caseload, monthStart, monthEnd, now);
    expect(row.members).toBe(members);
    expect(row.successfulTouchpoints).toBe(successful);
    expect(row.successRate).toBe(pct);
  });

  it("team total: overall % is the ROUND of the average of each coordinator's floored %, not weighted by caseload", () => {
    const pcts = julyExample.map((r) => r.pct);
    const average = pcts.reduce((s, p) => s + p, 0) / pcts.length;
    expect(Math.round(average)).toBe(62);
  });

  it("Total Attempts counts only successful === false contacts in the month, excluding successful ones", () => {
    const caseload = [memberWithContacts(2, 5)];
    const row = computeCoordinatorRow("c", "C", caseload, monthStart, monthEnd, now);
    expect(row.successfulTouchpoints).toBe(1); // one member, counted once regardless of how many successful contacts
    expect(row.totalAttempts).toBe(5);
  });

  it("CNAs Still Due reflects `now`, not the reporting month, and reports which members", () => {
    const overdue = memberWithContacts(0, 0, { id: "overdue", name: "Overdue", lastCnaDate: new Date(2024, 0, 1) }); // >1yr before `now`
    const current = memberWithContacts(0, 0, { id: "current", name: "Current", lastCnaDate: new Date(2026, 6, 1) }); // within the last year
    const neverDone = memberWithContacts(0, 0, { id: "never", name: "Never", lastCnaDate: null });
    const row = computeCoordinatorRow("c", "C", [overdue, current, neverDone], monthStart, monthEnd, now);
    expect(row.cnasStillDue).toBe(2);
    expect(row.cnasStillDueMembers.map((m) => m.id).sort()).toEqual(["never", "overdue"]);
  });

  it("ignores inactive members entirely", () => {
    const active = memberWithContacts(1, 1);
    const inactive = memberWithContacts(1, 1, { status: "TERMED" });
    const row = computeCoordinatorRow("c", "C", [active, inactive], monthStart, monthEnd, now);
    expect(row.members).toBe(1);
  });
});

describe("computeFunnel — worked example from the spec", () => {
  // 74 members require outreach → 1st: 71 attempts, 36 successful, 38 remain.
  // 2nd: 38 required, 32 attempts, 10 successful, 28 remain.
  // 3rd: 28 required, 3 attempts, 2 successful, 26 remain without contact.
  // Derived from the worked example's aggregate numbers alone (required/
  // attemptsMade/successful/notAttempted at each stage), by solving for how
  // many members must fall into each attempt-history bucket:
  //   Stage 1: 74 required, 71 attempted, 36 successful, 3 never attempted.
  //   Stage 2: 38 required (74-36), 32 attempted, 10 successful, 6 not
  //            attempted (= the 3 from stage 1 who are still never-attempted,
  //            plus 3 more who got exactly 1 failed attempt and no 2nd).
  //   Stage 3: 28 required (38-10), 3 attempted, 2 successful, 25 not
  //            attempted (= 3 never-attempted + 3 stalled-after-1 + 19 who
  //            got exactly 2 failed attempts and no 3rd).
  // That leaves 1 member with 3 failed attempts (3 attempted - 2 successful).
  // Bucket sizes: 36 succeed@1, 3 never attempted, 3 stall-after-1-fail,
  // 10 succeed@2, 19 stall-after-2-fails, 2 succeed@3, 1 fail-all-3 = 74.
  function buildPopulation() {
    const members: PerformanceMember[] = [];
    const push = (n: number, results: (boolean | null)[]) => {
      for (let i = 0; i < n; i++) {
        members.push(
          memberWithContacts(0, 0, {
            contacts: results.map((successful, idx) => ({ createdAt: new Date(2026, 6, 1 + idx * 3), successful })),
          })
        );
      }
    };
    push(36, [true]);
    push(3, []);
    push(3, [false]);
    push(10, [false, true]);
    push(19, [false, false]);
    push(2, [false, false, true]);
    push(1, [false, false, false]);
    return members;
  }

  it("matches every figure in the worked example", () => {
    const population = buildPopulation();
    expect(population).toHaveLength(74);

    const funnel = computeFunnel(population, monthStart, monthEnd);

    expect(funnel[0]).toMatchObject({ required: 74, attemptsMade: 71, successful: 36, notAttempted: 3 });
    expect(funnel[0].percentCompleted).toBeCloseTo(95.9, 1);
    expect(funnel[0].percentNotAttempted).toBeCloseTo(4.1, 1);

    expect(funnel[1]).toMatchObject({ required: 38, attemptsMade: 32, successful: 10, notAttempted: 6 });
    expect(funnel[1].percentCompleted).toBeCloseTo(84.2, 1);
    expect(funnel[1].percentNotAttempted).toBeCloseTo(15.8, 1);

    expect(funnel[2]).toMatchObject({ required: 28, attemptsMade: 3, successful: 2, notAttempted: 25 });
    expect(funnel[2].percentCompleted).toBeCloseTo(10.7, 1);
    expect(funnel[2].percentNotAttempted).toBeCloseTo(89.3, 1);
  });

  it("a member already compliant BEFORE the month started never enters the funnel", () => {
    // A GYN member (quarterly cadence) with a successful contact earlier in
    // their current anchored quarter shouldn't need any outreach this month.
    const compliant = memberWithContacts(0, 0, {
      program: "GYN",
      enrollmentDate: new Date(2026, 5, 1),
      contacts: [{ createdAt: new Date(2026, 5, 15), successful: true }], // June, before the July month under test
    });
    const funnel = computeFunnel([compliant], monthStart, monthEnd);
    expect(funnel[0].required).toBe(0);
  });

  it("a member who succeeds on their very first attempt of the month still appears, resolved at stage 1", () => {
    const succeedsImmediately = memberWithContacts(0, 0, {
      contacts: [{ createdAt: new Date(2026, 6, 5), successful: true }],
    });
    const funnel = computeFunnel([succeedsImmediately], monthStart, monthEnd);
    expect(funnel[0]).toMatchObject({ required: 1, attemptsMade: 1, successful: 1, notAttempted: 0 });
    expect(funnel[1].required).toBe(0);
  });

  it("a non-compliant member with zero contacts this month is 'not attempted' at every stage", () => {
    const neverContacted = memberWithContacts(0, 0, { id: "never-contacted", name: "Never Contacted", contacts: [] });
    const funnel = computeFunnel([neverContacted], monthStart, monthEnd);
    expect(funnel[0]).toMatchObject({ required: 1, attemptsMade: 0, notAttempted: 1 });
    expect(funnel[1]).toMatchObject({ required: 1, attemptsMade: 0, notAttempted: 1 });
    expect(funnel[2]).toMatchObject({ required: 1, attemptsMade: 0, notAttempted: 1 });
    expect(funnel[0].requiredMembers).toEqual([{ id: "never-contacted", name: "Never Contacted" }]);
    expect(funnel[0].notAttemptedMembers).toEqual([{ id: "never-contacted", name: "Never Contacted" }]);
  });

  it("requiredMembers shrinks by exactly the members who succeeded, notAttemptedMembers only lists who's missing an attempt", () => {
    const succeeds1st = memberWithContacts(0, 0, { id: "a", name: "A", contacts: [{ createdAt: new Date(2026, 6, 2), successful: true }] });
    const succeeds2nd = memberWithContacts(0, 0, {
      id: "b",
      name: "B",
      contacts: [
        { createdAt: new Date(2026, 6, 2), successful: false },
        { createdAt: new Date(2026, 6, 8), successful: true },
      ],
    });
    const stalls = memberWithContacts(0, 0, { id: "c", name: "C", contacts: [{ createdAt: new Date(2026, 6, 2), successful: false }] });
    const funnel = computeFunnel([succeeds1st, succeeds2nd, stalls], monthStart, monthEnd);

    expect(funnel[0].requiredMembers.map((m) => m.id).sort()).toEqual(["a", "b", "c"]);
    expect(funnel[0].notAttemptedMembers).toEqual([]);

    // a succeeded at stage 1 and drops out; b and c remain, but c never got a 2nd attempt.
    expect(funnel[1].requiredMembers.map((m) => m.id).sort()).toEqual(["b", "c"]);
    expect(funnel[1].notAttemptedMembers).toEqual([{ id: "c", name: "C" }]);

    // b succeeded at stage 2 and drops out; only c remains, still never attempted a 2nd/3rd time.
    expect(funnel[2].requiredMembers).toEqual([{ id: "c", name: "C" }]);
    expect(funnel[2].notAttemptedMembers).toEqual([{ id: "c", name: "C" }]);
  });
});

describe("trailingMonths", () => {
  it("returns n months ending at (and including) the given month, oldest first", () => {
    expect(trailingMonths("2026-07", 6)).toEqual(["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"]);
  });

  it("crosses a year boundary correctly", () => {
    expect(trailingMonths("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("computeTrend", () => {
  it("computes one row per month, scoping each month's contacts to that month's window", () => {
    const memberJulySuccess = memberWithContacts(0, 0, {
      id: "m1",
      name: "M1",
      contacts: [{ createdAt: new Date(2026, 6, 10), successful: true }], // July only
    });
    const points = computeTrend("c", "C", [memberJulySuccess], ["2026-06", "2026-07"], now);
    expect(points.map((p) => p.month)).toEqual(["2026-06", "2026-07"]);
    expect(points[0].row.successfulTouchpoints).toBe(0); // June: no contact yet
    expect(points[1].row.successfulTouchpoints).toBe(1); // July: the contact lands here
    expect(points[0].row.members).toBe(points[1].row.members); // caseload membership doesn't vary by month
  });
});
