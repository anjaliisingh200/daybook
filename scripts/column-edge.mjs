/** Measures the left edge of the Tasks day columns, their cards and the day headers. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?al=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const col = document.querySelector("[data-day]");
  const grid = col.parentElement;
  const card = col.querySelector("article[data-task]");
  const hdrBtn = [...document.querySelectorAll("button")].find((x) => x.getAttribute("aria-pressed") !== null && x.textContent.trim());
  const L = (el) => el && Math.round(el.getBoundingClientRect().left);
  const R = (el) => el && Math.round(el.getBoundingClientRect().right);
  return { gridLeft: L(grid), gridRight: R(grid), colLeft: L(col), colRight: R(col), cardLeft: L(card), cardRight: R(card), headerBtnLeft: L(hdrBtn), headerBtnRight: R(hdrBtn), gridPadLeft: getComputedStyle(grid).paddingLeft, colPadLeft: getComputedStyle(col).paddingLeft };
});
console.log(JSON.stringify(r));
await b.close();
