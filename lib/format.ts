// Calendar-date fields (DOB, assessment/anchor dates, eligibility dates,
// etc.) are stored and parsed as UTC midnight (see toDateInputValue and
// every save action's date() helper) — timeZone: "UTC" here keeps display
// consistent with that, regardless of the server's or browser's own
// timezone. Without it, any client component rendering in a timezone
// behind UTC (e.g. US Mountain) shows these a day early.
export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric", timeZone: "UTC" });
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateInputValue(date: Date | string | null | undefined) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function titleCase(value: string) {
  return value
    .split("_")
    .map((w) => (/^CCL\d+$/.test(w) ? w : w[0]?.toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}
