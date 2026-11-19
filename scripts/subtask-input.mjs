/** Screenshot of the new subtask input with the circle on the left. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?i=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.locator("article[data-task]").first().click();
await p.waitForTimeout(800);
const sheet = p.locator('aside[role=dialog][aria-label="Task details"]');
await sheet.getByRole("button", { name: "Add subtask" }).click();
await p.waitForTimeout(400);
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-subtask-input-circle/task-sheet-input.png" });
await b.close();
console.log("saved");
