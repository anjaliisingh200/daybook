/**
 * Checks where the Completed list shows on the Tasks page (the website on sample data, desktop and phone sizes).
 * It must not show in the Week view; it still shows in the Month view.
 *   node scripts/dev-sample.mjs   then   node scripts/completed-week.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const [label, opts] of [
    ["desktop 1440", { viewport: { width: 1440, height: 900 } }],
    ["phone 390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/tasks`);
    await page.waitForSelector("[data-task]");
    await page.waitForTimeout(1500);
    const completed = () => page.locator('section[aria-label="Completed"]').count();

    await page.keyboard.press("w");
    await page.waitForTimeout(700);
    check(`${label}: Week view has no Completed list`, (await completed()) === 0);
    if (process.argv[2]) await page.screenshot({ path: `${process.argv[2]}/${label.split(" ")[0]}-tasks-week.png` });

    await page.keyboard.press("d");
    await page.waitForTimeout(700);
    check(`${label}: Day view has no Completed list`, (await completed()) === 0);

    await page.keyboard.press("m");
    await page.waitForTimeout(900);
    check(`${label}: Month view still has the Completed list`, (await completed()) === 1);
    await ctx.close();
  }
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
