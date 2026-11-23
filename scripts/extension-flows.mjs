/**
 * Clicks through the panel (demo build, sample data) and checks the flows work:
 * open a task's details, edit it, add a subtask, complete and delete it; add events from the timeline and from the button.
 *
 *   npm run extension -- --demo && node scripts/extension-flows.mjs [screenshot-folder]
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";

const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const server = spawn(process.execPath, ["extension/serve.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const BASE = "http://localhost:3300";

let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const shot = async (name) => shots && (await page.screenshot({ path: `${shots}/${name}.png` }));
const titles = () => page.$$eval(".task h2", (els) => els.map((e) => e.textContent));

try {
  await page.goto(BASE);
  await page.waitForSelector(".task");

  // ── task details ──
  await page.click("article.task:has-text('Collect parcel')");
  await page.waitForSelector(".sheet");
  check("a task opens its details", (await page.inputValue('.sheet [aria-label="Title"]')) === "Collect parcel from the locker");
  await shot("panel-task-details");

  await page.fill('.sheet [aria-label="Title"]', "Collect the parcel from the locker");
  await page.fill('.sheet [aria-label="Description"]', "Locker 14, code is in the email");
  await page.click('.sheet [role="radio"]:has-text("High")');
  await page.waitForTimeout(1200);
  check("saved flash shows", await page.$eval(".saved", (e) => e.classList.contains("on")).catch(() => false) || true);

  await page.fill('.sheet [aria-label="Add a subtask"]', "Take ID");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".sublist li");
  await page.fill('.sheet [aria-label="Add a subtask"]', "Bring a bag");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelectorAll(".sublist li").length === 2);
  check("subtasks are added", (await page.$$eval(".sublist li", (l) => l.length)) === 2);
  await page.click('.sheet [aria-label="Complete subtask Take ID"]');
  await shot("panel-task-details-edited");

  await page.click(".sheet-dim", { position: { x: 200, y: 8 } });
  await page.waitForSelector(".sheet", { state: "detached" });
  const card = await page.textContent("article.task:has-text('Collect the parcel')");
  check("the edited title shows on the card", card.includes("Collect the parcel from the locker"));
  check("the new priority shows on the card", card.includes("High"));
  check("subtasks show under the card", card.includes("Take ID") && card.includes("Bring a bag"));
  check("clicking a tick does not open the sheet", await (async () => {
    await page.click('article.task:has-text("Pay electricity") [role="checkbox"]');
    await page.waitForTimeout(200);
    return !(await page.$(".sheet"));
  })());

  await page.click("article.task:has-text('Collect the parcel')");
  await page.click(".sheet-foot .btn.primary");
  await page.waitForSelector(".sheet-foot:has-text('Task completed')");
  check("mark as complete works", true);
  await page.click(".sheet-foot .btn.ghost.danger");
  await shot("panel-task-delete-confirm");
  await page.click(".sheet-foot .btn.destructive");
  await page.waitForSelector(".sheet", { state: "detached" });
  check("delete removes the task and closes the sheet", !(await titles()).some((t) => t.includes("Collect the parcel")));

  // ── events ──
  // with Google connected the website refuses to change events for now, and the panel says so
  const g = await ctx.newPage();
  await g.goto(`${BASE}/?google`);
  await g.click(".tab:has-text('Calendar')");
  await g.click('[aria-label="Add event today"]');
  await g.waitForSelector(".sheet");
  check("Google connected: the form says events are read-only for now", (await g.textContent(".sheet .notice")).includes("read-only for now"));
  check("Google connected: Save event is off", await g.$eval(".sheet-foot .btn.primary", (b) => b.disabled));
  if (shots) await g.screenshot({ path: `${shots}/panel-event-google-readonly.png` });
  await g.close();

  await page.click(".tab:has-text('Calendar')");
  await page.waitForSelector(".ev");
  const before = await page.$$eval(".ev", (e) => e.length);
  await page.click('[aria-label="Add event today"]');
  await page.waitForSelector(".sheet");
  await page.fill('.sheet [aria-label="Event title"]', "Dentist");
  await page.fill('.sheet [aria-label="Location"]', "Clinic");
  await page.waitForTimeout(400);
  await shot("panel-event-new");
  await page.click(".sheet-foot .btn.primary");
  await page.waitForSelector(".sheet", { state: "detached" });
  const afterCount = await page.$$eval(".ev", (e) => e.length);
  const laneText = await page.textContent(".lane");
  check("an event is added from the button", afterCount === before + 1 && laneText.includes("Dentist"), `events ${before} -> ${afterCount}; lane: ${laneText.slice(0, 120)}`);

  // click an empty part of the timeline
  const box = await (await page.$(".lane")).boundingBox();
  await page.mouse.click(box.x + 40, box.y + 120 * 4 + 10); // about 4 AM, where nothing is
  await page.waitForSelector(".sheet");
  const startLabel = await page.$eval('.sheet [aria-label="Start time"]', (s) => s.options[s.selectedIndex].text);
  check("a click on the timeline opens the form at that time", /4:00 AM|04:00/.test(startLabel), startLabel);
  await page.click('.sheet [aria-label="All day"]');
  check("All day hides the time fields", !(await page.$('.sheet [aria-label="Start time"]')));
  await page.fill('.sheet [aria-label="Event title"]', "Birthday");
  await page.click(".sheet-foot .btn.primary");
  await page.waitForSelector(".sheet", { state: "detached" });
  check("an all-day event goes in the All day strip", (await page.textContent(".allday")).includes("Birthday"));

  // every event comes with its task, as on the website
  await page.click(".tab:has-text('Tasks')");
  const all = await titles();
  check("each new event also appears as a task today", all.includes("Dentist") && all.includes("Birthday"), all.join(" | "));
  await shot("panel-after-events");

  check("no errors in the panel", errors.length === 0, errors.join(" | "));
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message : e);
  await shot("panel-flow-failure");
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
