/** Screenshot of the New task form with the Already completed checkbox below Subtasks. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?c=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.getByRole("button", { name: "Add task" }).first().click();
await p.waitForTimeout(900);
const a = p.locator('aside[aria-label="New task"]');
await a.getByRole("checkbox", { name: "Mark complete" }).click();
await p.waitForTimeout(300);
console.log(JSON.stringify({ label: await a.getByText("Completed", { exact: true }).count(), footer: await a.locator("button").evaluateAll((bs) => bs.map((x) => x.textContent.trim()).filter(Boolean).slice(-2)) }));
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-already-completed/new-task-sheet.png" });
await b.close();
