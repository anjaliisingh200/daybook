import { startFakeGoogle, FAKE_EMAIL } from "./fakeGoogle";

let fail = 0;
const eq = (name: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) {
    fail++;
    console.log("FAIL", name, JSON.stringify(a), "!=", JSON.stringify(b));
  } else console.log("ok  ", name);
};

async function main() {
  const google = await startFakeGoogle();
  // Must be set before the Google modules are first loaded: they read it once.
  process.env.GOOGLE_TEST_ORIGIN = google.origin;
  process.env.GOOGLE_CLIENT_ID = "id";
  process.env.GOOGLE_CLIENT_SECRET = "secret";
  process.env.GOOGLE_TOKEN_KEY = "k".repeat(40);

  const { decrypt, encrypt, sign, unsign, challengeOf } = await import("../lib/google/crypto");
  const { GoogleAuthError, accessTokenFor, emailFromIdToken, exchangeCode, gget } = await import("../lib/google/api");
  const { googleSnapshot } = await import("../lib/google/snapshot");
  const { googleConfigured } = await import("../lib/google/config");
  const { eventId, mapCalendar, mapEvent, mapTask, splitEventId } = await import("../lib/google/map");

  // ── crypto ──
  const enc = encrypt("1//refresh-token");
  eq("encrypt hides the token", enc.includes("refresh"), false);
  eq("decrypt round trip", decrypt(enc), "1//refresh-token");
  eq("a different key cannot read it", (() => { try { decrypt(enc, "z".repeat(40)); return "read"; } catch { return "refused"; } })(), "refused");
  const tampered = enc.slice(0, -2) + (enc.endsWith("AA") ? "BB" : "AA");
  eq("tampering is detected", (() => { try { decrypt(tampered); return "read"; } catch { return "refused"; } })(), "refused");
  eq("two encryptions differ", encrypt("x") !== encrypt("x"), true);
  eq("signed value verifies", unsign(sign("hello")), "hello");
  eq("forged value is refused", unsign("hello.forged"), null);
  eq("PKCE challenge is base64url sha256", challengeOf("abc"), "ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0");
  eq("configured with all three values", googleConfigured(), true);

  // ── mapping ──
  eq("event id carries the calendar", splitEventId(eventId("a@b.com", "xyz")), { calendarId: "a@b.com", eventId: "xyz" });
  eq("calendar: reader is read-only, override name wins", mapCalendar({ id: "c", summary: "S", summaryOverride: "O", accessRole: "reader", backgroundColor: "#16a765" }), { id: "c", name: "O", color: "#16a765", readOnly: true });
  const cal = { id: "me@example.com", timeZone: "Asia/Kolkata" };
  const timed = mapEvent({ id: "e", summary: "A", start: { dateTime: "2026-11-23T10:00:00+05:30", timeZone: "Asia/Kolkata" }, end: { dateTime: "2026-11-23T11:00:00+05:30" } }, cal)!;
  eq("timed event instants", [new Date(timed.start).toISOString(), new Date(timed.end).toISOString(), timed.tz, timed.allDay], ["2026-11-23T04:30:00.000Z", "2026-11-23T05:30:00.000Z", "Asia/Kolkata", false]);
  const allDay = mapEvent({ id: "e", summary: "Trip", start: { date: "2026-11-24" }, end: { date: "2026-11-26" } }, cal)!;
  eq("all-day end is the last day, not the day after", [allDay.startDate, allDay.endDate, allDay.allDay], ["2026-11-24", "2026-11-25", true]);
  const oneDay = mapEvent({ id: "e", start: { date: "2026-12-25" }, end: { date: "2026-12-26" } }, cal)!;
  eq("one-day all-day event", [oneDay.startDate, oneDay.endDate, oneDay.title], ["2026-12-25", "2026-12-25", "(No title)"]);
  eq("cancelled event skipped", mapEvent({ id: "e", status: "cancelled", start: { date: "2026-12-25" }, end: { date: "2026-12-26" } }, cal), null);
  eq("declined event skipped", mapEvent({ id: "e", start: { date: "2026-12-25" }, end: { date: "2026-12-26" }, attendees: [{ self: true, responseStatus: "declined" }] }, cal), null);
  eq("due date is the first ten characters (no time-zone shift)", mapTask({ id: "t", due: "2026-11-21T00:00:00.000Z" }, "L")?.due, "2026-11-21");
  eq("deleted task skipped", mapTask({ id: "t", deleted: true }, "L"), null);
  eq("completed task", ((t) => [t?.status, t?.completedAt === Date.parse("2026-11-12T09:00:00.000Z")])(mapTask({ id: "t", status: "completed", completed: "2026-11-12T09:00:00.000Z" }, "L")), ["completed", true]);

  // ── talking to Google ──
  eq("id token email", emailFromIdToken(`x.${Buffer.from(JSON.stringify({ email: FAKE_EMAIL })).toString("base64url")}.y`), FAKE_EMAIL);
  const granted = await exchangeCode("fake-code", "verifier", "http://localhost/cb");
  eq("code exchange gives a refresh token", [granted.refresh_token, emailFromIdToken(granted.id_token)], ["fake-refresh", FAKE_EMAIL]);
  const access = await accessTokenFor("fake-refresh");
  eq("refresh token gives an access token", access, "fake-access");

  const snap = await googleSnapshot(access, Date.parse("2026-11-22T00:00:00Z"));
  eq("calendars: hidden and deleted left out", snap.calendars.map((c) => [c.id, c.name, c.readOnly, !!c.primary]), [["me@example.com", "Anjali", false, true], ["holidays@group.v.calendar.google.com", "India holidays", true, false]]);
  eq("events: paged, cancelled and declined dropped", snap.events.map((e) => e.title).sort(), ["(No title)", "Christmas", "Design review", "Offsite", "Weekly sync"]);
  const sync = snap.events.find((e) => e.title === "Weekly sync")!;
  eq("repeating occurrence keeps its series id", sync.recurringEventId, "e5");
  const review = snap.events.find((e) => e.title === "Design review")!;
  eq("event details", [review.location, review.meetLink, review.guests, review.id], ["Room 4", "https://meet.google.com/abc", ["riya@example.com"], "me@example.com|e1"]);
  eq("task lists", snap.lists.map((l) => [l.id, l.title]), [["L1", "My Tasks"], ["L2", "Work"]]);
  eq("tasks: deleted dropped, all lists read", snap.tasks.map((t) => t.title).sort(), ["Book flights", "No date", "Pay rent", "Ship the release", "Sub step"]);
  const rent = snap.tasks.find((t) => t.title === "Pay rent")!;
  eq("task fields", [rent.due, rent.notes, rent.status, rent.listId, rent.parentId], ["2026-11-21", "Before noon", "needsAction", "L1", null]);
  eq("subtask keeps its parent", snap.tasks.find((t) => t.title === "Sub step")?.parentId, "t1");
  eq("undated task", snap.tasks.find((t) => t.title === "No date")?.due, null);

  // ── failure handling ──
  google.fail.rateLimitOnce = true;
  eq("a rate-limit answer is retried", (await gget<{ items: unknown[] }>(access, "/tasks/v1/users/@me/lists")).items.length, 2);
  google.fail.apiUnauthorized = true;
  eq("401 from Google means connect again", await gget(access, "/tasks/v1/users/@me/lists").then(() => "ok", (e) => e instanceof GoogleAuthError), true);
  google.fail.apiUnauthorized = false;
  google.fail.tokenInvalidGrant = true;
  eq("revoked permission means connect again", await accessTokenFor("fake-refresh").then(() => "ok", (e) => e instanceof GoogleAuthError), true);

  await google.close();
  if (fail) {
    console.log(`\n${fail} FAILED`);
    process.exit(1);
  }
  console.log("\nall passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
