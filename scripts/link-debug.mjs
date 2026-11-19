/** Loads Tasks and watches for save messages while events are linked to tasks. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage();
await p.goto("http://localhost:3000/tasks?ld=" + Date.now(), { waitUntil: "load", timeout: 120000 });
const msgs = new Set();
for (let i = 0; i < 60; i++) {
  const t = await p.evaluate(() => [...document.querySelectorAll('[aria-live="polite"] span')].map((s) => s.textContent));
  t.forEach((x) => msgs.add(x));
  await p.waitForTimeout(500);
}
const state = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem("daybook.mock.v4") || "{}"); return { tasks: (s.tasks || []).filter((t) => t.title === "Design stand-up").map((t) => ({ meta: t.meta, due: t.due })) }; });
console.log(JSON.stringify({ messages: [...msgs], state }));
await b.close();
