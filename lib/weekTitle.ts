import { parseKey } from "./dates";
import type { DateKey } from "./types";

/** The title of a week: "Nov 15 – Nov 21, 2026", or "Dec 28, 2026 – Jan 3, 2027" across a year. */
export function weekRangeTitle(from: DateKey, to: DateKey, shortMonth: (d: DateKey) => string): string {
  const A = parseKey(from);
  const B = parseKey(to);
  if (A.y === B.y) return `${shortMonth(from)} ${A.d} – ${shortMonth(to)} ${B.d}, ${B.y}`;
  return `${shortMonth(from)} ${A.d}, ${A.y} – ${shortMonth(to)} ${B.d}, ${B.y}`;
}
