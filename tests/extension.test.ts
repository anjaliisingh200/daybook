import { bearerOf } from "../lib/google/session";
import { todaysEvents, todaysTasks, isBanner } from "../extension/src/today";
import { zonedToMs } from "../lib/dates";
import type { CalendarEvent, Task } from "../lib/types";

let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) {
    fail++;
    console.log("FAIL", name, JSON.stringify(a), "!=", JSON.stringify(b));
  } else console.log("ok  ", name);
};

// ── the Authorization header the extension sends ──
eq("bearer: plain token", bearerOf("Bearer abc.def.ghi"), "abc.def.ghi");
eq("bearer: any letter case", bearerOf("bearer abc"), "abc");
eq("bearer: no header", bearerOf(null), null);
eq("bearer: another scheme", bearerOf("Basic abc"), null);
eq("bearer: empty token", bearerOf("Bearer "), null);
eq("bearer: two words are refused", bearerOf("Bearer a b"), null);

// ── today's tasks ──
const TODAY = "2026-11-23";
const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  listId: "l",
  parentId: null,
  title: id,
  notes: "",
  status: "needsAction",
  due: TODAY,
  completedAt: null,
  created: 1000,
  updated: 1000,
  position: 1,
  meta: {},
  ...over,
});

const tasks = [
  task("old", { created: 1 }),
  task("new", { created: 3 }),
  task("mid", { created: 2, status: "completed", completedAt: 5 }),
  task("tomorrow", { due: "2026-11-24" }),
  task("undated", { due: null }),
  task("sub-b", { parentId: "new", due: null, position: 2 }),
  task("sub-a", { parentId: "new", due: null, position: 1 }),
];
const rows = todaysTasks(tasks, TODAY);
eq("tasks: only today's, newest first, done ones stay", rows.map((r) => r.task.id), ["new", "mid", "old"]);
eq("tasks: subtasks sit under their parent in order", rows[0].subtasks.map((s) => s.id), ["sub-a", "sub-b"]);
eq("tasks: a subtask is not a row of its own", rows.some((r) => r.task.parentId), false);

const placed = todaysTasks([task("a", { created: 9 }), task("b", { created: 1, meta: { order: -5 } }), task("c", { created: 5, meta: { order: 7 } })], TODAY);
eq("tasks: a hand-placed order is kept", placed.map((r) => r.task.id), ["b", "c", "a"]);

const prio = todaysTasks([task("low", { meta: { priority: "low", order: 1e13 * 2 } }), task("high", { meta: { priority: "high", order: 0 } })], TODAY);
eq("tasks: hand-placed order wins over priority", prio.map((r) => r.task.id), ["high", "low"]);

// ── today's events ──
const IST = "Asia/Kolkata";
const ev = (id: string, over: Partial<CalendarEvent>): CalendarEvent => ({
  id,
  calendarId: "c",
  title: id,
  allDay: false,
  start: 0,
  end: 0,
  tz: IST,
  created: 0,
  updated: 0,
  ...over,
});
const events: CalendarEvent[] = [
  ev("late", { start: zonedToMs(TODAY, 15 * 60, IST), end: zonedToMs(TODAY, 16 * 60, IST) }),
  ev("early", { start: zonedToMs(TODAY, 9 * 60, IST), end: zonedToMs(TODAY, 10 * 60, IST) }),
  ev("allday", { allDay: true, startDate: TODAY, endDate: TODAY }),
  ev("yesterday", { start: zonedToMs("2026-11-22", 9 * 60, IST), end: zonedToMs("2026-11-22", 10 * 60, IST) }),
  ev("daily", { start: zonedToMs("2026-11-01", 12 * 60, IST), end: zonedToMs("2026-11-01", 13 * 60, IST), recurrence: { freq: "daily", interval: 1 } }),
];
const got = todaysEvents(events, TODAY, IST);
eq("events: today only, all-day first, then by time, repeats expanded", got.map((i) => i.title), ["allday", "early", "daily", "late"]);
eq("events: the all-day one is a banner", got.map(isBanner), [true, false, false, false]);

if (fail) {
  console.log(`\n${fail} FAILED`);
  process.exit(1);
}
console.log("\nall extension tests passed");
