import type { DateFormat, DateKey } from "./types";
import { diffDays, keyToDate, parseKey, zoned } from "./dates";

export interface FormatPrefs {
  locale: string;
  timeZone: string;
  hour12: boolean;
  dateFormat: DateFormat;
}

const cache = new Map<string, Intl.DateTimeFormat>();
function utcFmt(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const id = locale + JSON.stringify(opts);
  let f = cache.get(id);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" });
    cache.set(id, f);
  }
  return f;
}

export interface Fmt {
  /** minutes-of-day → "9 AM", "9:30 AM" or "09:30" */
  minutes(min: number, opts?: { compact?: boolean }): string;
  /** instant → clock time in display zone */
  time(ms: number, opts?: { compact?: boolean }): string;
  timeRange(startMs: number, endMs: number): string;
  weekday(key: DateKey, style?: "long" | "short" | "narrow"): string;
  dayNum(key: DateKey): number;
  monthYear(key: DateKey): string;
  month(key: DateKey, style?: "long" | "short"): string;
  /** "Wed, 18 Nov" */
  dayShort(key: DateKey): string;
  /** "Wednesday, 18 November" */
  dayLong(key: DateKey): string;
  /** per the user's date-format preference, includes year: "18 Nov 2026" */
  date(key: DateKey): string;
  /** "Today", "Tomorrow", "Yesterday", else dayShort */
  relative(key: DateKey, today: DateKey): string;
  /** "3 days overdue", "in 5 days" */
  distance(key: DateKey, today: DateKey): string;
  duration(minutes: number): string;
  /** "Nov 18 – 24, 2026" style span for a week header */
  span(a: DateKey, b: DateKey): string;
}

export function makeFmt(p: FormatPrefs): Fmt {
  const { locale, hour12, dateFormat } = p;

  const minutes: Fmt["minutes"] = (min, opts) => {
    const h = Math.floor(min / 60) % 24;
    const m = min % 60;
    if (!hour12) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const suffix = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    if (opts?.compact && m === 0) return `${h12} ${suffix}`;
    return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
  };

  const time: Fmt["time"] = (ms, opts) => minutes(zoned(ms, p.timeZone).minutes, opts);

  const weekday: Fmt["weekday"] = (k, style = "short") => utcFmt(locale, { weekday: style }).format(keyToDate(k));
  const dayNum: Fmt["dayNum"] = (k) => parseKey(k).d;
  const monthYear: Fmt["monthYear"] = (k) => utcFmt(locale, { month: "long", year: "numeric" }).format(keyToDate(k));
  const month: Fmt["month"] = (k, style = "short") => utcFmt(locale, { month: style }).format(keyToDate(k));
  const dayShort: Fmt["dayShort"] = (k) => utcFmt(locale, { weekday: "short", day: "numeric", month: "short" }).format(keyToDate(k));
  const dayLong: Fmt["dayLong"] = (k) => utcFmt(locale, { weekday: "long", day: "numeric", month: "long" }).format(keyToDate(k));

  const date: Fmt["date"] = (k) => {
    const { y, m, d } = parseKey(k);
    const mm = String(m).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    switch (dateFormat) {
      case "dmy":
        return `${dd}/${mm}/${y}`;
      case "mdy":
        return `${mm}/${dd}/${y}`;
      case "ymd":
        return `${y}-${mm}-${dd}`;
      default:
        return utcFmt(locale, { day: "numeric", month: "short", year: "numeric" }).format(keyToDate(k));
    }
  };

  const relative: Fmt["relative"] = (k, today) => {
    const n = diffDays(today, k);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "Yesterday";
    const sameYear = k.slice(0, 4) === today.slice(0, 4);
    return sameYear ? dayShort(k) : `${dayShort(k)} ${k.slice(0, 4)}`;
  };

  const distance: Fmt["distance"] = (k, today) => {
    const n = diffDays(today, k);
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    if (n === -1) return "1 day overdue";
    if (n < 0) return `${-n} days overdue`;
    if (n < 14) return `In ${n} days`;
    if (n < 60) return `In ${Math.round(n / 7)} weeks`;
    return `In ${Math.round(n / 30)} months`;
  };

  const duration: Fmt["duration"] = (m) => {
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r ? `${h} hr ${r} min` : h === 1 ? "1 hr" : `${h} hrs`;
  };

  const span: Fmt["span"] = (a, b) => {
    const A = parseKey(a);
    const B = parseKey(b);
    if (A.y === B.y && A.m === B.m) return `${month(a, "short")} ${A.d} – ${B.d}, ${A.y}`;
    if (A.y === B.y) return `${month(a, "short")} ${A.d} – ${month(b, "short")} ${B.d}, ${A.y}`;
    return `${month(a, "short")} ${A.d}, ${A.y} – ${month(b, "short")} ${B.d}, ${B.y}`;
  };

  return {
    minutes,
    time,
    timeRange: (s, e) => `${time(s)} – ${time(e)}`,
    weekday,
    dayNum,
    monthYear,
    month,
    dayShort,
    dayLong,
    date,
    relative,
    distance,
    duration,
    span,
  };
}
