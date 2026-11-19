/** Screenshots of the two side sheets: New task, and task details. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const dir = "docs/changelog/screenshots/2026-11-19-side-sheets";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?s=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.getByRole("button", { name: "Add task" }).first().click();
await p.waitForTimeout(900);
await p.screenshot({ path: `${dir}/new-task-sheet.png` });
await p.keyboard.press("Escape");
await p.waitForTimeout(500);
await p.locator("article[data-task]").first().click();
await p.waitForTimeout(900);
await p.screenshot({ path: `${dir}/task-details-sheet.png` });
console.log("saved", dir);
await b.close();
