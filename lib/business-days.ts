import "server-only";

function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Adds N weekdays (Mon-Fri) to `start`, skipping weekends. `days` may be
// negative to walk backward. `start` itself is never counted.
export function addBusinessDays(start: Date, days: number): Date {
  const result = new Date(start);
  const step = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result.setDate(result.getDate() + step);
    if (!isWeekend(result)) remaining -= 1;
  }
  return result;
}

// Signed count of weekdays between two dates: positive when `to` is in the
// future relative to `from`, negative when it's in the past. Callers should
// pass midnight-normalized dates so the walk lands exactly on `to`.
export function businessDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cursor = new Date(from);
  const step = to >= from ? 1 : -1;
  while (cursor.getTime() !== to.getTime()) {
    cursor.setDate(cursor.getDate() + step);
    if (!isWeekend(cursor)) count += step;
  }
  return count;
}
