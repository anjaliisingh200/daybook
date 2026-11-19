/** Reorders two cards inside one day. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?ro=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const day = await p.evaluate(() => [...document.querySelectorAll("[data-day]")].find((c) => c.querySelectorAll("article[data-task]").length >= 2).dataset.day);
const titles = () => p.evaluate((d) => [...document.querySelector(`[data-day="${d}"]`).querySelectorAll("article[data-task]")].map((a) => a.textContent.slice(0, 18)), day);
const before = await titles();
const first = p.locator(`[data-day="${day}"] article[data-task]`).nth(0);
const second = p.locator(`[data-day="${day}"] article[data-task]`).nth(1);
const box = await second.boundingBox();
await first.dragTo(second, { targetPosition: { x: 20, y: box.height - 6 } });
await p.waitForTimeout(1500);
console.log(JSON.stringify({ before, after: await titles() }));
await b.close();
