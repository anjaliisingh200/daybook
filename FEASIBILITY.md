# Feasibility Report — Personal Life OS

Phase 1. Status: **feasible, with a handful of real limitations you should know before designing.**
Research date: 2026-11-18. Sources are Google's and Vercel's official docs; anything I could not confirm is marked **UNVERIFIED** and becomes a Phase 2 test.

---

## 1. Verdict in one paragraph

Both APIs give you everything the product needs: read/create/edit/complete/delete tasks, and read/create/edit/delete events across multiple calendars with recurrence and time zones. Both are free at personal scale. The hard parts are not the APIs, they are the *gaps* between what you want and what Google exposes: Tasks has **no time-of-day, no priority, no tags, no push notifications, no sync token**; Calendar settings are **read-only** through the API; and Vercel's free tier can only run **one scheduled job per day**, which rules out background reminders. None of these block the product. Each has a clean workaround, listed below.

---

## 2. Google Tasks API (v1)

### What it supports (verified)

| Need | Supported? | How |
|---|---|---|
| Read all task lists | Yes | `tasklists.list` (also `get`, `insert`, `patch`, `update`, `delete`) |
| Read all tasks | Yes | `tasks.list`, `maxResults` up to **100**, paginate with `pageToken` |
| Create / edit / delete | Yes | `tasks.insert`, `patch`/`update`, `delete` |
| Complete / reopen | Yes | set `status` to `completed` / `needsAction` |
| Read completed tasks | Yes, with a catch | `showCompleted` defaults true, but tasks completed then "cleared" are `hidden` and need `showHidden=true` |
| Detect remote changes | Partly | `updatedMin` + `showDeleted=true` (see Sync below). **No push notifications and no sync token exist** in the reference. |
| Move between lists | Yes | `tasks.move` with `destinationTasklist` (recurring tasks can't be moved between lists) |
| Reorder | Yes, within one list | `tasks.move` with `previous` / `parent`; ordering is the lexicographic `position` field |
| Subtasks | Yes | `parent` is read-only; set it via `move`. Up to 2,000 subtasks per task. |

### Task fields (verified)

`title` (≤1024 chars) · `notes` (≤8192 chars) · `status` · `due` · `completed` · `updated` · `etag` · `position` · `parent` · `deleted` · `hidden` · `links[]` · `webViewLink` · `assignmentInfo`

### Limitations that shape the product

1. **`due` is a date, not a datetime.** The docs state the time part is discarded and "it isn't possible to read or write the time that a task is scheduled for." So the card can show "Due Fri 21 Nov", never "Due 3pm". Treat `due` as a *floating calendar date* (it comes back as midnight UTC); converting it through the user's time zone will show the wrong day for anyone west of UTC. This is the classic bug here; Phase 2 tests it.
2. **No priority, no labels, no colour.** Priority is app-specific metadata (see ARCHITECTURE.md §5).
3. **"Category" already exists: it is the task list.** You can use Google's task lists as categories natively and sync them. Only *extra* tags would be app-specific.
4. **Ordering is per list.** Google stores one order per list. A unified "all tasks" view sorted by date has no Google-side order, so drag-reorder is only meaningful within a list (or a "Manual" sort of one list). Cross-list drag = move to another list.
5. **Assigned tasks** (from Docs / Chat spaces) have restrictions: read-only `deleted`, no notes for Docs-assigned, can't be parents. `showAssigned` is off by default.
6. **Repeating tasks** exist in Google's apps; the API documents restrictions on them (can't be moved between lists or be parents). Whether the API can *create* repeating tasks: **UNVERIFIED**, assume no.
7. **No reminders / no time** means "task reminders where supported" in your Settings brief is effectively *not supported* by Google. See §6.

### Quota and cost (verified)

- Free. Courtesy limit **50,000 queries/day** per project; no per-minute figure published; increases can be requested.
- Our expected use: a few thousand a day. See polling budget in ARCHITECTURE.md §6.

### OAuth scopes

- `https://www.googleapis.com/auth/tasks` — read/write. Needed.
- `.../tasks.readonly` — read only. Not enough.
- Google's docs page does not label sensitivity; the Cloud Console consent screen does. Treat as sensitive (it affects the "unverified app" screen, §5).

---

