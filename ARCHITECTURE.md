# ARCHITECTURE

Status: **proposed, awaiting your sign-off on the three decisions in FEASIBILITY.md §8.** Evidence for every claim is in [FEASIBILITY.md](FEASIBILITY.md).

## 1. Principles

1. Google is the source of truth. We cache, we never fork.
2. The browser never sees a Google token or the client secret.
3. Events and tasks are separate types end to end.
4. Synced fields and app-only fields are separate in the data model, in the code and in the UI.
5. Smallest thing that works. No database, queue or third-party service until a requirement forces one.

## 2. System overview

```
┌────────────────────────── Browser / Android Chrome (PWA-able) ─────────────┐
│ React UI  ·  TanStack Query cache (optimistic updates, polling)           │
└──────────────┬────────────────────────────────────────────────────────────┘
               │ same-origin fetch, httpOnly cookie
┌──────────────▼──────────── Next.js on Vercel (Route Handlers) ─────────────┐
│ /api/auth/*      login, callback, logout, session                         │
│ /api/tasks/*     lists, tasks CRUD, move, sync                            │
│ /api/calendar/*  calendars, events CRUD, search                           │
│ /api/meta        app-only data (priority, tags, prefs)    [pending dec. 1]│
│ lib/google/*     token refresh, typed fetch, retry/backoff                │
└──────────────┬────────────────────────────────────────────────────────────┘
               ▼
   Google Tasks API v1 · Google Calendar API v3 · (Drive appDataFolder)
```

## 3. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), latest 16.x | Required by brief; Route Handlers give us the server layer |
| UI | React 19 + TypeScript | As briefed |
| Styling | Tailwind CSS 4 with design tokens as CSS variables | As briefed; tokens make theming/accent/density trivial |
| Server state | TanStack Query | Caching, polling, optimistic updates, refetch on focus |
| Validation | zod | Validate every request body and every Google response we rely on |
| Sessions | `jose` (encrypted JWE cookie) | Small, audited, no database |
| Dates | `date-fns` + native `Intl` | Tasks are floating dates; events are instants. Avoid heavy libs |
| Drag and drop | `@dnd-kit` (later, Phase 4) | Accessible, touch-friendly, MIT |
| Google calls | Typed `fetch` wrapper, **not** the `googleapis` package | That package is very large; we use ~15 endpoints |
| Hosting | Vercel Hobby | Free |

All MIT/open-source and free. TypeScript is at 7.x on npm; I'll pick the version Next 16 officially supports when scaffolding rather than assume.

## 4. Authentication and token handling

- Flow: authorization code + **PKCE** + `state`, `access_type=offline`, `prompt=consent` on first login only.
- Callback exchanges the code server-side, checks the ID token's `email` equals `ALLOWED_EMAIL`, otherwise rejects.
- Session cookie: `httpOnly; Secure; SameSite=Lax`, JWE-encrypted with `SESSION_SECRET`, holding `{ refreshToken, email }`. Access tokens (1 hour) are minted on demand and kept only in server memory per invocation (or short-lived in the cookie).
- Logout/Disconnect: clear cookie **and** call Google's revoke endpoint.
- `invalid_grant` or 401 on refresh → API returns `AUTH_EXPIRED`, UI shows a "Reconnect Google" banner, cached data stays visible read-only.
- Mutating routes: require same-origin (`Origin` check) plus a custom header; `SameSite=Lax` covers the rest.
- Secrets in Vercel env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, `ALLOWED_EMAIL`. Nothing secret is prefixed `NEXT_PUBLIC_`. `.env.local` is git-ignored.
- Scopes: `openid email`, `tasks`, `calendar.events`, `calendar.calendarlist.readonly`, `calendar.settings.readonly` (+ `drive.appdata` if decision 1 = A).
- OAuth consent screen set to **In production** (unverified) to avoid the 7-day refresh-token expiry.

**Trade-off:** a refresh token in a cookie means if you clear cookies you log in again (harmless), and the encrypted cookie is the credential on that device. For a one-user personal app that is the right simplicity; a database would only be needed for multiple users or server-side background jobs.

## 5. Data model

Three kinds of data, kept physically separate:

```ts
// 1. SYNCED — mirrors Google, shape follows the API
type GTask      = { id, listId, title, notes?, status: 'needsAction'|'completed',
                    due?: 'YYYY-MM-DD' /* floating date */, completed?, updated, etag,
                    position, parent?, hidden?, deleted?, webViewLink }
type GTaskList  = { id, title, updated }
type GCalendar  = { id, summary, backgroundColor, foregroundColor, accessRole, primary, timeZone }
type GEvent     = { id, calendarId, summary, description?, location?, start, end,
                    recurringEventId?, status, eventType, colorId?, etag, ... }

// 2. APP-ONLY — never sent to Google, keyed by Google ids
type TaskMeta   = { taskId, priority?: 'high'|'medium'|'low', tags?: string[] }
type CalendarPref = { calendarId, visible: boolean, colorOverride?: string }
type Prefs      = { theme, density, fontSize, accent, weekStart, hideWeekends,
                    defaultView, defaultEventMinutes, taskSort, ... }

// 3. DERIVED (UI only) — e.g. TaskCardVM = GTask + TaskMeta + list title + overdue flag
```

