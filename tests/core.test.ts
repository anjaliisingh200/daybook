import { zoned, zonedToMs, addDays, monthGrid, startOfWeek, diffDays, tzOffsetLabel } from "../lib/dates";
import { expandEvent } from "../lib/recurrence";
import { layoutDay } from "../lib/layout";
let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log("FAIL", name, JSON.stringify(a), "!=", JSON.stringify(b)); } else console.log("ok  ", name); };

// tz round trip
const ist = "Asia/Kolkata", ny = "America/New_York";
const ms = zonedToMs("2026-11-18", 9 * 60 + 30, ist);
eq("IST 09:30 → UTC 04:00", new Date(ms).toISOString(), "2026-11-18T04:00:00.000Z");
eq("zoned back", zoned(ms, ist), { key: "2026-11-18", minutes: 570, y: 2026, m: 11, d: 18 });
eq("same instant in NY", zoned(ms, ny).minutes, 23 * 60 + 0 - 24 * 60 + 24 * 60 - 0 === 0 ? 0 : (23 * 60 + 0));
eq("NY date is previous day", zoned(ms, ny).key, "2026-11-17");
eq("offset label IST", tzOffsetLabel(ist, ms), "GMT+05:30");
// DST: NY on 2026-03-08 (spring forward) 03:00 local exists, 02:30 doesn't
const a = zonedToMs("2026-03-07", 9 * 60, ny), b = zonedToMs("2026-03-09", 9 * 60, ny);
eq("DST day gap is 47h not 48h", (b - a) / 3_600_000, 47);
// date maths
eq("addDays across month", addDays("2026-11-30", 1), "2026-12-01");
eq("diffDays", diffDays("2026-11-18", "2027-01-01"), 44);
eq("week start Sun", startOfWeek("2026-11-18", 0), "2026-11-15");
eq("week start Mon", startOfWeek("2026-11-15", 1), "2026-11-09");
eq("month grid rows (Nov 2026, Sun)", monthGrid("2026-11-18", 0).length, 5);
// recurrence: weekly Tue 11:00 IST, anchored 10 weeks ago
const base = { id: "e1", calendarId: "c", title: "Critique", allDay: false, tz: ist, created: 0, updated: 0 } as const;
const start = zonedToMs("2026-09-08", 11 * 60, ist);
const ev = { ...base, start, end: start + 3_600_000, recurrence: { freq: "weekly" as const, interval: 1, byDay: [2] } };
const inst = expandEvent(ev, "2026-11-15", "2026-11-21", ist);
eq("weekly: one Tuesday in week", inst.map((i) => i.startDate), ["2026-11-17"]);
eq("weekly instance 11:00 IST", zoned(inst[0].start, ist).minutes, 660);
// same event shown from NY: still 1 instance, different clock time
const instNY = expandEvent(ev, "2026-11-15", "2026-11-21", ny);
eq("shown in NY: Tue 00:30", [instNY[0].startDate, zoned(instNY[0].start, ny).minutes], ["2026-11-17", 30]);
// exdate
const ex = expandEvent({ ...ev, exdates: ["2026-11-17"] }, "2026-11-15", "2026-11-21", ist);
eq("exdate removes instance", ex.length, 0);
// biweekly
const bw = { ...ev, recurrence: { freq: "weekly" as const, interval: 2, byDay: [2] } };
const bwInst = expandEvent(bw, "2026-11-01", "2026-12-12", ist).map((i) => i.startDate);
eq("biweekly spacing 14d", bwInst.slice(1).map((d, i) => diffDays(bwInst[i], d)), bwInst.slice(1).map(() => 14));
// yearly all-day
const bd = { ...base, allDay: true, start: 0, end: 0, startDate: "2018-11-23", endDate: "2018-11-23", recurrence: { freq: "yearly" as const, interval: 1 } };
eq("yearly birthday", expandEvent(bd, "2026-11-01", "2026-11-30", ist).map((i) => i.startDate), ["2026-11-23"]);
// multi-day all-day
const trip = { ...base, allDay: true, start: 0, end: 0, startDate: "2026-12-03", endDate: "2026-12-06" };
eq("multi-day visible from mid", expandEvent(trip, "2026-12-05", "2026-12-05", ist).length, 1);
eq("multi-day not visible after", expandEvent(trip, "2026-12-07", "2026-12-09", ist).length, 0);
// overnight timed event spans two display days
const night = { ...base, start: zonedToMs("2026-11-18", 23 * 60, ist), end: zonedToMs("2026-11-19", 60, ist) };
const ni = expandEvent(night, "2026-11-18", "2026-11-19", ist)[0];
eq("overnight dates", [ni.startDate, ni.endDate], ["2026-11-18", "2026-11-19"]);
// layout: two overlapping events share columns
const mk = (id: string, s: number, e: number) => ({ ...expandEvent({ ...base, id, start: zonedToMs("2026-11-18", s, ist), end: zonedToMs("2026-11-18", e, ist) }, "2026-11-18", "2026-11-18", ist)[0] });
const placed = layoutDay([mk("a", 600, 660), mk("b", 630, 690), mk("c", 720, 780)], "2026-11-18", ist);
eq("overlap cols", placed.map((p) => [p.col, p.cols]), [[0, 2], [1, 2], [0, 1]]);
console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
