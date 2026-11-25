/**
 * Clicks through the panel (demo build, sample data) and checks the website's own screens work inside it:
 * open a task's details, edit it, add a subtask, complete and delete it; add a task; add an event.
 *
 *   npm run extension -- --demo && node scripts/extension-flows.mjs
 */
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";

const server = spawn(process.execPath, ["extension/serve.mjs"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const BASE = "http://localhost:3300";

let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 400, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const titles = () => page.$$eval("[data-task] h3", (els) => els.map((e) => e.textContent));
const details = '[role="dialog"][aria-label="Task details"]';

try {
  await page.goto(BASE);
  await page.waitForSelector("[data-task]");
  const start = await titles();
  check("today's tasks show", start.length >= 5, start.join(" | "));
  // the website's housekeeping adds a task for each event a moment after loading: let the list settle first
  await page.waitForTimeout(2500);

  // ── drag a task to another place in today's list ──
  // a real mouse drag: press on the card, move in steps, let go at the target point
  const dragCard = async (from, x, y) => {
    const b = await from.boundingBox();
    await page.mouse.move(b.x + 40, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + 40, b.y + b.height / 2 + 10, { steps: 3 });
    await page.mouse.move(x, y, { steps: 14 });
    await page.waitForTimeout(150);
    await page.mouse.up();
  };
  const before3 = await titles();
  const firstBox = await page.locator("[data-task]").first().boundingBox();
  await dragCard(page.locator("[data-task]:has-text('Read')"), firstBox.x + 80, firstBox.y + 4);
  await page.waitForFunction((first) => document.querySelector("[data-task] h3")?.textContent !== first, before3[0], { timeout: 5000 }).catch(() => {});
  const after3 = await titles();
  check("dragging a task to the top moves it there", after3[0]?.startsWith("Read") && after3.length === before3.length, after3.join(" | "));
  const lastBox = await page.locator("[data-task]").last().boundingBox();
  await dragCard(page.locator("[data-task]:has-text('Read')"), lastBox.x + 80, lastBox.y + lastBox.height + 70); // below the last card (the drop slot pushes the cards down while dragging)
  await page.waitForTimeout(600);
  const after4 = await titles();
  // (the sample data may add one more event-linked task at the very end a moment later, so check it is after the one that was last)
  const lastTitle = lastBox ? after4.findIndex((t) => t.startsWith("Write usability")) : -1;
  check("dragging it to the bottom moves it there", lastTitle >= 0 && after4.findIndex((t) => t.startsWith("Read")) > lastTitle, after4.join(" | "));
  check("a drag does not open the task", !(await page.$('[role="dialog"]')));

  // ── task details (the website's own sheet) ──
  await page.click("[data-task]:has-text('Collect parcel')");
  await page.waitForSelector(details);
  const text = await page.textContent(details);
  check("the sheet has the website's fields", ["Title", "Description", "Date", "Time", "Repeat", "Priority", "Calendar", "Subtasks"].every((w) => text.includes(w)));
  await page.fill(`${details} [aria-label="Title"]`, "Collect the parcel from the locker");
  await page.fill(`${details} [aria-label="Description"]`, "Locker 14");
  await page.click(`${details} [role="radio"]:has-text("High")`);
  await page.click(`${details} button:has-text("Add subtask")`);
  await page.fill(`${details} [aria-label="Subtask title"]`, "Take ID");
  await page.keyboard.press("Enter");
  await page.waitForSelector(`${details} :text("Take ID")`);
  check("a subtask is added in the sheet", true);
  await page.keyboard.press("Escape");
  await page.waitForSelector(details, { state: "detached" });
  // the card catches up a moment after the sheet closes (the website saves the title as the sheet closes)
  await page
    .waitForFunction(() => /Collect the parcel from the locker/.test(document.body.textContent ?? "") && /Take ID/.test(document.body.textContent ?? ""), null, { timeout: 5000 })
    .catch(() => {});
  const card = await page.textContent("[data-task]:has-text('Collect the parcel')");
  check("the edited title, priority and subtask show on the card", card.includes("Collect the parcel from the locker") && card.includes("High") && card.includes("Take ID"));

  await page.click("[data-task]:has-text('Collect the parcel')");
  await page.waitForSelector(details);
  await page.click(`${details} button:has-text("Mark the task as complete")`);
  await page.waitForSelector(`${details} button:has-text("Task completed")`);
  check("mark as complete works", true);
  await page.click(`${details} button:has-text("Delete")`);
  await page.click('[role="dialog"] button:has-text("Delete") >> nth=-1');
  await page.waitForFunction(() => !document.body.textContent.includes("Collect the parcel from the locker"));
  check("delete removes the task", !(await titles()).some((t) => t.includes("Collect the parcel")));

  // ── a new task (the website's own form) ──
  await page.click('[aria-label="Add task"]');
  const nt = '[role="dialog"][aria-label="New task"]';
  await page.waitForSelector(nt);
  await page.fill(`${nt} [aria-label="Title"]`, "Book the dentist");
  await page.click(`${nt} button:has-text("Save")`);
  await page.waitForSelector("[data-task]:has-text('Book the dentist')");
  check("a new task is added for today", true);


  // ── a new event (the website's own form) ──
  await page.click('[role="tab"]:has-text("Calendar")');
  await page.waitForSelector("[data-event]");
  const before = await page.$$eval("[data-event]", (e) => e.length);
  await page.click('[aria-label="Create event"]');
  const ev = '[role="dialog"][aria-label="New event"]';
  await page.waitForSelector(ev);
  const evText = await page.textContent(ev);
  check("the event form has the website's fields", ["Title", "Description", "Date", "Time", "Repeat", "Calendar"].every((w) => evText.includes(w)));
  await page.fill(`${ev} [aria-label="Event title"]`, "Dentist");
  await page.click(`${ev} button:has-text("Save")`);
  await page.waitForSelector(ev, { state: "detached" });
  await page.waitForTimeout(500);
  check("the event is on the timeline", (await page.$$eval("[data-event]", (e) => e.length)) === before + 1 && (await page.textContent("main")).includes("Dentist"));

  // drag the new event one hour later on the timeline
  const evCard = page.locator('[data-event]:has-text("Dentist")');
  const timeOf = async () => (await evCard.textContent()).match(/\d{1,2}(:\d{2})?\s?[AP]M/)?.[0];
  await evCard.waitFor();
  await evCard.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const t0 = await timeOf();
  const box = await evCard.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 10 + 60, { steps: 6 });
  await page.mouse.move(box.x + box.width / 2, box.y + 10 + 120, { steps: 6 });
  check("a dashed copy shows where the event will land", await page.$$eval(".border-dashed", (e) => e.length > 0));
  await page.mouse.up();
  await page.waitForTimeout(700);
  const t1 = await timeOf();
  check("dragging an event moves it an hour later", !!t0 && !!t1 && t0 !== t1, `${t0} -> ${t1}`);
  check("a drag does not open the event", !(await page.$('[role="dialog"]')));

  // Escape cancels a drag: the event stays where it was, and letting go afterwards opens nothing
  const t2 = await timeOf();
  const box2 = await evCard.boundingBox();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + 10);
  await page.mouse.down();
  await page.mouse.move(box2.x + box2.width / 2, box2.y + 10 + 60, { steps: 6 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.waitForTimeout(500);
  check("Escape cancels a drag: the event stays and nothing opens", (await timeOf()) === t2 && !(await page.$('[role="dialog"]')), `${t2} -> ${await timeOf()}`);

  // clicking an event opens the event page straight away, not the quick view
  await page.click('[data-event]:has-text("Dentist")');
  await page.waitForSelector('[role="dialog"][aria-label="Edit event"]');
  check("clicking an event opens its edit page", (await page.inputValue('[role="dialog"][aria-label="Edit event"] [aria-label="Event title"]')) === "Dentist");
  check("the quick view is skipped", (await page.$$('[role="dialog"]')).length === 1);
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { state: "detached" });

  // an event comes with its task, as on the website
  await page.click('[role="tab"]:has-text("Tasks")');
  await page.waitForTimeout(500);
  check("the event also shows as a task today", (await titles()).includes("Dentist"));

  // ── the day row: on top, with chevrons, and the tab stays where it is ──
  const heading = async () => (await page.textContent("h1"))?.trim();
  const selectedTab = async () => (await page.textContent('[role="tab"][aria-selected="true"]'))?.trim();
  const rowOrder = await page.evaluate(() => {
    const h1 = document.querySelector("h1")?.getBoundingClientRect().top ?? 0;
    const tabs = document.querySelector('[role="tablist"]')?.getBoundingClientRect().top ?? 0;
    return h1 < tabs;
  });
  check("the day row is above the tabs", rowOrder);
  const prevBtn = '[aria-label="Previous day"]';
  const nextBtn = '[aria-label="Next day"]';
  const bar = await page.evaluate(() => {
    const h1 = document.querySelector("h1").getBoundingClientRect();
    const p = document.querySelector('[aria-label="Previous day"]').getBoundingClientRect();
    const n = document.querySelector('[aria-label="Next day"]').getBoundingClientRect();
    return p.right <= h1.left + 2 && n.left >= h1.right - 2;
  });
  check("a chevron sits at each end of the day row", bar);

  await page.click('[role="tab"]:has-text("Tasks")');
  const day0 = await heading();
  await page.click(nextBtn);
  const day1 = await heading();
  check("Tasks: Next day shows the next day and stays on Tasks", day1 !== day0 && (await selectedTab()).includes("Tasks"), `${day0} -> ${day1}`);
  await page.click('[aria-label="Add task"]');
  const nt2 = '[role="dialog"][aria-label="New task"]';
  await page.waitForSelector(nt2);
  await page.fill(`${nt2} [aria-label="Title"]`, "Tomorrow thing");
  await page.click(`${nt2} button:has-text("Save")`);
  await page.waitForSelector("[data-task]:has-text('Tomorrow thing')");
  check("a task added on the next day is on that day", true);
  await page.click(prevBtn);
  await page.waitForTimeout(400);
  check("and it is not on today", !(await titles()).includes("Tomorrow thing") && (await heading()) === day0);
  await page.click(nextBtn);
  await page.waitForTimeout(400);
  check("Next day shows it again", (await titles()).includes("Tomorrow thing"));

  await page.click('[role="tab"]:has-text("Calendar")');
  await page.waitForSelector("[data-event], [aria-label^='Create event']");
  const calDay = await heading();
  check("switching tab keeps the day", calDay === day1, `${calDay}`);
  await page.click(nextBtn);
  const day2 = await heading();
  check("Calendar: Next day shows the day after and stays on Calendar", day2 !== day1 && (await selectedTab()).includes("Calendar"), `${day1} -> ${day2}`);
  check("no \"Now\" line on another day", (await page.$$('[aria-label^="Now,"]')).length === 0);
  await page.click(prevBtn);
  await page.click(prevBtn);
  await page.waitForTimeout(500);
  check("two steps back is today again, with its \"Now\" line", (await heading()) === day0 && (await page.$$('[aria-label^="Now,"]')).length === 1 && (await selectedTab()).includes("Calendar"));
  await page.click(prevBtn);
  check("Previous day goes to yesterday", (await heading()) !== day0);

  check("no errors in the panel", errors.length === 0, errors.join(" | "));
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
  await page.screenshot({ path: `${process.env.TEMP}/panel-flow-failure.png` });
} finally {
  await browser.close();
  server.kill();
}
process.exit(failed ? 1 : 0);
