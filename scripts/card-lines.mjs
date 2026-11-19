/** Lists borders, dividers and shadows inside the first Tasks card. Needs the dev server on :3000. */
import { chromium } from "playwright-core";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3000/tasks?c=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForTimeout(8000);
const r = await p.evaluate(() => {
  const card = document.querySelector("article[data-task]");
  const out = [];
  for (const el of [card, ...card.querySelectorAll("*")]) {
    const cs = getComputedStyle(el);
    const bw = ["Top", "Right", "Bottom", "Left"].map((s) => parseFloat(cs[`border${s}Width`]) && cs[`border${s}Style`] !== "none" ? s : null).filter(Boolean);
    const h = Math.round(el.getBoundingClientRect().height);
    if (bw.length || cs.boxShadow !== "none" || (h <= 2 && h > 0) || cs.backgroundColor !== "rgba(0, 0, 0, 0)") {
      out.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), borders: bw, shadow: cs.boxShadow !== "none" ? cs.boxShadow.slice(0, 60) : null, bg: cs.backgroundColor, h });
    }
  }
  return out.slice(0, 10);
});
console.log(JSON.stringify(r, null, 1));
await b.close();
