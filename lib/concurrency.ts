import "server-only";

// Every save action here does a straight overwrite with no check that the
// record hasn't changed since the form was loaded — if two coordinators
// have the same chart open (covering a colleague, a supervisor reviewing),
// whoever saves second silently wins, destroying the first save with zero
// warning to either of them. This closes that gap: the form carries the
// record's updatedAt from when it was loaded, and the save action rejects
// if the record's current updatedAt no longer matches — meaning someone
// else saved in between.
export class StaleWriteError extends Error {
  constructor() {
    super(
      "Someone else saved changes to this record while you had it open. Reload the page to see the latest version, then reapply your changes."
    );
    this.name = "StaleWriteError";
  }
}

export function assertNotStale(formData: FormData, currentUpdatedAt: Date) {
  const expected = formData.get("_expectedUpdatedAt");
  // Missing/malformed value: fail open rather than block a legitimate save
  // over a client bug — the field is always rendered by our own forms, so
  // this should only happen for a genuinely new/never-saved record.
  if (typeof expected !== "string" || expected.trim() === "") return;

  const expectedTime = Number(expected);
  if (!Number.isFinite(expectedTime)) return;

  if (currentUpdatedAt.getTime() !== expectedTime) {
    throw new StaleWriteError();
  }
}
