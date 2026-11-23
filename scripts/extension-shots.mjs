/**
 * Screenshots of the extension panel (demo build, sample data) for the change log.
 *
 *   npm run extension -- --demo && node extension/serve.mjs   (in another terminal)
 *   node scripts/extension-shots.mjs <slug>
 *
 * Saves to docs/changelog/screenshots/<YYYY-MM-DD>-<slug>/.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const slug = (process.argv[2] ?? "extension").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const dir = `docs/changelog/screenshots/${new Date().toISOString().slice(0, 10)}-${slug}`;
mkdirSync(dir, { recursive: true });
const BASE = process.env.BASE_URL ?? "http://localhost:3300";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = (name) => page.screenshot({ path: `${dir}/${name}.png` });

await page.goto(BASE);
await page.waitForSelector(".task");
await shot("panel-tasks");

await page.click('[aria-label="Add task for today"]');
await page.waitForSelector("#new-task");
await page.fill("#new-task", "Book the dentist");
await shot("panel-tasks-add");
await page.keyboard.press("Enter");
await page.waitForFunction(() => !document.querySelector(".addform"));
await page.click('[aria-label="Complete Pay electricity bill"]');
await page.waitForTimeout(400);
await shot("panel-tasks-done");

await page.click(".tab:has-text('Calendar')");
await page.waitForSelector(".ev");
await page.waitForTimeout(400);
await shot("panel-calendar");

await page.click(".avatar");
await shot("panel-account-menu");

await page.goto(`${BASE}/?login`);
await page.waitForSelector(".login");
await shot("panel-login");

await browser.close();
console.log(`Saved to ${dir}`);
