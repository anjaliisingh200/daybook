/**
 * Loads the REAL build (extension/dist) into Edge and runs the signed-in path against a pretend Supabase and a pretend
 * Daybook site, so no real account or password is used. Checks that:
 *   the panel reads tasks from Supabase and Google events from the site, sending the login as an Authorization header;
 *   ticking a task saves to Supabase.
 *
 *   npm run extension && node scripts/extension-signed-in.mjs
 */
import { chromium } from "playwright-core";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const dist = resolve("extension/dist");
const hosts = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8")).host_permissions;
const supabaseOrigin = new URL(hosts[0].replace("/*", "")).origin;
const siteOrigin = new URL(hosts[hosts.length - 1].replace("/*", "")).origin;

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
const task = (id, title, extra = {}) => ({ id, listId: "l_my", parentId: null, title, notes: "", status: "needsAction", due: today, completedAt: null, created: 1000, updated: 1000, position: 1, meta: {}, ...extra });
const at14 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0).getTime();

const db = {
  task_lists: [{ id: "l_my", title: "My Tasks", color: "taupe" }],
  tasks: [task("t1", "Reply to the pretend email", { created: 2000 }), task("t2", "Water the plants")],
  calendars: [{ id: "c_me", name: "My calendar", color: "#3F51B5", readOnly: false, primary: true }],
  events: [],
};
const google = {
  lists: [],
  tasks: [],
  calendars: [{ id: "primary", name: "Google Calendar", color: "terracotta", readOnly: false, primary: true }],
  events: [{ id: "g1", calendarId: "primary", title: "Pretend stand-up", allDay: false, start: at14, end: at14 + 30 * 60_000, tz, created: 0, updated: 0 }],
  syncedAt: Date.now(),
  features: { calendarList: false, tasks: false },
};

const profile = mkdtempSync(join(tmpdir(), "daybook-ext-"));
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

const siteCalls = [];
const writes = [];
const json = (body, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body), headers: { "access-control-allow-origin": "*" } });

await ctx.route(`${supabaseOrigin}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const m = /\/rest\/v1\/(\w+)/.exec(url.pathname);
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (!m) return route.fulfill(json({}));
  const table = m[1];
  if (req.method() === "GET") {
    const id = url.searchParams.get("id");
    const rows = db[table] ?? [];
    const pick = id ? rows.filter((r) => `eq.${r.id}` === id) : rows;
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    return route.fulfill(json(single ? (pick[0] ? { data: pick[0] } : {}) : pick.map((r) => ({ data: r })), single && !pick[0] ? 406 : 200));
  }
  if (req.method() === "POST" || req.method() === "PATCH") {
    const body = JSON.parse(req.postData() ?? "{}");
    const list = Array.isArray(body) ? body : [body];
    for (const r of list) {
      writes.push({ table, row: r });
      const rows = (db[table] ??= []);
      const i = rows.findIndex((x) => x.id === r.id);
      if (i >= 0) rows[i] = r.data;
      else rows.push(r.data);
    }
    return route.fulfill({ status: 201, contentType: "application/json", body: "[]", headers: { "access-control-allow-origin": "*" } });
  }
  return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
});
await ctx.route(`${siteOrigin}/api/google/**`, async (route) => {
  const req = route.request();
  siteCalls.push({ path: new URL(req.url()).pathname, auth: req.headers()["authorization"] ?? null });
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" } });
  const path = new URL(req.url()).pathname;
  return route.fulfill(json(path.endsWith("/status") ? { configured: true, connected: true, email: "me@example.com" } : google));
});

try {
  const worker = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  const id = new URL(worker.url()).host;
  // a saved login, as the panel would have stored it after logging in
  await worker.evaluate((s) => chrome.storage.local.set({ "daybook.extension.auth": JSON.stringify(s) }), {
    access_token: "fake-access-token",
    refresh_token: "fake-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "user-1", aud: "authenticated", role: "authenticated", email: "me@example.com", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  });

  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`chrome-extension://${id}/panel.html`);
  await page.waitForSelector("[data-task]", { timeout: 15000 });
  const titles = await page.$$eval("[data-task] h3", (els) => els.map((e) => e.textContent));
  check("logged in: today's tasks come from Supabase", titles.length === 2 && titles.includes("Water the plants"), titles.join(" | "));

  await page.click('[role="tab"]:has-text("Calendar")');
  await page.waitForSelector("[data-event]", { timeout: 15000 });
  check("Google events come from the Daybook site", (await page.textContent("main")).includes("Pretend stand-up"));
  const status = siteCalls.find((c) => c.path.endsWith("/status"));
  const snap = siteCalls.find((c) => c.path.endsWith("/snapshot"));
  check("the site is asked who is logged in with the Authorization header", status?.auth === "Bearer fake-access-token" && snap?.auth === "Bearer fake-access-token", JSON.stringify(siteCalls.map((c) => [c.path, !!c.auth])));

  await page.click('[role="tab"]:has-text("Tasks")');
  await page.click('[aria-label="Complete Water the plants"]');
  await page.waitForTimeout(800);
  const saved = writes.find((w) => w.table === "tasks" && w.row.id === "t2");
  check("ticking a task saves it to Supabase", saved?.row.data.status === "completed", JSON.stringify(saved?.row.data?.status));
  check("no errors in the panel", errors.length === 0, errors.join(" | "));
} catch (e) {
  failed = true;
  console.log("FAIL", e instanceof Error ? e.message.split("\n")[0] : e);
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
