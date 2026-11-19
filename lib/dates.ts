import type { DateKey } from "./types";

/**
 * Date model
 * ----------
 * • A DateKey ("2026-11-18") is a calendar day with no time zone. All day maths
 *   (add days, week start, month grid) happens on DateKeys, using UTC arithmetic,
 *   so it is immune to DST and to the viewer's time zone.
 * • Timed events are instants (epoch ms). They are converted to a DateKey +
 *   minutes-of-day only at the edge, in the user's chosen display zone.
 * • Google Tasks due dates are floating DateKeys, never converted.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function keyOf(y: number, m: number, d: number): DateKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function parseKey(k: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = k.split("-").map(Number);
  return { y, m, d };
}

function utcMs(k: DateKey): number {
  const { y, m, d } = parseKey(k);
  return Date.UTC(y, m - 1, d);
}

export function keyToDate(k: DateKey): Date {
  return new Date(utcMs(k));
}

export function addDays(k: DateKey, n: number): DateKey {
  const dt = new Date(utcMs(k) + n * 86_400_000);
  return keyOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((utcMs(b) - utcMs(a)) / 86_400_000);
}

/** 0 = Sunday */
export function dowOf(k: DateKey): number {
  return new Date(utcMs(k)).getUTCDay();
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function startOfWeek(k: DateKey, weekStart: number): DateKey {
  const diff = (dowOf(k) - weekStart + 7) % 7;
  return addDays(k, -diff);
}

export function startOfMonth(k: DateKey): DateKey {
  const { y, m } = parseKey(k);
  return keyOf(y, m, 1);
}

export function addMonths(k: DateKey, n: number): DateKey {
  const { y, m, d } = parseKey(k);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return keyOf(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function sameMonth(a: DateKey, b: DateKey): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** Rows of 7 DateKeys covering the month containing `k`. */
export function monthGrid(k: DateKey, weekStart: number): DateKey[][] {
  const first = startOfMonth(k);
  const { y, m } = parseKey(k);
  const lead = (dowOf(first) - weekStart + 7) % 7;
  const weeks = Math.ceil((lead + daysInMonth(y, m)) / 7);
  const start = addDays(first, -lead);
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

export function range(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

// ───────────────────────────── time zones ─────────────────────────────

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export interface Zoned {
  key: DateKey;
  /** minutes since midnight in that zone */
  minutes: number;
  y: number;
  m: number;
  d: number;
}

export function zoned(ms: number, tz: string): Zoned {
  const parts = dtf(tz).formatToParts(ms);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const h = get("hour") % 24;
  const min = get("minute");
  return { key: keyOf(y, m, d), minutes: h * 60 + min, y, m, d };
}

function offsetAt(ms: number, tz: string): number {
  const parts = dtf(tz).formatToParts(ms);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

/** Wall-clock (day + minutes) in `tz` → epoch ms. Handles DST. */
export function zonedToMs(key: DateKey, minutes: number, tz: string): number {
  const { y, m, d } = parseKey(key);
  const guess = Date.UTC(y, m - 1, d, 0, 0) + minutes * 60_000;
  const off1 = offsetAt(guess, tz);
  let ms = guess - off1;
  const off2 = offsetAt(ms, tz);
  if (off2 !== off1) ms = guess - off2;
  return ms;
}

export function todayKey(tz: string, now = Date.now()): DateKey {
  return zoned(now, tz).key;
}

export function systemTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function allTimeZones(): string[] {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  const list = fn ? fn("timeZone") : [];
  const base = list.length ? list : ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Australia/Sydney"];
  return base.includes("UTC") ? base : ["UTC", ...base];
}

export function tzOffsetLabel(tz: string, at = Date.now()): string {
  const off = Math.round(offsetAt(at, tz) / 60_000);
  const sign = off < 0 ? "-" : "+";
  const a = Math.abs(off);
  return `GMT${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
}
