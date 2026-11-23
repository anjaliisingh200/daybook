import { bearerOf } from "../lib/google/session";
import { tasksForDay } from "../extension/src/today";
import type { Task } from "../lib/types";

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
const rows = tasksForDay(tasks, TODAY);
eq("tasks: only today's, newest first, done ones stay", rows.map((t) => t.id), ["new", "mid", "old"]);
eq("tasks: a subtask is not a row of its own", rows.some((t) => t.parentId), false);

const placed = tasksForDay([task("a", { created: 9 }), task("b", { created: 1, meta: { order: -5 } }), task("c", { created: 5, meta: { order: 7 } })], TODAY);
eq("tasks: a hand-placed order is kept", placed.map((t) => t.id), ["b", "c", "a"]);

const prio = tasksForDay([task("low", { meta: { priority: "low", order: 1e13 * 2 } }), task("high", { meta: { priority: "high", order: 0 } })], TODAY);
eq("tasks: hand-placed order wins over priority", prio.map((t) => t.id), ["high", "low"]);

if (fail) {
  console.log(`\n${fail} FAILED`);
  process.exit(1);
}
console.log("\nall extension tests passed");