## 3. Google Calendar API (v3)

### What it supports (verified)

| Need | Supported? | How |
|---|---|---|
| List calendars | Yes | `calendarList.list` → `accessRole`, `backgroundColor`, `foregroundColor`, `selected`, `primary`, `timeZone` |
| Read events in a range | Yes | `events.list` with `timeMin`/`timeMax`, `maxResults` up to **2500** |
| Recurring events | Yes | `singleEvents=true` expands a series into instances (required for `orderBy=startTime`); otherwise you get the master with `recurrence` RRULEs |
| Edit one instance | Yes | each instance has its own id; `recurringEventId` + `originalStartTime` identify it |
| Create / edit / delete | Yes | `insert`, `patch`, `update`, `delete` |
| Search | Yes | `q` parameter (summary, description, location, attendees) |
| Time zones | Yes | `timeZone` on events (IANA; **required for recurring events**), `timeZone` param on list to choose the response zone |
| Colour | Yes | `colorId` on events; `colors` endpoint; calendar colours via calendarList |
| Incremental sync | Yes | `syncToken` (see below) |
| Push notifications | Yes, but impractical here | HTTPS webhook + channels that **expire and must be renewed**, delivery "isn't fully reliable" |
| Event types | Read all; fully edit `default` only | `birthday`, `focusTime`, `outOfOffice`, `workingLocation`, `fromGmail` have restrictions (`eventType` is immutable; only `default` can be moved) |

### Limitations that shape the product

1. **Calendar settings are read-only.** The Settings resource documents only `get`, `list`, `watch`. So "week starts on", "24h time", "hide weekends", "default event length", "timezone", "locale" can be **read as sensible defaults** but cannot be written back. Our Settings screen must say "this app only" for those. Readable setting IDs: `weekStart`, `format24HourTime`, `dateFieldOrder`, `hideWeekends`, `defaultEventLength`, `timezone`, `locale`, `showDeclinedEvents`, `hideInvitations`, `useKeyboardShortcuts`, `remindOnRespondedEventsOnly`, `autoAddHangouts`.
2. **Calendar visibility and colours *are* writable on Google's side** (`calendarList.selected`, `colorId`, `backgroundColor` with `colorRgbFormat=true`, `summaryOverride`, `defaultReminders`). That means toggling a checkbox in our app could silently change what you see in Google Calendar. You asked us not to do that, so **default: visibility and colour overrides live in this app only**. An explicit "also apply in Google Calendar" switch can come later.
3. **"This and following events" has no API.** Google's own UI does it by splitting the series; we would have to hand-write that (truncate the old RRULE with `UNTIL`, create a new series). Recommend v1 supports "this event" and "all events" only.
4. **Array fields overwrite on `patch`** (attendees, reminders, recurrence), and `patch` costs 3 quota units. To "preserve existing Google Calendar data" we must send only the fields the user actually changed and never rebuild whole arrays from a partial model.
5. **Events with attendees:** editing can notify guests. We must set `sendUpdates` explicitly (default behaviour **UNVERIFIED**, Phase 2 test) and ask before notifying other people.
6. **Google Tasks do not appear in the Events API.** There is no "task" event type in the list, so no duplicates. Events and tasks are naturally separate entities, matching your data-model rule.

### Incremental sync (verified)

- Do a full list, keep `nextSyncToken` (only on the final page), then send it back to get only changes, including deletions (`status: cancelled`).
- `syncToken` **cannot** be combined with `timeMin`, `timeMax`, `q`, `orderBy`, `updatedMin`, and `showDeleted` can't be false.
- A `410 Gone` means wipe the cache and do a full sync.
- Recommendation: use a plain **windowed fetch** (visible range ± a buffer) refreshed on focus and a timer. Incremental sync is an optimisation for later, and it fights with windowed views.

### Quota and cost (verified)

- 10,000 requests/min per project, **600/min per user**. Sliding window.
- Free to use. A **1,000,000 requests/day per project billing threshold** is documented, with billing "planned later in 2026" and at least 90 days' notice. You will use well under 1% of that. Re-check the quota page before deploying.
- Errors: 403/429 with `usageLimits` reason; use truncated exponential backoff.

### OAuth scopes (names verified on Google's scope list)

