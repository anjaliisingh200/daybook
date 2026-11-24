/**
 * Checks that deleting a repeating task sticks (phone size, the website on sample data).
 * Needs the website running on sample data, e.g.
 *   NEXT_PUBLIC_SUPABASE_URL= NEXT_PUBLIC_SUPABASE_ANON_KEY= NEXT_DIST_DIR=.next-e2e npx next dev -p 3100
 *   BASE_URL=http://localhost:3100 node scripts/repeat-delete.mjs
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

const tasksNamed = (title) =>
  page.evaluate((t) => JSON.parse(localStorage.getItem("daybook.mock.v4") ?? '{"tasks":[]}').tasks.filter((x) => x.title === t && !x.parentId), title);
const waitFor = async (fn, ms = 40000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return true;
    await page.waitForTimeout(400);
  }
  return false;
};
const today = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();
const dialogDelete = '[role="dialog"] button:has-text("Delete") >> nth=-1';

/** Adds a daily repeating task for today and waits until its repeats have been created. */
async function addDaily(title) {
  await page.keyboard.press("a");
  await page.waitForSelector('[role="dialog"][aria-label="New task"]');
  await page.fill('[role="dialog"][aria-label="New task"] [aria-label="Title"]', title);
  await page.click('[role="dialog"][aria-label="New task"] [aria-label="Repeat"]');
  await page.getByRole("option", { name: "Daily" }).click();
  await page.click('[role="dialog"][aria-label="New task"] button:has-text("Save")');
  const ok = await waitFor(async () => (await tasksNamed(title)).length >= 31);
  check(`"${title}": today plus the next 30 days are created`, ok, String((await tasksNamed(title)).length));
}

async function openCard(title) {
  await page.click(`[data-task]:has-text("${title}")`);
  await page.waitForSelector('[role="dialog"][aria-label="Task details"]');
}

try {
  await page.goto(`${BASE}/tasks`);
  await page.waitForSelector("[data-task]");
  await page.keyboard.press("d"); // day view
  await page.waitForTimeout(500);

  // ── 1. delete the original, "only this task" ──
  await addDaily("Water plants");
  await openCard("Water plants");
  await page.click('[role="dialog"][aria-label="Task details"] button:has-text("Delete")');
  await page.waitForSelector('[role="radiogroup"][aria-label="Which tasks to delete"]');
  const asks = await page.textContent('[role="radiogroup"][aria-label="Which tasks to delete"]');
  check("a repeating task asks which ones to delete", asks.includes("Only this task") && asks.includes("All tasks in the series"));
  if (process.argv[2]) {
    await page.waitForTimeout(5500); // let the "Added to…" message from creating the task go away
    await page.screenshot({ path: `${process.argv[2]}/phone-delete-repeating-task.png` });
  }
  await page.click(dialogDelete);
  await waitFor(async () => (await tasksNamed("Water plants")).length === 30);
  let left = await tasksNamed("Water plants");
  check("only today's was deleted", left.length === 30 && !left.some((t) => t.due === today), `${left.length} left`);
  const root = left.filter((t) => !t.meta.seriesId);
  check("the next one became the original", root.length === 1 && root[0].meta.repeat === "daily", JSON.stringify(root.map((t) => [t.due, t.meta.repeat])));

  await page.reload();
  await page.waitForSelector("[data-task], .skeleton, main", { timeout: 15000 });
  await page.waitForTimeout(9000); // long enough for the repeats to be topped up again, if they were going to
  left = await tasksNamed("Water plants");
  check("after a reload it has NOT come back", left.length === 30 && !left.some((t) => t.due === today), `${left.length} left`);

  // ── 2. delete a later repeat, "only this task" ──
  await page.keyboard.press("d");
  await page.keyboard.press("j");
  await page.keyboard.press("j"); // two days ahead: a repeat, not the original
  await page.waitForSelector('[data-task]:has-text("Water plants")', { timeout: 10000 });
  const target = (await tasksNamed("Water plants")).find((t) => t.meta.seriesId && t.due > today);
  await openCard("Water plants");
  await page.click('[role="dialog"][aria-label="Task details"] button:has-text("Delete")');
  await page.waitForSelector('[role="radiogroup"][aria-label="Which tasks to delete"]');
  await page.click(dialogDelete);
  await waitFor(async () => (await tasksNamed("Water plants")).length === 29);
  left = await tasksNamed("Water plants");
  check("a later repeat was deleted on its own", left.length === 29, `${left.length} left`);
  const skipped = left.find((t) => !t.meta.seriesId)?.meta.skip ?? [];
  check("its date is remembered on the original", skipped.length === 1, JSON.stringify(skipped));
  await page.reload();
  await page.waitForTimeout(9000);
  left = await tasksNamed("Water plants");
  const deletedDate = skipped[0];
  check("after a reload that repeat has NOT come back", left.length === 29 && !left.some((t) => t.due === deletedDate), `${left.length} left; skipped ${deletedDate}; target was ${target?.due}`);

  // ── 3. delete the whole series ──
  await page.keyboard.press("t"); // back to today
  await page.keyboard.press("j"); // tomorrow, where the original now is
  await page.waitForSelector('[data-task]:has-text("Water plants")', { timeout: 10000 });
  await openCard("Water plants");
  await page.click('[role="dialog"][aria-label="Task details"] button:has-text("Delete")');
  await page.waitForSelector('[role="radiogroup"][aria-label="Which tasks to delete"]');
  await page.click('[role="radio"]:has-text("All tasks in the series")');
  await page.click(dialogDelete);
  await waitFor(async () => (await tasksNamed("Water plants")).length === 0);
  check("all tasks in the series were deleted", (await tasksNamed("Water plants")).length === 0);
  await page.reload();
  await page.waitForTimeout(9000);
  check("after a reload the series has NOT come back", (await tasksNamed("Water plants")).length === 0, String((await tasksNamed("Water plants")).length));

  check("no errors", errors.length === 0, errors.join(" | "));
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await browser.close();
}
process.exit(failed ? 1 : 0);
