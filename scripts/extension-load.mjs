/**
 * Loads the built extension (extension/dist) into the Edge browser already on this machine and checks that it starts:
 * the manifest is accepted, the background worker runs, the icon is set to open the side panel, and the panel shows
 * the login screen without errors. No account is used; nothing is typed into any field.
 *
 *   npm run extension && node scripts/extension-load.mjs
 */
import { chromium } from "playwright-core";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dist = resolve("extension/dist");
const profile = mkdtempSync(join(tmpdir(), "daybook-ext-"));
const shotDir = process.argv[2];
if (shotDir) mkdirSync(shotDir, { recursive: true });

const ctx = await chromium.launchPersistentContext(profile, {
  channel: "msedge",
  headless: false,
  viewport: { width: 400, height: 800 },
  args: [`--disable-extensions-except=${dist}`, `--load-extension=${dist}`],
});

let failed = false;
const check = (name, ok, detail = "") => {
  if (!ok) failed = true;
  console.log(ok ? "ok  " : "FAIL", name, detail);
};

try {
  const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  const id = new URL(worker.url()).host;
  check("background worker is running", worker.url().endsWith("/background.js"), id);

  const behavior = await worker.evaluate(() => chrome.sidePanel.getPanelBehavior());
  check("toolbar icon opens the side panel", behavior.openPanelOnActionClick === true);

  const manifest = await worker.evaluate(() => chrome.runtime.getManifest());
  check("manifest: side panel is panel.html", manifest.side_panel?.default_path === "panel.html");
  check("manifest: only storage and sidePanel permissions", JSON.stringify(manifest.permissions) === JSON.stringify(["storage", "sidePanel"]), JSON.stringify(manifest.permissions));

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(`chrome-extension://${id}/panel.html`);
  await page.waitForSelector(".login", { timeout: 10000 });
  check("signed out: the login form shows", (await page.textContent(".login h1")) === "Log in");
  check("no errors in the panel", errors.length === 0, errors.join(" | "));
  if (shotDir) await page.screenshot({ path: join(shotDir, "extension-login.png") });
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message : e);
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
