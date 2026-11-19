/** Lists the horizontal lines (borders and thin dividers) under the Tasks day columns. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?d=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const col = document.querySelector("[data-day]");
  const bottom = col.getBoundingClientRect().bottom;
  return [...document.querySelectorAll("div,span,hr")].filter((el) => {
    const rc = el.getBoundingClientRect();
    return rc.top >= bottom - 5 && rc.top < bottom + 260 && rc.height <= 2 && rc.width > 40;
  }).map((el) => ({ tag: el.tagName, cls: String(el.className).slice(0, 80), top: Math.round(el.getBoundingClientRect().top), width: Math.round(el.getBoundingClientRect().width) })).slice(0, 8);
});
console.log(JSON.stringify(r));
await b.close();
