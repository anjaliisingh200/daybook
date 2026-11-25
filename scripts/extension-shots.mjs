/**
 * Screenshots of the extension panel (demo build, sample data) for the change log.
 *
 *   npm run extension -- --demo && node scripts/extension-shots.mjs <slug>
 *
 * Saves to docs/changelog/screenshots/<YYYY-MM-DD>-<slug>/.
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const slug = (process.argv[2] ?? "extension").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const dir = `docs/changelog/screenshots/${new Date().toISOString().slice(0, 10)}-${slug}`;
mkdirSync(dir, { recursive: true });
const server = spawn(process.execPath, ["extension/serve.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const BASE = "http://localhost:3300";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${dir}/${name}.png` });
};

try {
  await page.goto(BASE);
  await page.waitForSelector("[data-task]");
  await shot("panel-tasks");

  // a task being dragged: a dashed slot shows where it will land
  await page.waitForTimeout(2500);
  const grabbed = await page.locator("[data-task] >> nth=3").boundingBox();
  const target = await page.locator("[data-task] >> nth=1").boundingBox();
  await page.mouse.move(grabbed.x + 40, grabbed.y + grabbed.height / 2);
  await page.mouse.down();
  await page.mouse.move(grabbed.x + 40, grabbed.y + grabbed.height / 2 - 10, { steps: 3 });
  await page.mouse.move(target.x + 80, target.y + 4, { steps: 12 });
  await shot("panel-task-dragging");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(600);

  await page.click("[data-task] >> nth=2");
  await page.waitForSelector('[role="dialog"][aria-label="Task details"]');
  await shot("panel-task-details");
  await page.keyboard.press("Escape");

  await page.click('[aria-label="Add task"]');
  await page.waitForSelector('[role="dialog"][aria-label="New task"]');
  await shot("panel-new-task");
  await page.keyboard.press("Escape");

  await page.click('[role="tab"]:has-text("Calendar")');
  await page.waitForSelector("[data-event]");
  await shot("panel-calendar");

  // an event being dragged: a dashed copy shows where it will land
  await page.locator('[data-event]:has-text("Client call")').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const ev = await page.locator('[data-event]:has-text("Client call")').boundingBox();
  await page.mouse.move(ev.x + ev.width / 2, ev.y + 10);
  await page.mouse.down();
  await page.mouse.move(ev.x + ev.width / 2, ev.y + 40, { steps: 5 });
  await page.mouse.move(ev.x + ev.width / 2, ev.y + 10 + 150, { steps: 8 });
  await shot("panel-event-dragging");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(500);

  await page.click("[data-event] >> nth=0");
  await page.waitForSelector('[role="dialog"][aria-label="Edit event"]');
  await shot("panel-edit-event");
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { state: "detached" });

  await page.click('[aria-label="Create event"]');
  await page.waitForSelector('[role="dialog"][aria-label="New event"]');
  await shot("panel-new-event");
  await page.keyboard.press("Escape");

  await page.goto(`${BASE}/?login`);
  await page.waitForSelector("form");
  await shot("panel-login");
  console.log(`Saved to ${dir}`);
} finally {
  await browser.close();
  server.kill();
}
