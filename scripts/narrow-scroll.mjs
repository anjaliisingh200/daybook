/** Narrow window: the Tasks week keeps its day width and scrolls sideways. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 800, height: 800 } });
await p.goto("http://localhost:3000/tasks?n=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const scroller = document.querySelector("[data-day]").closest(".overflow-auto");
  const col = document.querySelector("[data-day]");
  return { viewport: innerWidth, scrollerClientWidth: scroller.clientWidth, scrollerScrollWidth: scroller.scrollWidth, dayWidth: Math.round(col.getBoundingClientRect().width) };
});
console.log(JSON.stringify(r));
await p.screenshot({ path: "docs/changelog/screenshots/2026-11-19-narrow-scroll/tasks-narrow.png" });
await b.close();
