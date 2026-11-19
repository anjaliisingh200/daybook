/** Lists the saved tasks and events called Design stand-up, to see why there are several. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:3000/tasks?sd=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(30000);
const r = await p.evaluate(() => {
  const snap = JSON.parse(localStorage.getItem("daybook.mock.v4") || "{}");
  const tasks = (snap.tasks || []).filter((t) => t.title === "Design stand-up");
  const events = (snap.events || []).filter((e) => e.title === "Design stand-up");
  return {
    total: tasks.length, distinctDates: new Set(tasks.map((t) => t.due)).size, linkedToEvent: tasks.filter((t) => t.meta.eventId).length,
    events: events.map((e) => ({ id: e.id, recurrence: e.recurrence?.freq, taskId: e.taskId })),
  };
});
console.log(JSON.stringify(r));
await b.close();
