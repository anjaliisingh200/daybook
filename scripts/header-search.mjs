/**
 * Checks the search in the top header (the website on sample data, phone and desktop sizes):
 * one icon, left of the profile circle; it searches tasks on Tasks and events on Calendar; the pages have no search of their own.
 *   node scripts/dev-sample.mjs   then   node scripts/header-search.mjs [screenshot-folder]
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
    const taskTitles = () => page.$$eval("[data-task] h3", (els) => els.map((e) => e.textContent));

    // ── Tasks ──
    await page.goto(`${BASE}/tasks`);
    await page.waitForSelector("[data-task]");
    await page.waitForTimeout(1200);
    const icon = page.locator('header [aria-label="Search"]');
    const avatar = page.locator('header [aria-label="Account"]');
    check(`${label}: one Search icon in the header`, (await icon.count()) === 1 && (await page.locator('[aria-label="Search"]').count()) === 1);
    const ib = await icon.boundingBox();
    const ab = await avatar.boundingBox();
    check(`${label}: the icon is left of the profile circle, on the same row`, ib.x + ib.width <= ab.x + 1 && Math.abs(ib.y + ib.height / 2 - (ab.y + ab.height / 2)) < 6, `icon right ${Math.round(ib.x + ib.width)}, profile left ${Math.round(ab.x)}`);
    check(`${label}: Tasks has no search box of its own`, (await page.locator('input[aria-label="Search tasks"]').count()) === 0);
    if (shots) await page.screenshot({ path: `${shots}/${short}-tasks-closed.png` });

    await page.waitForTimeout(4000); // the sample data adds a task for each event a moment after loading: let the list settle
    const all = await taskTitles();
    await icon.click();
    await page.waitForSelector('input[aria-label="Search tasks"]');
    await page.fill('input[aria-label="Search tasks"]', "electric");
    await page.waitForTimeout(500);
    const filtered = await taskTitles();
    check(`${label}: typing filters the task list as you type`, filtered.length > 0 && filtered.length < all.length && filtered.every((t) => /electric/i.test(t)), filtered.join(" | "));
    if (shots) await page.screenshot({ path: `${shots}/${short}-tasks-searching.png` });
    await page.click('[aria-label="Close search"]');
    await page.waitForTimeout(400);
    const afterClose = await taskTitles();
    check(`${label}: closing the search brings the full list back`, afterClose.length >= all.length, `${afterClose.length} of ${all.length}`);

    await page.keyboard.press("/");
    await page.waitForSelector('input[aria-label="Search tasks"]');
    check(`${label}: the / key opens it`, true);
    await page.fill('input[aria-label="Search tasks"]', "zzzz");
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const afterEsc = await taskTitles();
    check(`${label}: Escape closes it and clears the search`, (await page.locator('input[aria-label="Search tasks"]').count()) === 0 && afterEsc.length >= all.length, `${afterEsc.length} of ${all.length}`);

    // a search left open is cleared when you leave the page
    await icon.click();
    await page.fill('input[aria-label="Search tasks"]', "zzzz");
    await page.goto(`${BASE}/calendar`);
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/tasks`);
    await page.waitForSelector("[data-task]");
    const afterNav = await taskTitles();
    check(`${label}: a task search does not follow you to another page`, afterNav.length >= all.length, `${afterNav.length} of ${all.length}`);

    // ── Calendar ──
    await page.goto(`${BASE}/calendar`);
    await page.waitForTimeout(1500);
    check(`${label}: Calendar has exactly one Search icon (the header's)`, (await page.locator('[aria-label="Search"]').count()) === 1 && (await page.locator('header [aria-label="Search"]').count()) === 1);
    if (shots) await page.screenshot({ path: `${shots}/${short}-calendar-closed.png` });
    await page.click('header [aria-label="Search"]');
    await page.waitForSelector('input[aria-label="Search events"]');
    await page.fill('input[aria-label="Search events"]', "stand");
    await page.waitForSelector('[role="listbox"][aria-label="Search results"] button, [aria-label="Search results"] button', { timeout: 5000 });
    const got = await page.locator('[aria-label="Search results"]').first().textContent();
    check(`${label}: Calendar search lists matching events`, /stand-up/i.test(got ?? ""), (got ?? "").slice(0, 60));
    if (shots) await page.screenshot({ path: `${shots}/${short}-calendar-searching.png` });
    await page.locator('[aria-label="Search results"] button').first().click();
    await page.waitForTimeout(700);
    check(`${label}: choosing a result opens the event`, (await page.locator('[role="dialog"]').count()) > 0);
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
