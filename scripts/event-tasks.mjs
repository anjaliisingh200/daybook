/** Checks that calendar events have matching tasks, e.g. "Design stand-up". Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await p.goto("http://localhost:3000/tasks?t=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(12000);
const count = await p.locator("article[data-task]", { hasText: "Design stand-up" }).count();
const total = await p.locator("article[data-task]").count();
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-event-tasks/tasks-week.png" });
console.log(JSON.stringify({ designStandupTasks: count, visibleTasks: total, errors: errs }));
await b.close();
