/** Today as YYYY-MM-DD (a date input's value) in the admin's own time zone: the default for every
 * date filter in the admin app. */
export function todayDateInput(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
