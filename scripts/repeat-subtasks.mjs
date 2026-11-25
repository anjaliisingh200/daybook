/**
 * Checks that subtasks are saved for a repeating task and for every one of its repeats (phone size, the website on sample data).
 * Needs the website running on sample data:  node scripts/dev-sample.mjs   (http://localhost:3100)
 *   node scripts/repeat-subtasks.mjs
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

/** The saved tasks named `title`, each with its subtasks' titles. */
const series = (title) =>
  page.evaluate((t) => {
    const all = JSON.parse(localStorage.getItem("daybook.mock.v4") ?? '{"tasks":[]}').tasks;
    return all
      .filter((x) => x.title === t && !x.parentId)
      .map((x) => ({ id: x.id, due: x.due, root: !x.meta.seriesId, subs: all.filter((s) => s.parentId === x.id).map((s) => s.title).sort() }))
      .sort((a, b) => a.due.localeCompare(b.due));
  }, title);
const waitFor = async (fn, ms = 60000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await page.waitForTimeout(500);
  }
  return false;
};
const summary = (rows) => {
  const m = {};
  for (const r of rows) m[r.subs.length] = (m[r.subs.length] ?? 0) + 1;
  return JSON.stringify(m); // { number of subtasks: how many tasks have that many }
};
const allHave = (rows, expected) => rows.length === 31 && rows.every((r) => JSON.stringify(r.subs) === JSON.stringify(expected));

/** Adds a daily task with the given subtasks through the New task form. */
async function addDaily(title, subtasks) {
  const nt = '[role="dialog"][aria-label="New task"]';
  await page.keyboard.press("a");
  await page.waitForSelector(nt);
  await page.fill(`${nt} [aria-label="Title"]`, title);
  await page.click(`${nt} [aria-label="Repeat"]`);
  await page.getByRole("option", { name: "Daily" }).click();
  await page.click(`${nt} button:has-text("Add subtask")`);
  for (const s of subtasks) {
    await page.fill(`${nt} [aria-label="Subtask title"]`, s);
    await page.keyboard.press("Enter");
  }
  await page.click(`${nt} button:has-text("Save")`);
}

try {
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("[data-task]");

  // ── 1. a daily task created with two subtasks, left alone ──
  const tStart = Date.now();
  await addDaily("Stretch", ["Neck", "Shoulders"]);
  const made = await waitFor(async () => (await series("Stretch")).length >= 31, 120000);
  const created = await series("Stretch");
  check("today plus the next 30 days are created", made && created.length >= 31, `${created.length} tasks after ${Math.round((Date.now() - tStart) / 1000)}s`);
  const t0 = Date.now();
  const done = await waitFor(async () => allHave(await series("Stretch"), ["Neck", "Shoulders"]));
  check("every repeat gets both subtasks, with no reload needed", done, `after ${Math.round((Date.now() - t0) / 1000)}s; subtasks per task: ${summary(await series("Stretch"))}`);
  await page.reload();
  await page.waitForTimeout(12000);
  check("after a reload each has exactly both (no doubles)", allHave(await series("Stretch"), ["Neck", "Shoulders"]), `subtasks per task: ${summary(await series("Stretch"))}`);

  // ── 2. the app is closed in the middle of making the repeats ──
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("[data-task]");
  await addDaily("Meditate", ["Breathe", "Sit"]);
  await waitFor(async () => (await series("Meditate")).length >= 20);
  await page.goto(`${BASE}/tasks`); // the interruption: the page is reloaded while the repeats are still being made
  await page.waitForSelector("[data-task]");
  const resumed = await waitFor(async () => allHave(await series("Meditate"), ["Breathe", "Sit"]), 90000);
  check("interrupted in the middle: after reopening, every repeat ends up with both subtasks", resumed, `subtasks per task: ${summary(await series("Meditate"))}`);
  await page.waitForTimeout(8000);
  check("and nothing is doubled once it settles", allHave(await series("Meditate"), ["Breathe", "Sit"]), `subtasks per task: ${summary(await series("Meditate"))}`);

  // ── 3. a subtask added to the original afterwards ──
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("[data-task]");
  await page.click('[data-task]:has-text("Stretch")');
  const det = '[role="dialog"][aria-label="Task details"]';
  await page.waitForSelector(det);
  await page.click(`${det} button:has-text("Add subtask")`);
  await page.fill(`${det} [aria-label="Subtask title"]`, "Back");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  await page.keyboard.press("Escape");
  const handedOn = await waitFor(async () => allHave(await series("Stretch"), ["Back", "Neck", "Shoulders"]), 30000);
  check("a subtask added to the original is on every repeat", handedOn, `subtasks per task: ${summary(await series("Stretch"))}`);
  await page.reload();
  await page.waitForTimeout(12000);
  check("after a reload each has the three exactly once", allHave(await series("Stretch"), ["Back", "Neck", "Shoulders"]), `subtasks per task: ${summary(await series("Stretch"))}`);

  // ── 4. a subtask taken off one day stays off ──
  const rows = await series("Stretch");
  const day3 = rows[3];
  await page.evaluate((id) => {
    const key = "daybook.mock.v4";
    const s = JSON.parse(localStorage.getItem(key));
    s.tasks = s.tasks.filter((t) => !(t.parentId === id && t.title === "Back"));
    localStorage.setItem(key, JSON.stringify(s));
  }, day3.id);
  await page.reload();
  await page.waitForTimeout(12000);
  const after = (await series("Stretch")).find((r) => r.id === day3.id);
  check("a subtask removed from one day does not come back", !after.subs.includes("Back"), JSON.stringify(after.subs));

  // a picture of a later day's repeat with its subtasks (optional: node scripts/repeat-subtasks.mjs <folder>)
  if (process.argv[2]) {
    await page.goto(`${BASE}/tasks`);
    await page.waitForSelector("[data-task]");
    await page.keyboard.press("d");
    await page.keyboard.press("j");
    await page.keyboard.press("j");
    await page.waitForSelector('[data-task]:has-text("Stretch")');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${process.argv[2]}/phone-repeat-with-subtasks.png` });
  }

  check("no errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
