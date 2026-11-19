/** Narrow window: the Calendar week keeps 200px days and scrolls sideways. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 800, height: 800 } });
await p.goto("http://localhost:3000/calendar?n=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const sc = [...document.querySelectorAll("div")].find((d) => d.className.includes("overflow-auto") && d.className.includes("overscroll-contain"));
  const day = document.querySelector("[data-day]");
  return { clientWidth: sc?.clientWidth, scrollWidth: sc?.scrollWidth, dayWidth: day && Math.round(day.getBoundingClientRect().width) };
});
console.log(JSON.stringify(r));
await b.close();
