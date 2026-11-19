/** Screenshot of the calendar event editor's date and time section. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/calendar?e=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(6000);
await p.getByRole("button", { name: "Create" }).first().click();
await p.waitForTimeout(800);
const dlg = p.locator('[role=dialog]').last();
await dlg.screenshot({ path: "docs/changelog/screenshots/2026-11-19-event-datetime/event-editor.png" });
console.log("saved");
await b.close();
