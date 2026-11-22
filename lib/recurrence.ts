import type { CalendarEvent, DateKey, EventInstance, Freq, Recurrence } from "./types";
import { addDays, diffDays, dowOf, parseKey, startOfWeek, zoned, zonedToMs } from "./dates";
import type { Fmt } from "./format";

/** Expand an event into the concrete instances that touch [from, to] (display-zone days). */
export function expandEvent(ev: CalendarEvent, from: DateKey, to: DateKey, displayTz: string): EventInstance[] {
  const out: EventInstance[] = [];
  const rec = ev.recurrence;

  const make = (seriesDate: DateKey, startMs: number, endMs: number, sd: DateKey, ed: DateKey): void => {
    if (sd > to || ed < from) return;
    out.push({
      key: rec ? `${ev.id}@${seriesDate}` : ev.id,
      event: ev,
      calendarId: ev.calendarId,
      title: ev.title,
      allDay: ev.allDay,
      start: startMs,
      end: endMs,
      startDate: sd,
      endDate: ed,
      seriesDate,
      isRecurring: !!rec || !!ev.recurringEventId,
    });
  };

  const displayDates = (startMs: number, endMs: number): [DateKey, DateKey] => {
    const s = zoned(startMs, displayTz).key;
    const e = zoned(Math.max(startMs, endMs - 1), displayTz).key;
    return [s, e];
  };

  if (ev.allDay) {
    const s = ev.startDate!;
    const e = ev.endDate ?? s;
    const span = diffDays(s, e);
    if (!rec) {
      make(s, 0, 0, s, e);
      return out;
    }
    for (const k of occurrences(rec, s, from, to, span)) {
      if (ev.exdates?.includes(k)) continue;
      make(k, 0, 0, k, addDays(k, span));
    }
    return out;
  }

  if (!rec) {
    const [sd, ed] = displayDates(ev.start, ev.end);
    make(sd, ev.start, ev.end, sd, ed);
    return out;
  }

  const base = zoned(ev.start, ev.tz);
  const dur = ev.end - ev.start;
  const spanDays = Math.ceil(dur / 86_400_000) + 1;
  for (const k of occurrences(rec, base.key, from, to, spanDays)) {
    if (ev.exdates?.includes(k)) continue;
    const s = zonedToMs(k, base.minutes, ev.tz);
    const e = s + dur;
    const [sd, ed] = displayDates(s, e);
    make(k, s, e, sd, ed);
  }
  return out;
}

/** Series dates (in the event's own zone) that could touch the window. */
function* occurrences(rec: Recurrence, seriesStart: DateKey, from: DateKey, to: DateKey, spanDays: number): Generator<DateKey> {
  // Look back far enough to catch multi-day occurrences that began before `from`,
  // and forward one day to allow for time zone shifts.
  const lo = addDays(from, -(spanDays + 1)) > seriesStart ? addDays(from, -(spanDays + 1)) : seriesStart;
  const hi = addDays(to, 1);
  const interval = Math.max(1, rec.interval || 1);
  const start = parseKey(seriesStart);
  const byDay = rec.byDay?.length ? rec.byDay : [dowOf(seriesStart)];
  const anchorWeek = startOfWeek(seriesStart, 0);
  for (let k = lo; k <= hi; k = addDays(k, 1)) {
    if (rec.until && k > rec.until) return;
    const p = parseKey(k);
    let ok = false;
    switch (rec.freq) {
      case "daily":
        ok = diffDays(seriesStart, k) % interval === 0;
        break;
      case "weekly":
        ok = byDay.includes(dowOf(k)) && Math.floor(diffDays(anchorWeek, k) / 7) % interval === 0;
        break;
      case "monthly":
        ok = p.d === start.d && ((p.y - start.y) * 12 + (p.m - start.m)) % interval === 0;
        break;
      case "yearly":
        ok = p.d === start.d && p.m === start.m && (p.y - start.y) % interval === 0;
        break;
    }
    if (ok) yield k;
  }
}

// ───────────────────────── presets & description ─────────────────────────

export type RepeatPreset = "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";

export function presetOf(rec: Recurrence | undefined): RepeatPreset {
  if (!rec) return "none";
  if (rec.interval !== 1 && rec.interval !== undefined) return "custom";
  if (rec.freq === "daily") return "daily";
  if (rec.freq === "monthly") return "monthly";
  if (rec.freq === "yearly") return "yearly";
  if (rec.freq === "weekly") {
    const d = rec.byDay ?? [];
    if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return "weekdays";
    if (d.length <= 1) return "weekly";
  }
  return "custom";
}