| Scope | Why |
|---|---|
| `calendar.events` | read/write events on all calendars you can edit (use `calendar.events.owned` if you only want your own calendars) |
| `calendar.calendarlist.readonly` | list calendars + their colours, no subscription changes |
| `calendar.settings.readonly` | read time zone, week start etc. for defaults |
| `tasks` | Tasks read/write |
| `openid email` | identify you, lock the app to your account |

Note: Google's docs now list a family of narrower Calendar scopes (`calendar.events.owned`, `calendar.calendarlist.readonly`, …). I'll confirm they appear in your Cloud Console scope picker at setup; if not, the broader `calendar` scope is the fallback.

---

## 4. Costs: everything is free at personal scale

| Item | Cost | Notes |
|---|---|---|
| Google Cloud project, Tasks API, Calendar API | **$0** | No billing account needed |
| Google OAuth | **$0** | |
| Vercel Hobby | **$0** | Fair-use limits (1M function invocations/mo, 100 GB transfer). Hobby is intended for personal, non-commercial use. |
| Domain | $0 | `*.vercel.app` is fine |
| Libraries | $0 | All MIT/open source (see ARCHITECTURE.md §3) |
| Database | $0 | Not needed to start. See the one decision in §8. |

**Nothing requires a paid plan.** The one place free tier genuinely hurts is background reminders (§6).

---

## 5. OAuth requirements and the 7-day trap

- Create a Google Cloud project, enable **Google Tasks API** and **Google Calendar API**, configure the consent screen, create a **Web application** OAuth client with redirect URIs for `http://localhost:3000/...` and your Vercel domain.
- The server must use the authorization-code flow with `access_type=offline` to get a **refresh token**. Google "only returns the refresh_token on the first authorization"; to get another you need `prompt=consent`. Store it server-side only.
- **Trap (verified):** while the consent screen's status is **Testing**, user authorizations, and therefore the refresh token, **expire after 7 days**. You would have to log in again every week.
- **Fix:** set the status to **In production** without going through verification. Because the scopes are sensitive, Google will show an "unverified app" warning that *you* click through once. Unverified apps are capped at **100 new users for the project's lifetime**, irrelevant for a one-person app. Verification would only matter if you ever share this publicly.
- Refresh tokens can still be invalidated (user revokes, issuance limits per account). We handle `invalid_grant` by showing "Reconnect Google" rather than failing silently.
- Google's page on 6-month-inactivity and password-change invalidation was in a part of the docs I couldn't read, so I'm treating it as **UNVERIFIED** and simply handling `invalid_grant` regardless.

---

## 6. What the brief asks for that Google/Vercel can't fully give

| Brief item | Reality | Plan |
|---|---|---|
| Task priority | Not in Google Tasks | App-specific metadata, badge it "this app only" |
| Task category | Task list = category, native | Use lists; extra tags are app-only |
| Task due *time* | Not possible | Date only. Be honest in the UI. |
| Task reminders | Tasks API has no reminders | Not supported. We can only remind from our own metadata. |
| Event reminders in Settings | Event `reminders` are readable/writable per event | Per-event editing works; *notifications arriving* are a separate problem ↓ |
| Background notifications | A web app can only notify via Web Push, which needs a server to send at the right time. Vercel Hobby cron runs **once per day** (±59 min precision, verified). | v1: in-app reminders while the app is open. Real background push needs a Pro plan or a third-party scheduler. Google Calendar's own Android notifications already fire for events, so ours would be **duplicates** and should default to off. I'll ask before adding anything paid. |
| Calendar settings sync back | API is read-only | App-only preferences; defaults imported from Google |
| Automatic two-way sync | No push for Tasks | Polling while the app is visible + refetch on focus/reconnect + manual sync |
| Drag-and-drop reorder | `tasks.move` works per list | Only within one list; see §2 limitation 4 |
| Language / regional | Not Google settings | App-only |

---

## 7. Recommended architecture (summary; detail in ARCHITECTURE.md)

**One Next.js app on Vercel. No database to start. Browser never talks to Google.**

```
Browser (React UI)
   │  fetch /api/*  (same-origin, httpOnly session cookie)
   ▼
Next.js Route Handlers on Vercel  ── holds the secrets, refreshes tokens
   │  Bearer access token
   ▼
Google Tasks API · Google Calendar API
```

