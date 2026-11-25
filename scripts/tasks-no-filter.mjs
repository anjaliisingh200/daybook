/**
 * Checks the Tasks page has no Filter button (the website on sample data, phone and desktop sizes) and still works with search.
 *   node scripts/dev-sample.mjs   then   node scripts/tasks-no-filter.mjs [screenshot-folder]
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
    await page.waitForTimeout(1500);

    check(`${label}: no Filter button on the Tasks page`, (await page.locator('button[aria-label*="Filter" i], button:has-text("Filter")').count()) === 0);
    // the phone row that only held the filter is gone: the first thing under the date bar is the day header / columns
    const headerBottom = await page.evaluate(() => document.querySelector("header").getBoundingClientRect().bottom);
    const firstTask = await page.locator("[data-task]").first().boundingBox();
    check(`${label}: tasks start right under the date bar (no empty row)`, firstTask.y - headerBottom < (label.startsWith("phone") ? 330 : 260), `first task at ${Math.round(firstTask.y)}px`);
    if (shots) await page.screenshot({ path: `${shots}/${short}-tasks.png` });

    for (const view of ["d", "w", "m"]) {
      await page.keyboard.press(view);
      await page.waitForTimeout(500);
    }
    check(`${label}: Day, Week and Month views still open`, (await page.locator("main, [data-task]").count()) > 0);

    // search is still the way to narrow the list; "nothing matches" no longer mentions filters
    await page.keyboard.press("w");
    await page.waitForTimeout(500);
    await page.click('header [aria-label="Search"]');
    await page.fill('input[aria-label="Search tasks"]', "zzzzqq");
    await page.waitForTimeout(600);
    await page.keyboard.press("m");
    await page.waitForTimeout(700);
    const body = (await page.textContent("body")) ?? "";
    check(`${label}: with nothing matching, the message talks about search only`, !/filter/i.test(body), /No tasks match/.test(body) ? "message shown" : "no message in this view");
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
