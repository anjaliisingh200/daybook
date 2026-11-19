# TASKS — Implementation checklist

Legend: `[x]` done · `[ ]` to do · 🛑 needs your decision/action

## Phase 1 — Feasibility and architecture
- [x] Inspect project (empty folder; Node 24.17, npm 11.13, git 2.45 present; not a git repo yet)
- [x] Verify Google Tasks API capabilities
- [x] Verify Google Calendar API capabilities
- [x] Verify OAuth requirements (incl. 7-day Testing-mode expiry)
- [x] Check quotas and costs
- [x] Identify limitations
- [x] Recommend architecture
- [x] Write FEASIBILITY, PRD, ARCHITECTURE, DESIGN, TASKS, README
- [ ] 🛑 You answer the 3 decisions in FEASIBILITY.md §8

## Phase 2 — Integration proof of concept (no styling)
**2.0 You (I'll walk you through each click)**
- [ ] 🛑 Create Google Cloud project
- [ ] 🛑 Enable Google Tasks API + Google Calendar API
- [ ] 🛑 Configure OAuth consent screen (External), add scopes, add yourself as test user
- [ ] 🛑 Create OAuth client (Web application), redirect `http://localhost:3000/api/auth/callback`
- [ ] 🛑 Put client id/secret in `.env.local` (I generate `SESSION_SECRET`)

**2.1 Scaffold**
- [ ] `git init`, `.gitignore` (incl. `.env*`)
- [ ] Next.js + TypeScript + Tailwind scaffold, zod, jose
- [ ] `/api/health`

**2.2 Auth**
- [ ] PKCE + state login route, callback, token exchange
- [ ] Email allow-list check
- [ ] Encrypted session cookie, refresh-token → access-token helper
- [ ] Logout + revoke
- [ ] Test: login works, wrong account is rejected, cookie is httpOnly, no token in browser JS

**2.3 Tasks proof**
- [ ] List task lists (real)
- [ ] List all tasks incl. completed (real)
- [ ] Create task → confirm in Google Tasks app/web
- [ ] Edit title/notes/due date → confirm in Google
- [ ] Complete + reopen → confirm in Google
- [ ] Delete → confirm in Google
- [ ] Edit in Google → appears via delta sync
- [ ] Run the verification list in FEASIBILITY.md §9 (Tasks items)

**2.4 Calendar proof**
- [ ] List calendars with colours
- [ ] Fetch real events for a date range (≥2 calendars, all-day, recurring)
- [ ] Create, edit, delete a test event; confirm in Google Calendar
- [ ] Run the verification list in FEASIBILITY.md §9 (Calendar items)

**Note:** the UI was built first on sample data at your request. This phase now swaps `MockRepository` for a `GoogleRepository` behind the same interface.

**2.5 Exit criteria:** a bare, unstyled page shows my real tasks and events, and writes go both ways. Findings recorded in FEASIBILITY.md.

## Phase 3 — Design (built on sample data, tested)
- [x] Design tokens (light/dark, non-blue), type, spacing, density, accent switcher
- [x] Component primitives (buttons, menus, selects, popovers, modals, drawer, toasts, date/time pickers, skeletons)
- [x] App shell with exactly two tabs (header on desktop, bottom bar on phones)
- [x] Calendar: Day, Week, Month, Schedule · sidebar · popovers · editor · recurring · search
- [x] Tasks: top section, date strip, unified grouped cards, details drawer, quick add, completed
- [x] Responsive pass (390 px phone and 1280 px laptop checked in the browser)
- [x] Micro-interactions (check pop, hover lift, sheet/pop animations, undo toasts)
- [x] Settings (all sections, each classified: app-only / starts from Google / unsupported)
- [x] Data seam: UI → stores → `Repository` interface → `MockRepository` (swap for Google in Phase 2)
- [x] Automated tests: date, time zone (incl. DST), recurrence, overlap layout (`npm test`)
- [ ] Drag-to-reorder task cards (needs single-list "Manual" sort; Google reorders per list only)
- [ ] Event resize by dragging the bottom edge
- [ ] "This and following events" for recurring edits (no Google API support; needs hand-built series split)
- [ ] Real Android device check (emulated phone width only so far)

## Phase 4 — Implementation
- [ ] Sync engine (polling, delta, reconcile, status pill)
- [ ] Optimistic writes, conflict + duplicate handling
- [ ] Quick add, task details, drag reorder (per list)
- [ ] Event create/edit/delete, recurring (this/all)
- [ ] Search (calendar + tasks)
- [ ] App-only metadata store (per decision 1)
- [ ] Settings (classified per ARCHITECTURE §7)
- [ ] Notifications v1 (in-app only)
- [ ] Error + auth-expiry handling
- [ ] Docs kept current after each feature

## Phase 5 — Deployment
- [ ] 🛑 Vercel account + GitHub repo
- [ ] Env vars, production redirect URI
- [ ] 🛑 Switch consent screen to In production
- [ ] Verify deployed login, sync, writes on laptop and Android
- [ ] Re-check Calendar API quota/billing page before go-live
