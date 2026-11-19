/**
 * Takes screenshots of the running app for the change log.
 *
 *   npm run shots -- <slug> [--dark]
 *
 * Needs the dev server running on http://localhost:3000. Uses the Edge browser
 * already installed on the machine (no download). Output:
 *   docs/changelog/screenshots/<YYYY-MM-DD>-<slug>/*.png
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const dark = args.includes("--dark");
const slug = (args.find((a) => !a.startsWith("--")) ?? "snapshot").replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
const date = new Date().toISOString().slice(0, 10);
const dir = `docs/changelog/screenshots/${date}-${slug}${dark ? "-dark" : ""}`;
mkdirSync(dir, { recursive: true });

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

/** name, route, viewport, keys pressed after load */
const SHOTS = [
  ["calendar-week", "/calendar", desktop, []],
  ["calendar-month", "/calendar", desktop, ["m"]],
  ["calendar-schedule", "/calendar", desktop, ["a"]],
  ["tasks-week", "/tasks", desktop, []],
  ["tasks-day", "/tasks", desktop, ["d"]],
  ["tasks-month", "/tasks", desktop, ["m"]],
  ["design-system", "/design-system", desktop, []],
  ["calendar-phone", "/calendar", phone, []],
  ["tasks-phone", "/tasks", phone, []],
];

const browser = await chromium.launch({ channel: "msedge", headless: true });
for (const [name, route, viewport, keys] of SHOTS) {
  const isPhone = viewport.width < 500;
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: isPhone ? 2 : 1, isMobile: isPhone, hasTouch: isPhone, colorScheme: dark ? "dark" : "light" });
  await ctx.addInitScript((d) => {
    try {
      sessionStorage.setItem("daybook.overdueShown", "1");
      if (d) localStorage.setItem("daybook.prefs", JSON.stringify({ state: { theme: "dark" }, version: 0 }));
    } catch {}
  }, dark);
  const page = await ctx.newPage();
  await page.goto(BASE + route, { waitUntil: "load" });
  await page.waitForSelector("h1, #overview", { timeout: 60000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(900);
  for (const k of keys) {
    await page.keyboard.press(k);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/${name}.png` });
  console.log("saved", `${dir}/${name}.png`);
  await ctx.close();
}
await browser.close();
console.log("\nDone:", dir);
