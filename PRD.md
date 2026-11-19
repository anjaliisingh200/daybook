# PRD — Personal Life OS

Owner: Anjali · Status: Draft v0.1 (Phase 1) · Single-user, personal tool.

## 1. Problem
Google Calendar is a great calendar; Google Tasks is too basic to run a life of personal and professional responsibilities (no overview of everything, no sorting/filtering, thin cards). I want one app that feels like Google Calendar but has a far better task experience, **without leaving Google as the home of my data.**

## 2. Goals
1. Familiar Google Calendar navigation and behaviour.
2. A card-based Tasks view that shows *everything* in one scannable place.
3. Two-way sync with Google Tasks and Google Calendar. Never a disconnected database.
4. Premium, calm, non-blue visual identity.
5. Works on laptop and Android; free to run.

## 3. Non-goals
- Not multi-user, not a team tool, no sharing/collaboration.
- Not a Kanban board; no status columns.
- Not a replacement for Google's own account/calendar settings.
- No AI features, no gamification, no third-party integration platforms.

## 4. Information architecture
Exactly **two primary tabs: Calendar and Tasks.** Everything else (settings, account, completed tasks, search results) lives in menus, panels and secondary navigation.

## 5. Calendar tab (Google Calendar-like)
Toolbar (Today, prev/next, date title, view switcher, search, settings) · Day / Week / Month / Schedule views · sidebar with mini-month and calendar list + visibility toggles · colour-coded events · event create/edit/delete · event popover · multiple calendars · recurring events (this event / all events) · time zones · responsive.

**Real data only; no dummy events.**

## 6. Tasks tab (the heart)
- **Top:** month/date navigation, prev/next/Today, week date strip, Add Task, search, sort & filter.
- **Date strip is navigation, not a filter.** Selecting a day scrolls/highlights, it never hides tasks.
- **All Tasks area:** one unified collection: Overdue, Today, Upcoming, Later, No date. Subtle date labels; sort/filter does not change the grouping logic.
- **Cards (not columns):** title, description preview, list, due date, priority (if set), completion control, optional metadata. Compact, consistent size, grid on desktop, single column on mobile.
- **Interactions:** open details, edit title/description, change due date, change list, complete, delete, quick add, drag reorder within a list (if feasible).
- **Completed:** collapsible section, not cluttering the main area.

## 7. Quick add
Title required; description, due date, list optional. Task created in seconds, default list pre-selected.

## 8. Data ownership (what is synced vs app-only)

| Field | Where | Label in UI |
|---|---|---|
| Task title, notes, due **date**, status, list, order, subtasks | Google Tasks (synced) | — |
| Task due **time** | **Not possible** in Google Tasks | not offered |
| Task priority, extra tags | App only | "This app only" |
| Event fields | Google Calendar (synced) | — |
| Calendar visibility/colour overrides, all preferences | App only | "This app only" |

## 9. Settings
General, Calendar, Tasks, Notifications, Appearance, Account & Sync (see brief §8). Every setting is classified in ARCHITECTURE.md §7 as *Google-backed*, *app-only (defaulted from Google)*, or *unsupported*. We never imply an app preference changes Google.

## 10. Success criteria
- I stop opening Google Tasks.
- A change made on either side shows up on the other within about a minute, or instantly with Sync now.
- Create a task in under 5 seconds.
- Zero tasks hidden by date range.
- No data loss or duplicated tasks across a week of daily use.

## 11. Constraints
Free tier only; secure server-side OAuth; no blue anywhere; Android + laptop; Google Tasks stays the source of truth.

## 12. Honest limits (product-facing)
Date-only tasks · no task reminders from Google · priority is app-only · background notifications not available on free hosting · "this and following" recurring edits deferred · drag-reorder is per list.

## 13. Open questions
See FEASIBILITY.md §8 (storage for app-only data, auth approach, Calendar scope breadth).