- Sign-in: Google OAuth code flow + PKCE, implemented directly (~150 lines) rather than pulling in Auth.js. Auth.js v5 is still `5.0.0-beta.32` on npm; for a one-user app a small, readable, owned implementation is safer and teaches you how OAuth actually works.
- Session: the refresh token lives **encrypted inside an httpOnly, Secure cookie**, decryptable only by the server. No database is needed for auth.
- Allow-list: only your Google account may sign in.
- Data: Google remains the source of truth. The browser keeps a cache (TanStack Query) and reconciles by polling.

---

## 8. Decisions I need from you (before Phase 3, not Phase 2)

1. **Where should app-only data live** (task priority, extra tags, calendar colour overrides, and your preferences, so they follow you from laptop to Android)?
   - **A. A JSON file in your Google Drive's hidden app-data folder** *(my recommendation)*. Free, no new service, follows your Google account, needs one extra scope (`drive.appdata`, which I believe is non-sensitive: **UNVERIFIED**).
   - B. Supabase free tier. Real database, but the free tier **pauses projects after about a week of low activity** and adds a second service to run.
   - C. Browser localStorage. Simplest, but priority wouldn't follow you between devices.
   - D. Write priority into the task's notes text. No new service, but it pollutes your Google Tasks descriptions, so I advise against it.
2. **Auth library vs hand-rolled.** I recommend hand-rolled with `jose` (see §7). Say so if you'd rather use Auth.js despite the beta status.
3. **Calendar edit scope.** `calendar.events` (all calendars you can edit) vs `calendar.events.owned` (only your own). I recommend the first.

---

## 9. Phase 2 verification list (things I will test against your real account, not assume)

- [ ] `due` round-trip: set 21 Nov, read back, confirm no off-by-one in IST (UTC+5:30) and in UTC.
- [ ] Does completing/reopening via `patch` behave as expected (`completed` timestamp set/cleared).
- [ ] Do completed tasks appear with `showCompleted=true` alone, or only with `showHidden=true`.
- [ ] `updatedMin` + `showDeleted` actually surfaces edits and deletions made in the Google Tasks app.
- [ ] `tasks.move` to another list: does the task id change?
- [ ] Does `etag` / `If-Match` get honoured on Tasks writes (decides conflict strategy).
- [ ] Can the API see repeating tasks and what happens when completing one.
- [ ] Calendar: events across ≥2 calendars, an all-day event, a recurring event, a non-IST event.
- [ ] `sendUpdates` default when editing an event with guests.
- [ ] Consent screen: sensitivity labels for each scope; whether the narrow Calendar scopes are selectable.

---

## Sources

- Tasks: [Task resource](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks) · [tasks.list](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/list) · [tasks.move](https://developers.google.com/workspace/tasks/reference/rest/v1/tasks/move) · [TaskList](https://developers.google.com/workspace/tasks/reference/rest/v1/tasklists) · [Limits](https://developers.google.com/workspace/tasks/limits) · [Auth](https://developers.google.com/workspace/tasks/auth)
- Calendar: [Events](https://developers.google.com/workspace/calendar/api/v3/reference/events) · [events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) · [CalendarList](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList) · [Settings](https://developers.google.com/workspace/calendar/api/v3/reference/settings) · [Sync](https://developers.google.com/workspace/calendar/api/guides/sync) · [Push](https://developers.google.com/workspace/calendar/api/guides/push) · [Quota](https://developers.google.com/workspace/calendar/api/guides/quota) · [Auth scopes](https://developers.google.com/workspace/calendar/api/auth)
- OAuth: [Web server flow](https://developers.google.com/identity/protocols/oauth2/web-server) · [Publishing status](https://support.google.com/cloud/answer/15549945) · [Scope list](https://developers.google.com/identity/protocols/oauth2/scopes)
- Vercel: [Cron usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) · [Fair use](https://vercel.com/docs/limits/fair-use-guidelines)
- Supabase: [Free project pausing](https://supabase.com/kb/faqs/platform/free-project-pausing)
- Auth.js: [Google provider](https://authjs.dev/getting-started/providers/google) · [refresh token rotation](https://authjs.dev/guides/refresh-token-rotation)