- `GTask` and `GEvent` are different types with no shared base. The UI may render them side by side.
- UI rule: anything from group 2 gets a small "This app only" marker in the details view.
- Orphaned metadata (task deleted in Google) is garbage-collected on sync.
- Where group 2 is stored: **pending decision 1** (recommended: a single JSON document in Drive `appDataFolder`, versioned and written with last-write-wins; all readers tolerate missing keys).

## 6. Sync strategy

Google Tasks offers no push and no sync token, so **polling with delta queries** is the honest design.

**Tasks**
1. Initial load: `tasklists.list`, then per list `tasks.list(showCompleted, showHidden, showDeleted=false, maxResults=100)` paginated.
2. Delta poll per list: `tasks.list(updatedMin=<lastSync>, showDeleted=true, showHidden=true, showCompleted=true)`. Merge by id; `deleted:true` removes from cache.
3. Cadence: every **60 s** while the tab is visible, immediately on window focus / network reconnect, paused when hidden. Manual "Sync now" always available.
4. Full reconcile (refetch everything) every ~15 min and on manual sync, as insurance against missed deltas or clock skew (use `lastSync = serverTimeOfRequest − 2 min`).
5. Budget: 5 lists × 1/min × ~10 visible h ≈ 3,000 calls/day against a 50,000/day limit. Safe.

**Calendar**
- Fetch the visible window ± buffer for each *visible* calendar with `singleEvents=true`, refetch on navigation/focus and every 2–5 min. 600 req/min/user is far above need.
- `syncToken` and push channels are deferred optimisations (see FEASIBILITY §3).

**Writes**
- Optimistic UI → server route → Google → reconcile the response into cache. Roll back and toast on failure.
- Send **only changed fields** (`patch`), never whole objects.

**Conflicts**
- Rule: last write wins per field, with a visible signal. Before a write we compare the cached `updated`/`etag` with the response; if the item changed remotely mid-edit we show "Changed in Google, review" and let you choose.
- Whether Tasks honours `If-Match` is a Phase 2 test; if it does, we use it for true optimistic concurrency.

**Duplicate prevention**
- Tasks `insert` has no idempotency key. We (a) disable submit while in flight, (b) tag optimistic items with a client temp id, (c) after a timeout or network error, **list recent tasks and match before retrying** rather than blindly re-POSTing.
- Calendar `insert` accepts a client-supplied `id` (base32hex), which gives us real idempotency; use it. (**UNVERIFIED**, will confirm in Phase 2.)

**Errors**
- Typed errors from the server: `AUTH_EXPIRED`, `RATE_LIMITED` (backoff 2^n + jitter, per Google guidance), `NOT_FOUND`, `CONFLICT`, `OFFLINE`, `UNKNOWN`. UI shows sync status: *Synced 12s ago · Syncing · Offline · Needs reconnect · Error (retry)*.

## 7. Settings reality map

| Setting | Where it lives | Notes |
|---|---|---|
| Time zone, week start, 24h, date order, hide weekends, default event length, locale | **App prefs**, *initialised from* Google's read-only Settings | Changing here never changes Google |
| Calendar visibility + colours | **App prefs** (overrides) | Google's `selected`/`colorId` are writable but we don't touch them by default |
| Default view, density, font size, accent, theme | App prefs | |
| Default task list/sort/layout, show completed/undated, overdue style | App prefs | |
| Event reminders per event | Google event `reminders` | Real and synced |
| Task reminders | **Not supported by Google** | Hidden or labelled unsupported |
| Notification delivery | In-app while open (v1) | Background push needs paid scheduler; default off to avoid duplicating Google's own |
| Account/sync status, manual sync, reconnect, disconnect | Server session + sync state | |

## 8. Directory structure (planned, created in Phase 2)

```
app/
  (app)/calendar/…        page + components
  (app)/tasks/…
  api/auth/{login,callback,logout,session}/route.ts
  api/tasks/…  api/calendar/…  api/meta/route.ts
lib/
  google/{client,tasks,calendar}.ts   # typed wrappers + backoff
  auth/{session,pkce}.ts
  sync/…   dates/…   schema/…
components/ui/…           # design system primitives
styles/tokens.css
docs: PRD.md ARCHITECTURE.md DESIGN.md TASKS.md README.md FEASIBILITY.md
```

## 9. Deployment

- Vercel Hobby, GitHub-connected, env vars in dashboard. Region near you (e.g. `bom1`) to cut latency.
- OAuth redirect URIs: `http://localhost:3000/api/auth/callback` and `https://<app>.vercel.app/api/auth/callback`.
- No cron needed. (Hobby allows one run/day with ±59 min precision; unusable for sync or reminders, so we don't depend on it.)

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Refresh token revoked/expired | Medium | Reconnect banner; stay read-only on cache |
| Due-date off-by-one from time zones | High if careless | Floating date type, test in IST and UTC |
| Calendar billing changes later in 2026 | Low | Usage is <1% of free threshold; re-check quota page before deploy |
| Polling feels laggy vs Google Tasks app | Medium | 60 s + focus refetch + manual sync; set expectation in UI |
| Background reminders impossible on free tier | Certain | Be explicit, default off, ask before any paid option |
| Auth/session code mistakes | Medium | Small surface, zod, no secrets client side, review before deploy |
