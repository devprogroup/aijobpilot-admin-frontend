/** Today as YYYY-MM-DD (a date input's value) in the admin's own time zone. */
export function todayDateInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Converts a date-input value to local midnight with an explicit UTC offset for the API. */
function localMidnightWithOffset(value: string, dayOffset = 0): string {
  const [year, month, day] = value.split("-").map(Number);
  const local = new Date(year, month - 1, day + dayOffset);
  const pad = (part: number) => String(part).padStart(2, "0");
  const offsetMinutes = -local.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T00:00:00${offset}`;
}

/** Sends an inclusive local-date range as timezone-aware timestamps with an exclusive end. */
export function dateFilterRange(from: string, to: string): { from?: string; to?: string } {
  return {
    ...(from ? { from: localMidnightWithOffset(from) } : {}),
    ...(to ? { to: localMidnightWithOffset(to, 1) } : {}),
  };
}
