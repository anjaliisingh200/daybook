/** Screenshot of the New task form with Mark complete in the footer. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?f=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.getByRole("button", { name: "Add task" }).first().click();
await p.waitForTimeout(900);
const footer = await p.evaluate(() => {
  const a = document.querySelector('aside[aria-label="New task"]');
  const btns = [...a.querySelectorAll("button")].map((x) => x.textContent.trim()).filter(Boolean);
  return btns.slice(-4);
});
console.log(JSON.stringify(footer));
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-new-task-footer/new-task-sheet.png" });
await b.close();
