import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

/**
 * A small stand-in for Google, so the connection can be tested without a real account.
 * Point the app at it with GOOGLE_TEST_ORIGIN. It follows the real shapes of the Calendar and Tasks APIs.
 */
export interface FakeGoogle {
  origin: string;
  close: () => Promise<void>;
  /** Make the next calls behave badly. */
  fail: { tokenInvalidGrant: boolean; apiUnauthorized: boolean; rateLimitOnce: boolean };
  calls: string[];
  /** The scope Google reports as granted. Remove one to test "permission unticked". */
  grantedScopes: string[];
}

const jwt = (payload: object) => `x.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.y`;

export const FAKE_EMAIL = "tester@example.com";

const CALENDARS = [
  { id: "me@example.com", summary: "Anjali", backgroundColor: "#9a9cff", accessRole: "owner", primary: true, timeZone: "Asia/Kolkata" },
  { id: "holidays@group.v.calendar.google.com", summary: "Holidays in India", summaryOverride: "India holidays", backgroundColor: "#16a765", accessRole: "reader", timeZone: "Asia/Kolkata" },
  { id: "hidden@example.com", summary: "Hidden one", hidden: true, accessRole: "owner" },
  { id: "gone@example.com", summary: "Deleted one", deleted: true, accessRole: "owner" },
];

const EVENTS: Record<string, unknown[][]> = {
  // two pages, to prove paging is followed
  "me@example.com": [
    [
      { id: "e1", summary: "Design review", start: { dateTime: "2026-11-23T10:00:00+05:30", timeZone: "Asia/Kolkata" }, end: { dateTime: "2026-11-23T11:00:00+05:30" }, location: "Room 4", hangoutLink: "https://meet.google.com/abc", attendees: [{ email: "me@example.com", self: true, responseStatus: "accepted" }, { email: "riya@example.com", responseStatus: "accepted" }], created: "2026-11-01T00:00:00Z", updated: "2026-11-02T00:00:00Z" },
      { id: "e2", summary: "Offsite", start: { date: "2026-11-24" }, end: { date: "2026-11-26" } },
      { id: "e3", status: "cancelled", start: { dateTime: "2026-11-23T12:00:00+05:30" }, end: { dateTime: "2026-11-23T13:00:00+05:30" } },
    ],
    [
      { id: "e4", summary: "Declined meeting", start: { dateTime: "2026-11-23T14:00:00+05:30" }, end: { dateTime: "2026-11-23T15:00:00+05:30" }, attendees: [{ email: "me@example.com", self: true, responseStatus: "declined" }] },
      { id: "e5_20261125T040000Z", recurringEventId: "e5", summary: "Weekly sync", start: { dateTime: "2026-11-25T09:30:00+05:30", timeZone: "Asia/Kolkata" }, end: { dateTime: "2026-11-25T10:00:00+05:30" } },
      { id: "e6", start: { dateTime: "2026-11-26T09:00:00+05:30" }, end: { dateTime: "2026-11-26T09:30:00+05:30" } },
    ],
  ],
  "holidays@group.v.calendar.google.com": [[{ id: "h1", summary: "Christmas", start: { date: "2026-12-25" }, end: { date: "2026-12-26" } }]],
};

const LISTS = [
  { id: "L1", title: "My Tasks" },
  { id: "L2", title: "Work" },
];

const TASKS: Record<string, unknown[]> = {
  L1: [
    { id: "t1", title: "Pay rent", notes: "Before noon", status: "needsAction", due: "2026-11-21T00:00:00.000Z", position: "00000000000000000001", updated: "2026-11-10T08:00:00.000Z" },
    { id: "t2", title: "Book flights", status: "completed", completed: "2026-11-12T09:00:00.000Z", due: "2026-11-15T00:00:00.000Z", position: "00000000000000000002", updated: "2026-11-12T09:00:00.000Z" },
    { id: "t3", title: "Sub step", status: "needsAction", parent: "t1", position: "00000000000000000001", updated: "2026-11-10T08:00:00.000Z" },
    { id: "t4", title: "Removed", deleted: true, updated: "2026-11-10T08:00:00.000Z" },
    { id: "t5", title: "No date", status: "needsAction", updated: "2026-11-10T08:00:00.000Z" },
  ],
  L2: [{ id: "t6", title: "Ship the release", status: "needsAction", due: "2026-11-27T00:00:00.000Z", position: "00000000000000000001", updated: "2026-11-09T08:00:00.000Z" }],
};

