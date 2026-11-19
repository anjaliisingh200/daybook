# Daybook (Personal Life OS)

A personal productivity app that combines **Google Calendar** and **Google Tasks** in two tabs: **Calendar** (familiar, Google Calendar-like) and **Tasks** (a card-based view of everything). Google stays the source of truth.

**Status: UI built and working on sample data. Google connection is the next phase.**

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm test           # date / time zone / recurrence / layout tests
npm run typecheck
npm run lint
npm run build
npm run shots -- <name>   # screenshots for the change log (dev server must be running)
```

No environment variables are needed yet. All data is sample data, kept in your browser's localStorage (Settings → Account & sync → Reset sample data restores it).

## What works today

**Calendar**: Day, Week (3 days on phones), Month and Schedule views · mini month · multiple calendars with show/hide and colour (this app only) · click or drag a time slot to create · drag an event to move it · event popover · full editor (all-day, repeat, location, description, colour) · recurring events (edit/delete *this event* or *all events*) · search · time zone aware · keyboard shortcuts.

**Tasks**: month/week navigation and a 7-day date strip that scrolls to and highlights a day without hiding anything · one unified list grouped Overdue / Today / Tomorrow / Next 7 days / months / No date · compact cards · details drawer with autosave · quick add · complete, reopen, delete with undo · search, filter (list, priority, due), sort · card grid or single column · collapsible Completed.

**Settings**: General, Calendar, Tasks, Notifications, Appearance, Account & sync, Shortcuts. Every setting is labelled **This app only**, **Starts from Google · app only**, or **Not supported by Google**.

**Design system**: warm neutral palette, charcoal type, restrained olive/terracotta/taupe/charcoal/plum/ochre accents, light/dark/system, density and font size. **No blue anywhere.**

## How the Google connection will plug in

The UI never talks to a data source directly.

```
components  →  lib/store (optimistic updates)  →  lib/data/repository.ts  (interface)
                                                         ├─ lib/data/mock/…   ← today
                                                         └─ GoogleRepository  ← next phase
```

Swap one line in `lib/store/data.ts` (`export const repo = new MockRepository()`) and delete `lib/data/mock/`. No component changes.

## Docs

| File | What it is |
|---|---|
| [FEASIBILITY.md](FEASIBILITY.md) | What Google's APIs can and can't do, costs, OAuth traps, decisions needed |
| [PRD.md](PRD.md) | Product requirements |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, auth, data model, sync strategy |
| [DESIGN.md](DESIGN.md) | Design system as built |
| [TASKS.md](TASKS.md) | Phase-by-phase checklist |
| [docs/changelog/CHANGELOG.md](docs/changelog/CHANGELOG.md) | Every change requested, newest first, with screenshots |

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · zustand · @floating-ui/react-dom · lucide-react. Planned: Google Tasks API, Google Calendar API, Google OAuth 2.0, Vercel Hobby (free).
