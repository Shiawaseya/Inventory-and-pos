// features/reports/utils/dateRange.ts
export type Period = "week" | "month" | "year";

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Local-time range ending today. Week starts on Monday. */
export function periodToRange(period: Period) {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") {
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  return { start_date: fmt(start), end_date: fmt(now) };
}
