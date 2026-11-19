import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 700 } });
await p.goto("http://localhost:3000/tasks?v=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.locator("article[data-task]").first().click();
await p.waitForTimeout(800);
const sheet = p.locator('aside[role=dialog][aria-label="Task details"]');
await sheet.getByRole("button", { name: "Add subtask" }).click();
for (let i = 1; i <= 6; i++) {
  await sheet.getByPlaceholder("Subtask title").fill("Episode " + i);
  await sheet.getByPlaceholder("Subtask title").press("Enter");
  await p.waitForTimeout(600);
}
const visible = await p.evaluate(() => {
  const inp = document.querySelector('aside[aria-label="Task details"] input[placeholder="Subtask title"]');
  if (!inp) return "no input";
  const r = inp.getBoundingClientRect();
  return { top: Math.round(r.top), bottom: Math.round(r.bottom), viewport: window.innerHeight, inView: r.bottom <= window.innerHeight && r.top >= 0 };
});
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-subtask-scroll/task-sheet-scroll.png" });
console.log(JSON.stringify(visible));
await b.close();
