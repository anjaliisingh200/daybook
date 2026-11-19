/** Hovers a task card's check circle and reads the tooltip. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?tt=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const check = p.locator('article[data-task] [role="checkbox"]').first();
await check.hover();
await p.waitForTimeout(900);
const text = await p.locator('[role="tooltip"]').first().textContent().catch(() => null);
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-check-tooltip/tooltip.png" });
console.log(JSON.stringify({ tooltip: text }));
await b.close();