export function recurrenceFromPreset(p: RepeatPreset, startKey: DateKey): Recurrence | undefined {
  switch (p) {
    case "daily":
      return { freq: "daily", interval: 1 };
    case "weekly":
      return { freq: "weekly", interval: 1, byDay: [dowOf(startKey)] };
    case "weekdays":
      return { freq: "weekly", interval: 1, byDay: [1, 2, 3, 4, 5] };
    case "monthly":
      return { freq: "monthly", interval: 1 };
    case "yearly":
      return { freq: "yearly", interval: 1 };
    default:
      return undefined;
  }
}

const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function describeRecurrence(rec: Recurrence | undefined, startKey: DateKey, fmt: Fmt): string {
  if (!rec) return "Does not repeat";
  const n = rec.interval || 1;
  const until = rec.until ? `, until ${fmt.date(rec.until)}` : "";
  switch (rec.freq) {
    case "daily":
      return (n === 1 ? "Daily" : `Every ${n} days`) + until;
    case "weekly": {
      const d = rec.byDay?.length ? rec.byDay : [dowOf(startKey)];
      const isWeekdays = d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x));
      const days = isWeekdays ? "weekday" : d.length === 1 ? DOW_LONG[d[0]] : [...d].sort().map((x) => DOW_SHORT[x]).join(", ");
      if (isWeekdays && n === 1) return "Every weekday" + until;
      return `${n === 1 ? "Weekly" : `Every ${n} weeks`} on ${days}${until}`;
    }
    case "monthly":
      return `${n === 1 ? "Monthly" : `Every ${n} months`} on day ${parseKey(startKey).d}${until}`;
    case "yearly":
      return `Annually on ${fmt.month(startKey, "long")} ${parseKey(startKey).d}${until}`;
  }
}

// ─────────────────────────── custom repeats ───────────────────────────

/**
 * A task keeps its repeat in one string. The presets are plain words ("daily", "weekly"...). A custom repeat,
 * such as "every Sunday, Wednesday and Friday", is kept as "custom:weekly:1:0,3,5:2026-12-31"
 * (how often, every how many, which weekdays, last day or empty).
 */
export const isCustomRepeat = (value: string | undefined): boolean => !!value && value.startsWith("custom:");

export function encodeRepeat(rec: Recurrence): string {
  return ["custom", rec.freq, Math.max(1, rec.interval || 1), (rec.byDay ?? []).join(","), rec.until ?? ""].join(":");
}

export function decodeRepeat(value: string): Recurrence | null {
  const [tag, freq, every, days, until] = value.split(":");
  if (tag !== "custom" || !["daily", "weekly", "monthly", "yearly"].includes(freq)) return null;
  const byDay = days ? days.split(",").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6) : [];
  return {
    freq: freq as Freq,
    interval: Math.max(1, Number(every) || 1),
    ...(freq === "weekly" && byDay.length ? { byDay } : {}),
    ...(until ? { until } : {}),
  };
}

/** Any repeat string (preset or custom) as a recurrence rule. */
export function recurrenceOfRepeat(value: string | undefined, startKey: DateKey): Recurrence | undefined {
  if (!value || value === "none") return undefined;
  if (isCustomRepeat(value)) return decodeRepeat(value) ?? undefined;
  return recurrenceFromPreset(value as RepeatPreset, startKey);
}

/** Every date from `start` up to `to` (inclusive) that a rule lands on. */
export function repeatDates(rec: Recurrence, start: DateKey, to: DateKey): DateKey[] {
  return [...occurrences(rec, start, start, to, 0)].filter((k) => k <= to);
}

const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** A repeat string in words, for the Repeat menu. */
export function describeRepeat(value: string, startKey: DateKey, fmt: Fmt): string {
  const rec = recurrenceOfRepeat(value, startKey);
  if (!rec) return "Does not repeat";
  const n = rec.interval || 1;
  const until = rec.until ? `, until ${fmt.date(rec.until)}` : "";
  if (rec.freq === "weekly") {
    const days = (rec.byDay?.length ? rec.byDay : [dowOf(startKey)]).slice().sort((a, b) => a - b);
    const isWeekdays = days.length === 5 && [1, 2, 3, 4, 5].every((x) => days.includes(x));
    if (isWeekdays && n === 1) return "Every weekday" + until;
    const names = days.length === 7 ? "every day" : days.length === 1 ? DOW_FULL[days[0]] : days.map((x) => DOW_FULL[x].slice(0, 3)).join(", ");
    return `${n === 1 ? "Weekly" : `Every ${n} weeks`} on ${names}${until}`;
  }
  return describeRecurrence(rec, startKey, fmt);
}