const send = (res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(body));
};

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => resolve(b));
  });

export async function startFakeGoogle(port = 0): Promise<FakeGoogle> {
  const fake: FakeGoogle = {
    origin: "",
    close: async () => {},
    fail: { tokenInvalidGrant: false, apiUnauthorized: false, rateLimitOnce: false },
    calls: [],
    grantedScopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
      "https://www.googleapis.com/auth/calendar.settings.readonly",
      "https://www.googleapis.com/auth/tasks",
    ],
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://fake");
    const path = url.pathname;
    fake.calls.push(`${req.method} ${path}`);

    // The consent screen: approve at once and go back to the app with a code.
    if (path === "/auth") {
      const back = new URL(url.searchParams.get("redirect_uri")!);
      back.searchParams.set("code", "fake-code");
      back.searchParams.set("state", url.searchParams.get("state")!);
      res.writeHead(302, { Location: back.toString() });
      return res.end();
    }
    if (path === "/token") {
      const form = new URLSearchParams(await readBody(req));
      if (fake.fail.tokenInvalidGrant) return send(res, 400, { error: "invalid_grant", error_description: "Token has been expired or revoked." });
      if (form.get("grant_type") === "authorization_code") {
        if (form.get("code") !== "fake-code" || !form.get("code_verifier")) return send(res, 400, { error: "invalid_grant" });
        return send(res, 200, { access_token: "fake-access", refresh_token: "fake-refresh", expires_in: 3600, scope: fake.grantedScopes.join(" "), id_token: jwt({ email: FAKE_EMAIL }) });
      }
      if (form.get("grant_type") === "refresh_token" && form.get("refresh_token") === "fake-refresh") return send(res, 200, { access_token: "fake-access", expires_in: 3600 });
      return send(res, 400, { error: "invalid_grant" });
    }
    if (path === "/revoke") return send(res, 200, {});

    // From here on the caller must be holding the access token.
    if (req.headers.authorization !== "Bearer fake-access" || fake.fail.apiUnauthorized) return send(res, 401, { error: { message: "Invalid Credentials" } });
    if (fake.fail.rateLimitOnce) {
      fake.fail.rateLimitOnce = false;
      return send(res, 429, { error: { message: "Rate limit", errors: [{ reason: "rateLimitExceeded" }] } });
    }

    if (path === "/calendar/v3/users/me/calendarList") return send(res, 200, { items: CALENDARS });
    const ev = path.match(/^\/calendar\/v3\/calendars\/([^/]+)\/events$/);
    if (ev) {
      const pages = EVENTS[decodeURIComponent(ev[1])] ?? [[]];
      const i = Number(url.searchParams.get("pageToken") ?? 0);
      return send(res, 200, { items: pages[i], ...(i + 1 < pages.length ? { nextPageToken: String(i + 1) } : {}) });
    }
    if (path === "/tasks/v1/users/@me/lists") return send(res, 200, { items: LISTS });
    const tk = path.match(/^\/tasks\/v1\/lists\/([^/]+)\/tasks$/);
    if (tk) return send(res, 200, { items: TASKS[decodeURIComponent(tk[1])] ?? [] });
    return send(res, 404, { error: { message: "not found" } });
  });

  await new Promise<void>((r) => server.listen(port, "127.0.0.1", r));
  const addr = server.address();
  fake.origin = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : port}`;
  fake.close = () => new Promise((r) => server.close(() => r()));
  return fake;
}
