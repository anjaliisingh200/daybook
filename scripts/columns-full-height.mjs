/**
 * Checks the Tasks day columns (week and day views) run to the bottom of the scrolling area instead of stopping at the
 * tallest column (the website on sample data, phone and desktop sizes).
 *   node scripts/dev-sample.mjs   then   node scripts/columns-full-height.mjs [screenshot-folder]
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [label, opts] of [
    ["phone 390", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
    ["desktop 1440", { viewport: { width: 1440, height: 900 } }],
  ]) {
    const short = label.split(" ")[0];
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/tasks`);
    await page.waitForSelector("[data-task]");
    await page.waitForTimeout(8500); // let the "overdue tasks" message go away

    /** How far the day columns reach, against where the scrolling area ends. */
    const reach = () =>
      page.evaluate(() => {
        const cols = [...document.querySelectorAll("[data-day]")];
        const sc = cols[0].closest(".overflow-auto");
        const s = sc.getBoundingClientRect();
        return { colBottoms: cols.map((c) => Math.round(c.getBoundingClientRect().bottom)), scrollerBottom: Math.round(s.bottom), columns: cols.length };
      });

    await page.keyboard.press("w");
    await page.waitForTimeout(800);
    let r = await reach();
    check(`${label}: Week: every column reaches the bottom of the page`, r.colBottoms.every((b) => b >= r.scrollerBottom - 2), JSON.stringify(r));
    check(`${label}: Week: all the columns end at the same place`, new Set(r.colBottoms).size === 1);
    if (shots) await page.screenshot({ path: `${shots}/${short}-tasks-week.png` });

    await page.keyboard.press("d");
    await page.waitForTimeout(800);
    r = await reach();
    check(`${label}: Day: the column reaches the bottom of the page`, r.colBottoms.every((b) => b >= r.scrollerBottom - 2), JSON.stringify(r));
    if (shots) await page.screenshot({ path: `${shots}/${short}-tasks-day.png` });

    // with a lot of tasks the page still scrolls and the columns still line up
    await page.keyboard.press("w");
    await page.waitForTimeout(600);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("a");
      await page.waitForSelector('[role="dialog"][aria-label="New task"]');
      await page.fill('[role="dialog"][aria-label="New task"] [aria-label="Title"]', `Extra task ${i + 1}`);
      await page.click('[role="dialog"][aria-label="New task"] button:has-text("Save")');
      await page.waitForTimeout(450);
    }
    await page.waitForTimeout(1500);
    r = await reach();
    check(`${label}: with many tasks the columns still end together`, new Set(r.colBottoms).size === 1, JSON.stringify(r));
    const scrolls = await page.evaluate(() => {
      const sc = document.querySelector("[data-day]").closest(".overflow-auto");
      return sc.scrollHeight > sc.clientHeight;
    });
    check(`${label}: and the page scrolls when the tasks are longer than the screen`, scrolls);

    check(`${label}: no errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
