/** Drags Tasks cards between days and within a day. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?dd=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const cols = () => p.evaluate(() => [...document.querySelectorAll("[data-day]")].map((c) => [c.dataset.day, [...c.querySelectorAll("article[data-task]")].map((a) => a.textContent.slice(0, 18))]));
const before = await cols();
// move the first card of the first column with cards to the next day
const src = await p.evaluate(() => { const c = [...document.querySelectorAll("[data-day]")].find((c) => c.querySelector("article[data-task]")); return { day: c.dataset.day, title: c.querySelector("article[data-task]").textContent.slice(0, 18) }; });
const dstDay = await p.evaluate((sd) => { const all = [...document.querySelectorAll("[data-day]")]; return all[(all.findIndex((c) => c.dataset.day === sd) + 1) % all.length].dataset.day; }, src.day);
const card = p.locator(`[data-day="${src.day}"] article[data-task]`).first();
const dst = p.locator(`[data-day="${dstDay}"]`);
await card.dragTo(dst, { targetPosition: { x: 60, y: 20 } });
await p.waitForTimeout(1500);
const after = await cols();
console.log(JSON.stringify({ moved: src, to: dstDay, before: before.find(([d]) => d === dstDay)?.[1].length, after: after.find(([d]) => d === dstDay)?.[1].length }));
await b.close();
