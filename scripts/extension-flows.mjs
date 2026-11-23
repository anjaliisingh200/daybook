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
  check("today's tasks show", start.length === 5, start.join(" | "));

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
