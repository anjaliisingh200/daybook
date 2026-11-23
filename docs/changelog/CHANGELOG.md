# Daybook change log

A running record of every change requested, newest first, with screenshots. It lives in the project folder only; nothing here appears in the app.

**How it works**
- Each request gets an entry: date, what you asked for, what changed, and screenshots taken *after* the change.
- Screenshots are saved to `screenshots/<date>-<slug>/`. Claude takes them with `npm run shots -- <slug>` (needs the dev server running). Add `--dark` for a dark-theme set.
- Entries are written as plain sentences. Files touched are listed so a change can be traced or reverted.

---

## 2026-11-23 — Extension: removed the "Couldn't reach your Google events" message (branch `next-changes`)

**Asked for:** remove the line "Couldn't reach your Google events just now. They will appear when the connection is back." (pasted from the Calendar tab).

**What changed**
- The Calendar tab no longer shows that message. When the panel can't reach the Daybook website, it quietly shows Daybook's own events instead, with nothing on top.
- The other message, "Google needs to be connected again", is unchanged, because it tells you something you can act on.
- No picture changes in the sample-data screenshots, since the demo never shows this message. The layout is the one in the 2026-11-23 extension screenshots.

**Files:** `extension/src/App.tsx`

---

## 2026-11-23 — Removed the grey canvas and the Tasks column panels (branch `next-changes`)

**Asked for:** remove the grey canvas with the Tasks columns; they are not needed.

**What changed**
- The Calendar and Tasks pages are **white again**, with the day columns separated by thin lines as before. The grey area under the headers is gone, and so are the rounded white day panels in Tasks.
- The day heading ("MON 23") is back in its own row above the columns, in both Tasks and Calendar.
- **"Add task"** at the foot of each Tasks column is back to the quiet grey text button, and the top-right "Add task" is the blue primary button again.
- The **Completed list shows under the Tasks week view again** (it had been hidden there).
- These went away together because they were two earlier changes made together on 2026-11-22: "Light grey canvas under the headers…" and "Soft Add task button…". Their change log entries below are kept as history.
- The Chrome extension was changed to match: white, with a plain column of task cards and the quiet "Add task".
- Nothing is pushed. Checked: tests, lint and types pass, and the website and the extension were looked at after the change.

**Files:** `app/globals.css`, `components/calendar/CalendarScreen.tsx`, `components/calendar/DayTimeline.tsx`, `components/calendar/TimeGrid.tsx`, `components/shell/DayHeaders.tsx`, `components/tasks/TasksScreen.tsx`, `extension/src/panel.css`, `extension/src/TasksTab.tsx`

**Screenshots** (`screenshots/2026-11-23-grey-canvas-removed/`, sample data)
![Tasks week](screenshots/2026-11-23-grey-canvas-removed/tasks-week.png)
![Tasks day](screenshots/2026-11-23-grey-canvas-removed/tasks-day.png)
![Calendar week](screenshots/2026-11-23-grey-canvas-removed/calendar-week.png)
![Tasks week on a phone](screenshots/2026-11-23-grey-canvas-removed/tasks-phone.png)

---

## 2026-11-23 — Chrome extension: today's Tasks and Calendar in a side panel (branch `next-changes`)

**Asked for:** an actual Chrome extension (to go on the Chrome Web Store later) that shows only today, as two tabs at the top, Tasks and Calendar, with the same Supabase login as the website, no week or month view, and the design of the current app rather than anything new.

**What changed**
- **New extension in `extension/`.** Clicking the toolbar icon opens a panel on the right side of the browser. It has the website's header (logo, "Daybook", account circle with Log out), the website's tab switch with **Tasks** and **Calendar**, and a date row ("Monday, November 23") in the website's heading font. It always shows today and rolls over at midnight.
- **Tasks tab** is the website's Tasks day view in miniature: a column of the website's task cards (square tick, strike-through when done, subtasks with their blue line, priority marks) on white, and the website's quiet grey "Add task" at the bottom. Ticking saves at once; "Add task" opens a name field and creates the task for today. Order is the website's rule (newest first, or your hand-placed order).
- **Calendar tab** is the website's Day timeline: big hour labels, the dotted rail, calendar-coloured event cards that show more as they get taller, the all-day strip on top, and the blue "Now" tag. It opens a little before the current time.
- **Same login as the website** (Supabase email and password). The login is kept in the extension's own storage, so you stay logged in. New accounts are still made on the website.
- **Google events:** the panel asks the website's server for them. For that, the server now also accepts the login token the extension sends (`lib/google/session.ts`); the website's own cookie login works exactly as before, and a missing or wrong token counts as signed out. **This server change only takes effect once it is deployed.** Until then the Calendar tab shows Daybook's own events.
- It stays quiet about everything else: no week or month, no moving between days, no settings.
- Built with esbuild: `npm run extension` makes `extension/dist` to load in Chrome ("Load unpacked"). `npm run extension -- --demo` builds a sample-data copy used for these screenshots. How-to is in `extension/README.md`, including the Web Store steps.
- Checked: all tests pass (13 new ones for the token header, today's tasks and today's events), lint and types are clean, and the real build loads in Edge: the background worker runs, the icon opens the side panel, and the login screen shows with no errors. **Not yet checked:** a real login with your account, and Google events through the extension (needs your password and the deployed server change).
- Colours and sizes are copied from the website, so the primary button and the task-card tint are the website's blue; that is one token each in `extension/src/panel.css` if you want it changed.

**Files:** `extension/` (new: `build.mjs`, `manifest.template.json`, `src/*`, `icons/`, `fonts/`, `README.md`, `serve.mjs`), `lib/google/session.ts`, `tests/extension.test.ts`, `scripts/extension-load.mjs`, `scripts/extension-shots.mjs`, `package.json`, `package-lock.json`, `eslint.config.mjs`, `.gitignore`

**Screenshots** (`screenshots/2026-11-23-chrome-extension/`, sample data)
![Tasks](screenshots/2026-11-23-chrome-extension/panel-tasks.png)
![Add task](screenshots/2026-11-23-chrome-extension/panel-tasks-add.png)
![A task ticked](screenshots/2026-11-23-chrome-extension/panel-tasks-done.png)
![Calendar](screenshots/2026-11-23-chrome-extension/panel-calendar.png)
![Account menu](screenshots/2026-11-23-chrome-extension/panel-account-menu.png)
![Log in](screenshots/2026-11-23-chrome-extension/panel-login.png)

---

## 2026-11-22 — Soft "Add task" button at the bottom of each Tasks column (branch `next-changes`)

**Asked for:** use the Soft button in each column.

**What changed**
- The "Add task" at the bottom of every day column in the Tasks week is now the design system's **Soft** button: a full-width button with a soft olive tint and a soft border, with a "+" icon. It used to be plain grey text. Clicking it still opens the new task form for that day.
- Spacing, as measured on the page: the panels are **11.25px** apart (`gap-3`; the app's base text size is 15px, so 0.75rem is 11.25px), the same 11.25px around the whole grid, and inside each panel 7.5px at the sides and 11.25px at the top, with a small space above the button.
- This work stays on the local branch `next-changes`; it is not pushed to `main`.

**Files:** `components/tasks/TasksScreen.tsx`

**Screenshots** (`screenshots/2026-11-22-soft-add-task/`)
![Tasks week](screenshots/2026-11-22-soft-add-task/tasks-week.png)
![Tasks week on a phone](screenshots/2026-11-22-soft-add-task/tasks-week-phone.png)

---

## 2026-11-22 — Light grey canvas under the headers, Tasks columns as rounded panels (branch `next-changes`)

**Asked for:** below the two headers, a light grey background on the content area; in Tasks, each column with a 16px corner radius (first 24px, then 16px), with the day heading ("SUN 22") inside the column itself; no Completed list in the Tasks week view; and "Add task" as the secondary button.

**What changed**
- **Light grey canvas.** The area under the top bar and the date row (Today, arrows, title, search, view menu) is now a light warm grey in both the Calendar and Tasks, in every view. It is one design token, `--canvas` in `app/globals.css` (it follows `--surface-2`), so it can be changed in one place. The hour labels in the Calendar and the sticky month headings follow it.
- **Tasks columns are panels.** Each day is a white panel with a **16px corner radius**, floating on the grey with a small gap between panels. The day heading ("SUN 22", with today's blue circle) is now **inside each panel** instead of a separate row above them. It stays at the top of its panel as you scroll, and clicking it opens that day, as before. The Day view has no heading of its own (the page title already names the day). Month keeps its month navigator strip.
- **No Completed list in the week view** of Tasks (on any screen). It is still in the Month view.
- **"Add task" is the secondary button** (white with a border), at the top right and in the empty state, instead of the blue primary one. The "+" button on phones and the small "Add task" at the bottom of each column are unchanged.
- The Calendar's own day-names row (SUN 22 …) is unchanged and still a separate row; it only shares the same heading component now.

**Files:** `app/globals.css`, `components/shell/DayHeaders.tsx` (new `DayCell`), `components/tasks/TasksScreen.tsx`, `components/calendar/CalendarScreen.tsx`, `components/calendar/TimeGrid.tsx`, `components/calendar/DayTimeline.tsx`

**Screenshots** (`screenshots/2026-11-22-grey-canvas/`)
![Tasks week](screenshots/2026-11-22-grey-canvas/tasks-week.png)
![Tasks week on a phone](screenshots/2026-11-22-grey-canvas/tasks-week-phone.png)
![Tasks day](screenshots/2026-11-22-grey-canvas/tasks-day.png)
![Calendar week](screenshots/2026-11-22-grey-canvas/calendar-week.png)
![Calendar month](screenshots/2026-11-22-grey-canvas/calendar-month.png)

---

## 2026-11-22 — No "Today" label on tasks in the laptop Day view

**Asked for:** remove the "Today" label from the tasks in the Day view on a laptop (only that label).

**What changed**
- In the laptop Day view, a task due today no longer shows the "Today" chip with the calendar icon. A task with a priority keeps its priority mark at the right; a task with nothing else is a single slim line.
- Only the "Today" label is gone. Looking at another day still shows its own label ("Tomorrow", a date), and the labels in the Month list and the Completed list are unchanged.
- The phone Day view already had no date chips (changed earlier).

**Checked:** laptop Day on today: six cards, no chips. The next day: its four cards still show "Tomorrow". Month still shows its dates, and the phone Day still has none.

**Files:** `components/tasks/TaskCard.tsx`, `components/tasks/TasksScreen.tsx`

**Screenshots** (`screenshots/2026-11-22-no-today-label-desktop/`)
![Laptop Day, no Today label](screenshots/2026-11-22-no-today-label-desktop/laptop-day.png)

---

## 2026-11-22 — Calendar: one Week view that scrolls sideways, no "Now" tag

**Asked for:** remove the "Now" tag and its time in the week and 3-day views; instead of a 3-day view, keep only the week view, and let the user scroll to the right to see the other dates.

**What changed**
- **No more "3 days".** On a phone the Calendar's view menu is now Day, Week, Month, Schedule. Week is always the whole week (seven days, or five if weekends are hidden). The arrows move a week at a time.
- **Scrolls sideways.** Each day keeps a readable width (150px on a phone, 200px on a laptop), so a phone shows about two days and a peek of the third. Swipe left and right to see the rest of the week. The hour labels stay put on the left while you swipe. Today's column is brought into view when the week opens.
- **No "Now" tag in the week.** The blue label with "Now" and the time in the hour column is gone. The thin blue line across today's column, with its dot, is still there, so you can see the current time. The Day view keeps its own "Now" tag, since only the week and 3-day views were mentioned.
- Swiping sideways used to be blocked inside the grid (it only allowed vertical scrolling); it now allows both.
- README and DESIGN.md no longer say "3 days on phones".

**Checked on a phone with real touch events:** seven columns of 150px, a swipe moved the week sideways, the arrows move a whole week, the view menu has no "3 days", and no "Now" tag is in the week. The laptop week is unchanged, and the Day view still has its Now tag.

**Files:** `components/calendar/useCalendar.ts`, `components/calendar/TimeGrid.tsx`, `components/calendar/Toolbar.tsx`, `README.md`, `DESIGN.md`

**Screenshots** (`screenshots/2026-11-22-week-scrolls/`)
![Phone week](screenshots/2026-11-22-week-scrolls/phone-week.png)
![Phone week, scrolled sideways](screenshots/2026-11-22-week-scrolls/phone-week-scrolled.png)
![Laptop week](screenshots/2026-11-22-week-scrolls/laptop-week.png)

---

## 2026-11-22 — Subtasks are always shown under their task

**Asked for:** option C from the subtask mock-ups: show the subtasks on each task, always visible, and all of them (no "+2 more").

**What changed**
- Every task card now lists **all of its subtasks** right under the title, indented, with a thin blue line on the left. Each has its own square checkbox; a ticked subtask is struck through and greyed. This is in every view: phone Day, phone and laptop Week, Month, and the Completed list.
- **Ticking a subtask** ticks only that subtask; it does not open the task or tick the parent. **Tapping a subtask's title** opens the parent task, as tapping anywhere else on the card does. Adding, renaming and deleting subtasks is still done in the task editor.
- A repeating task's days each show their own copy of the subtasks.
- A task with no subtasks looks exactly as before.

**Checked on a phone:** tasks with 3, 5 and 2 subtasks (some already ticked) all show every subtask in Day and in Week; ticking one struck it through without opening anything; tapping one's title opened the parent.

**Files:** `components/tasks/TaskCard.tsx`

**Screenshots** (`screenshots/2026-11-22-subtasks-on-cards/`)
![Phone Day with subtasks](screenshots/2026-11-22-subtasks-on-cards/phone-day.png)
![Phone Week with subtasks](screenshots/2026-11-22-subtasks-on-cards/phone-week.png)

---

## 2026-11-22 — Custom repeat (like Google Tasks): every Sun, Wed, Fri, or any days

**Asked for:** a custom repeat option like Google Tasks, for example "laundry every Sun, Wed, Fri", and in general any days.

**What changed**
- The **Repeat** menu now ends with **Custom…** (when you add a task, when you edit one, and in the calendar's event editor). It opens a small dialog:
  - **Repeat every** a number of **days, weeks, months or years**.
  - For weeks, **Repeat on**: tick any of S M T W T F S (at least one is required, otherwise Done is disabled and it says so).
  - **Ends**: **Never**, or **On a date**.
  - A plain-words summary underneath, such as "Weekly on Sun, Wed, Fri" or "Every 2 weeks on Mon, Thu, until 22 Feb 2027".
- A task with a custom repeat gets an occurrence on exactly the chosen days, for the next 30 days (kept topped up, as with the other repeats), each with its own copy of the subtasks. Checked on a phone: "Laundry" every Sun, Wed, Fri created 13 tasks, all on a Sunday, Wednesday or Friday.
- The Repeat menu shows the custom rule in words, and "Custom…" opens the dialog filled in with the current rule, so it can be edited.
- The same dialog saves a repeating event on the calendar (Sun, Mon, Wed until a date was checked); a task with a time passes the rule on to its calendar event.
- The existing choices (Daily, Weekly, Every weekday, Monthly, Annually) work as before.

**Good to know**
- The first task stays on the date it was created for, even if that is not one of the chosen days; the rest follow the chosen days. Start it on one of the days if you want it to line up.
- "Ends after N times" is not offered yet (Never or a date only).
- The new days appear over about 15 seconds after saving, one after another.

**Files:** `lib/recurrence.ts`, `lib/store/data.ts`, `components/ui/CustomRepeat.tsx` (new), `components/ui/RepeatSelect.tsx`, `components/calendar/EventLayers.tsx`, `tests/core.test.ts` (13 new checks for the rules)

**Screenshots** (`screenshots/2026-11-22-custom-repeat/`)
![Custom repeat on a phone](screenshots/2026-11-22-custom-repeat/phone-dialog.png)
![Reopened with the rule filled in](screenshots/2026-11-22-custom-repeat/phone-reopened.png)
![In the event editor](screenshots/2026-11-22-custom-repeat/event-dialog.png)

---

## 2026-11-22 — Fix: subtasks were not being saved, and repeating tasks now carry them

**Reported:** added subtasks to a task, then set it to repeat every day; opening the task showed no subtasks (on a phone).

**Cause:** adding a subtask never worked. A subtask has no date of its own, but the store refuses to save any task without a date ("A task needs a date before it can be saved", which only flashed past in a toast), so every subtask, in the Add task form and in the task editor, was dropped silently. Repeat was not the cause.

**What changed**
- A subtask can now be saved without a date. Only a top-level task still needs one.
- Each day of a repeating task gets its **own copy of the subtasks**, all unticked, so ticking "Sub one" on Monday does not tick it on Tuesday. New days made later get the copies too, and days made earlier that have none get them the next time the app loads.
- Subtasks that you tried to add before this fix were never saved, so they have to be added again.

**Checked on a phone:** add a task with two subtasks (both saved) → set Repeat: Daily → today's task still has both, and tomorrow's and the following days' each have their own two; ticking one on tomorrow's left the others unticked.

**Files:** `lib/store/data.ts`

**Screenshots** (`screenshots/2026-11-22-subtasks-fix/`)
![Tomorrow's repeated task with its subtasks](screenshots/2026-11-22-subtasks-fix/repeat-occurrence-subtasks.png)

---

## 2026-11-22 — No "Today" tag on tasks in the phone Day view

**Asked for:** remove the "Today" tag from the tasks in the phone Day view.

**What changed**
- In the phone Day view the date chip ("Today", "Tomorrow", a date) is no longer shown on each task, since the date is already in the header. A task with nothing else to show (no priority) is now a single slim line; a task with a priority keeps the priority mark at the right.
- Other views are unchanged: the chip still shows in phone Month and on the laptop (Day, Week, Completed list).

**Files:** `components/tasks/TaskCard.tsx`, `components/tasks/TasksScreen.tsx`

**Screenshots** (`screenshots/2026-11-22-day-no-today-tag/`)
![Phone Day, no Today tag](screenshots/2026-11-22-day-no-today-tag/phone-day.png)

---

## 2026-11-22 — Done tasks look like open tasks, no borders

**Asked for:** a completed task should have the same background colour as a task that is not done, and neither card should have a border.

**What changed**
- A completed card now has the same light blue tint as an open card (it used to turn grey). It is still told apart by its ticked checkbox and the strike-through on its title. This applies in the day columns, in the Completed list and on the phone.
- Neither kind of card has a border. I also removed the faint ring that outlined every task on the selected day (it showed in Month view after tapping a day), so no task card has any outline now. The keyboard focus outline stays, for keyboard users.
- Checked with the page's real styles: in Week, in Month with a day selected, and in the phone Day view after ticking a task, every card has the same background, a 0px border and no ring.

**Files:** `components/tasks/TaskCard.tsx`

**Screenshots** (`screenshots/2026-11-22-same-card/`)
![Phone Day, one task ticked](screenshots/2026-11-22-same-card/phone-day-ticked.png)
![Week with the Completed list](screenshots/2026-11-22-same-card/week-with-completed.png)

---

## 2026-11-22 — Phone Tasks → Day: drag to reorder, and ticked tasks stay

**Asked for:** on a phone, be able to drag tasks to change their order in the Day view; and a task that is ticked must stay in the Day view, checked and struck through, instead of disappearing.

**What changed**
- On a phone, **Day** is now one full-width day column, the same as the laptop Day and the Week columns, instead of a separate list. That is what makes both of these work:
- **Reorder by dragging:** press and hold a task for a moment (it lifts, and a dashed slot shows where it will land), drag up or down, and let go. When the day is longer than the screen, holding the task near the top or bottom edge scrolls the list. A short tap still opens the task, and swiping still scrolls.
- **Ticking keeps the task:** a ticked task stays in its place, checked and struck through. (The old phone list was built from open tasks only, so ticked ones vanished.) Laptop Day and Week already worked this way.
- **Manual order turns on by itself** the first time a task is dragged up or down inside a day: every task of that day keeps the place it had on screen, and a toast says so. It can be switched off in Settings → Tasks ("Manual order in day columns"). This also applies on a laptop, where dragging inside a day used to do nothing unless the setting was already on.
- A drop is now also picked up when the finger lets go over the drop slot or the empty space under the last card (it was lost there).
- Dragging a task onto another day (laptop Week) and the phone Week and Month views are unchanged.

**Files:** `components/tasks/TasksScreen.tsx`, `components/settings/SettingsDialog.tsx`

**Screenshots** (`screenshots/2026-11-22-phone-day-reorder/`)
![A ticked task stays, struck through](screenshots/2026-11-22-phone-day-reorder/ticked-stays.png)
![Dragging a task](screenshots/2026-11-22-phone-day-reorder/dragging.png)
![After the drop](screenshots/2026-11-22-phone-day-reorder/reordered.png)

---

## 2026-11-22 — Task cards: a light blue tint instead of a border

**Asked for:** instead of a border, give each task card a background colour (a very light tint of blue); no border; 4px padding on all sides.

**What changed**
- Task cards have no border. They are filled with a very light tint of the primary blue (6% of it over white, 10% on hover), with 4px padding on all sides. The tint is a design token (`--task-card` and `--task-card-hover` in `app/globals.css`), so it can be retuned in one place.
- Completed cards stay a plain warm grey, so a done task still looks different from an open one.
- The gap between cards and the side padding in the day columns from the previous change are unchanged.

**Files:** `components/tasks/TaskCard.tsx`, `app/globals.css`

**Screenshots** (`screenshots/2026-11-22-task-card-tint/`)
![Phone Week](screenshots/2026-11-22-task-card-tint/phone-week.png)
![Laptop Week](screenshots/2026-11-22-task-card-tint/desktop-week.png)

---

## 2026-11-22 — Phone Tasks: Week as day columns, square checkboxes, bordered cards

**Asked for:** the weekly view of tasks on a phone (it first came out as a stacked list, and was asked to look like the week view, not a list); no repeated date heading in the phone Day view; square checkboxes instead of circles; a border and 2px padding on each task card; no Completed section at the bottom of the phone Week view.

**What changed**
- **Phone Week** is now the same side-by-side day columns as on a laptop: one column per day, with that day's tasks, an Add task button under each, and the week scrolling sideways (about two days fit on screen). Today's column is brought into view, the arrows move a week, and tapping a day's date opens that day. Moving a task to another day by long-press and drag works as before.
- The **Completed** list is not shown at the bottom of the phone Week view. Laptop Week still has it.
- **Phone Day** stays a single list, and no longer repeats the date as a heading ("Sunday, 22 November 6") above the tasks; the date is already in the header.
- **Square checkbox** everywhere a task is ticked: on cards, in the task editor, for subtasks, on the home page preview and in the design system. It is the same shape as the calendar-visibility checkbox (renamed `TaskCheck`; it was `RoundCheck`).
- **Task cards** have a 1px border with rounded corners and keep their 2px padding. Cards now have a small gap (6px) between them in the day columns, and the columns have a little side padding, so the borders don't touch.
- Phone Month is unchanged.

**Files:** `components/tasks/TasksScreen.tsx`, `components/tasks/TaskCard.tsx`, `components/tasks/taskModel.ts`, `components/ui/Controls.tsx` (+ `Controls.ds.md`), `components/tasks/TaskLayers.tsx`, `components/home/Hero.tsx`, `components/design/DesignSystem.tsx`

**Screenshots** (`screenshots/2026-11-22-phone-week/`)
![Phone Week, day columns](screenshots/2026-11-22-phone-week/week-columns.png)
![Phone Day](screenshots/2026-11-22-phone-week/day-no-heading.png)
![Laptop Week](screenshots/2026-11-22-phone-week/desktop-week.png)
![Task editor, square checkbox](screenshots/2026-11-22-phone-week/editor-checkbox.png)
## 2026-11-22 — Google phase 1 narrowed to calendar events only (branch `google-sync`)

**Asked for:** for Phase 1, use only Google Calendar events. Defer the Calendar List API and the Google Tasks API. Ask only for the `calendar.events` permission, use the user's `primary` calendar instead of fetching the calendar list, and keep the token storage, OAuth flow, refresh and disconnect as they are, without closing the door on Tasks and the calendar list later.

**What changed**
- **One permission.** The consent request now asks for `https://www.googleapis.com/auth/calendar.events` and nothing else (the identity, calendar list, calendar settings and Tasks permissions are gone from the request). The callback checks only that one.
- **Primary calendar.** Events are read from `calendars/primary/events`. The app never asks Google for the calendar list, and never calls the Tasks API. Checked in the tests: no request to either is made.
- **Your address** used to come from the identity permission. Now the first request to the primary calendar supplies it (the calendar's title is the address). That same request proves the permission works, and if the Calendar API is not switched on in the Google Cloud project, the app says so in plain words instead of failing quietly.
- **Tasks keep working.** Google no longer supplies tasks, so while Google is connected your tasks still come from, and save to, your Daybook account (repeating tasks keep being topped up too). Only calendar events come from Google. Event changes are still read-only for now.
- **Settings** says: events come from your primary Google calendar, tasks stay in Daybook (Google Tasks later).
- **Kept as it was:** encrypted token storage, the OAuth flow (state and PKCE), refresh, Reconnect, Disconnect, the buttons and screens.
- **Not closed off.** The calendar-list and Google Tasks code is still there behind two switches, `calendarList` and `tasks` in `lib/google/config.ts`; turning one on also adds its permission to the request. Tests cover that they still work when switched on.
- `docs/GOOGLE-SETUP.md` is updated: enable only the Calendar API, add only the one scope.

**Checked:** 40+ checks against a fake Google (phase 1 and the switched-on case), and a browser run of the whole flow: connect (permission asked for = events only), address read, encrypted token saved, 4 events from the primary calendar, your own tasks still shown and a new task saved to Daybook, disconnect, "Calendar API off" message, unticked permission, reconnect after an expired permission. Not tried against a real Google account yet.

**Files:** `lib/google/config.ts`, `lib/google/features.ts` (new), `lib/google/snapshot.ts`, `app/api/google/callback/route.ts`, `lib/data/google/googleRepository.ts`, `lib/data/switching.ts`, `lib/store/data.ts`, `components/shell/AppShell.tsx`, `components/settings/SettingsDialog.tsx`, `docs/GOOGLE-SETUP.md`, `tests/google.test.ts`, `tests/fakeGoogle.ts`

**Screenshots** (`screenshots/2026-11-22-google-events-only/`)
![Settings, connected](screenshots/2026-11-22-google-events-only/settings-connected.png)
![Tasks still work while connected](screenshots/2026-11-22-google-events-only/tasks-still-work.png)

---

## 2026-11-22 — Google connection, phase 1: connect and read (branch `google-sync`)

**Asked for:** the Google Calendar and Google Tasks connection, planned in phases. This is phase 1: sign in with Google and show your real calendars, events, task lists and tasks. Kept on its own branch, not merged.

**What changed**
- **Connect Google account** (user menu and Settings → Account & sync) now works. It opens Google's consent screen, then returns to the app. Settings shows the connected address and a **Disconnect Google** button (two clicks, and it also cancels the permission at Google). If Google stops accepting the permission, the app shows your Daybook data meanwhile and offers **Reconnect**.
- **Read only for now.** Calendars (names, colours), events from 90 days back to a year ahead (repeats expanded, cancelled and declined events left out, all-day end dates corrected), and every task list and task (subtasks, due dates, completed) are read from Google. Adding or editing while connected shows "Google is connected read-only for now" and nothing is saved. Writing back is phase 2.
- **Security.** The Google permission (refresh token) is stored encrypted in a new Supabase table, and only the server can read it; the browser never sees a Google token. The sign-in carries a one-time state and a PKCE challenge. Disconnect only accepts calls from the app's own pages.
- Events are no longer turned into tasks automatically while Google is the source (that bookkeeping is for Daybook's own data).
- Without the Google keys set, the buttons explain that Google isn't set up yet instead of failing.
- New guide: `docs/GOOGLE-SETUP.md` (Google Cloud steps, the three keys, the one SQL block to run again).
- Tests: 34 new checks (encryption, mapping, paging, retry, expired permission) against a fake Google, plus a browser run of the whole flow: connect, data on screen, Settings, expired permission, disconnect, missing permission, forged sign-in.

**Not in this phase:** writing to Google; the colour of Google calendars is used as Google has it (a blue calendar stays blue); tasks outside the week on screen show only in Month view; the Daybook-only fields (priority, task times) are not attached to Google tasks yet.

**Files:** `app/api/google/*` (connect, callback, status, snapshot, disconnect), `lib/google/*`, `lib/data/google/googleRepository.ts`, `lib/data/switching.ts`, `lib/store/google.ts`, `lib/supabase/server.ts`, `lib/store/data.ts`, `components/shell/Header.tsx`, `components/shell/AppShell.tsx`, `components/settings/SettingsDialog.tsx`, `supabase/schema.sql`, `.env.local.example`, `next.config.ts`, `tests/google.test.ts`, `tests/fakeGoogle.ts`, `docs/GOOGLE-SETUP.md`

**Screenshots** (`screenshots/2026-11-22-google-phase1/`, taken against a fake Google, not a real account)
![Calendar from Google](screenshots/2026-11-22-google-phase1/calendar-from-google.png)
![Tasks from Google](screenshots/2026-11-22-google-phase1/tasks-from-google.png)
![Settings, connected](screenshots/2026-11-22-google-phase1/settings-connected.png)
![Reconnect needed](screenshots/2026-11-22-google-phase1/reconnect-needed.png)

---

## 2026-11-22 — Tasks are listed by date, no Overdue / Tomorrow / Next 7 days groups

**Asked for:** no "Overdue", "Tomorrow", "Next 7 days", "Later this month" groups in the task lists, in any view. Just show tasks date by date. (Also asked: why Google Calendar isn't connecting. Answer: it was never built; the sign-in button is a placeholder.)

**What changed**
- The task list (Month view, and the single list on phones) now has one heading per date, oldest first, for example "Friday, 20 November". Overdue tasks sit under their own date. Dates in another year show the year. Today's date is picked out in the accent colour. "No date" stays at the end when it is switched on.
- Day view on a phone lists only that day's tasks, not every open task. A day with nothing shows "Nothing due this day" with an Add task button.
- The Overdue / Next 7 days choices inside the Filter menu are unchanged.

**Files:** `components/tasks/taskModel.ts`, `components/tasks/TasksScreen.tsx`

**Screenshots** (`screenshots/2026-11-22-task-dates/`)
![Month view, by date](screenshots/2026-11-22-task-dates/month-by-date.png)
![Phone, Day view](screenshots/2026-11-22-task-dates/phone-day.png)

---

## 2026-11-20 — Tasks follows the Calendar view, no Synced pill, Settings in the user menu

**Asked for:** in the day view, no gap between the cards and the vertical line, and each hour line centred on its square; make Tasks follow the Calendar's view (the Day / Week / Month switch was tried in the top header and put back in its original place); remove "Synced"; move the settings icon into the user menu.

**What changed**
- Day view: event cards now touch the vertical rail (no gap), the hour lines start at the rail, and each hour's square is centred on its line instead of sitting above it.
- The Day / Week / Month switch stays in the second header row, where it was, on both Calendar and Tasks.
- The two tabs share the choice: pick Day on the Calendar and Tasks opens in Day; change it on Tasks and the Calendar follows. Schedule exists only on the Calendar, so it does not change Tasks.
- Week views keep today in view: when today is in the week shown, its column is scrolled on screen (centred when a narrow window cut it off), on both Calendar and Tasks, on load and again after moving to another week and pressing Today. The Calendar also re-scrolls to the current time each time the week changes, not only on load.
- The "Synced … ago" pill is removed from the header. Last sync time and Sync now are in Settings → Account & sync. A failed sync still shows a message.
- The settings gear is removed. **Settings** is now an item in the user (round letter) menu.
- Settings no longer shows the "This app only" and "Starts from Google · app only" badges next to each setting, or the "Visibility and colours: this app only" badge on the Calendars list. The one "Not supported by Google" badge is unchanged.

**Files:** `lib/scroll.ts` (new), `components/calendar/TimeGrid.tsx`, `components/tasks/TasksScreen.tsx`, `components/shell/Header.tsx`, `components/calendar/DayTimeline.tsx`, `lib/store/ui.ts`; `components/settings/SettingsDialog.tsx`; `components/shell/SyncPill.tsx` deleted

**Screenshots** (`screenshots/2026-11-20-header-view-switch/`)
![Calendar header](screenshots/2026-11-20-header-view-switch/header-calendar.png)
![Tasks follows Day](screenshots/2026-11-20-header-view-switch/tasks-follows-day.png)
![User menu](screenshots/2026-11-20-header-view-switch/user-menu.png)
![Day spacing](screenshots/2026-11-20-header-view-switch/day-spacing.png)
![Settings, Calendar section](screenshots/2026-11-20-header-view-switch/settings-calendar.png)
![Week with today in view at a narrow width](screenshots/2026-11-20-header-view-switch/week-today-in-view.png)

---

## 2026-11-19 — Timeline day and week views, blue today in the month view

**Asked for:** the day view in the style of the reference image (a timeline with a rail, big times and outlined cards), with every hour still shown. Kept on its own branch so it can be dropped. Follow-ups: no "Done" label or check mark, the UI font for the times, equal hour spacing, no Open button, a blue Now tag with the time under it, before the rail.

**What changed (Calendar → Day and Week; month and schedule are untouched)**
- A rail with a label for every hour (`07:00`, `PM` underneath) in the normal UI font and weight, with a small square marker and a thin line across the day at every hour. Labels and markers look the same whether or not an hour has events. Every hour is exactly the same height.
- Events are cards in the same solid calendar colour with white text as in the week view, placed at their real time inside the hour and sized by duration. Short events show one line (title and time); longer ones show the title, the description when there is room, and tags for time range, duration, calendar and location. Overlapping events sit side by side.
- Completed events keep the struck-through title, with no label. Cards have no small square, and the current hour is not highlighted.
- **Week view uses the same design language:** the hour column has the same `07:00` / `PM` labels, a rail with square markers and the blue "Now" tag with the time under it; the "Now" line is the primary blue; event cards have the same square corners. Dragging to create and move events still works in the week view. On a phone the hour labels shrink to fit.
- Week and day event cards are now one shared component, so they always match. What a card shows depends on its height: one line (title and start time) for short events, title plus time range for medium ones, and title plus tags for time range, duration and calendar for tall ones. Recurring events show the repeat icon in both views.
- The month view marks today with a blue circle around the date, like the "19" at the top of the week view, instead of the olive pill.
- A small "Now" label next to the line inside today's column was tried and removed. The blue "Now" tag with the time stays on the hour column.
- Known trade-off: in the week view the "Now" tag sits on the narrow hour column, so it can overlap the nearest hour label for a few minutes either side of the hour.
- A blue "Now" tag (the primary colour) with the time stacked under it sits to the left of the rail, with a short line to a dot on the rail.
- Clicking an empty spot opens a new event at that time (30-minute steps). All-day events sit in an "All day" row at the top.
- Not in this version: dragging to create or move events in the day view (the week view still has it).

**Files:** `components/calendar/DayTimeline.tsx` (new), `components/calendar/EventCard.tsx` (new), `components/calendar/eventStyle.ts` (new), `components/calendar/CalendarScreen.tsx`, `components/calendar/TimeGrid.tsx`, `components/calendar/MonthView.tsx`

**Screenshots** (`screenshots/2026-11-19-day-timeline/`)
![Day timeline](screenshots/2026-11-19-day-timeline/day-timeline-a.png)
![Week in the same style](screenshots/2026-11-19-day-timeline/week-timeline-style.png)
![Month, today as a blue circle](screenshots/2026-11-19-day-timeline/month-today-circle.png)

---

## 2026-11-19 — One header, no sidebar, solid event cards, tidier day views

**Asked for:** put My calendars in the header and remove the left sidebar; event cards in the plain calendar colour, not light tints; search and Create in the same header; the Tasks tab with the same single header; Tasks day view stacked one under the other; a maximum width for the day view on both tabs; no Completed section and no "Thu 19" block in the day view.

**What changed**
- The left sidebar (side sheet with Create, mini month and calendar list) is removed. **My calendars** is now a button in the header with a dropdown: show or hide each calendar, "All", "Display only this", and colour.
- Calendar header is one row: Today, previous and next, the date, Search, My calendars, Create, and the view switch. Search and Create no longer sit in a second row.
- Tasks has the same single header: Search, Filter, Add task and the view switch. Phones keep a small search and filter row below, because the header has no room for them.
- Event cards use the solid calendar colour with white text (week and day grid, all-day row, month banners). Completed events stay struck through.
- Day view on both tabs is one centred column with a maximum width (about 48rem), not stretched. In Tasks the cards stack one under the other.
- Day view hides the Completed section and the big day header (the page heading already names the day). Week view still shows both.

**Files:** `components/calendar/MyCalendars.tsx` (new), `components/calendar/Toolbar.tsx`, `components/calendar/CalendarScreen.tsx`, `components/calendar/TimeGrid.tsx`, `components/calendar/MonthView.tsx`, `components/shell/DateHeader.tsx`, `components/tasks/TasksScreen.tsx`, `components/home/Hero.tsx`, `lib/store/ui.ts`; `components/calendar/Sidebar.tsx` deleted

**Screenshots** (`screenshots/2026-11-19-one-header-and-day-views/`)
![Tasks week, one header](screenshots/2026-11-19-one-header-and-day-views/hdr-tasks-week.png)
![Calendar day view](screenshots/2026-11-19-one-header-and-day-views/hdr-calendar-day.png)
![Tasks day view](screenshots/2026-11-19-one-header-and-day-views/day-tasks2.png)

---

## 2026-11-19 — Completed at the end, shared title style, week range, tidy-ups

**Asked for:** remove the grid/list switch beside Add task; a COMPLETED section at the end of the Tasks page; event titles in the same style as task titles; the week view heading as a date range; remove the "Visibility and colours here apply to this app only" note.

**What changed**
- The grid/list layout switch beside **Add task** is removed. The toolbar now has Filter and Add task only.
- The **Completed** section at the end of the Tasks page lists every completed task, newest first, and is open by default. Completed tasks also stay struck through in their day column.
- In Week view the heading reads "Nov 15 – Nov 21, 2026" instead of "November 2026", on Calendar and Tasks (desktop). Across a year it reads "Dec 28, 2026 – Jan 3, 2027". Phones keep the short month and year.
- The note under the calendar list ("Visibility and colours here apply to this app only…") is removed.
- Event titles use exactly the task title style (14px, medium weight, same line height) in the week and day grid, the all-day row, the month view, the schedule list and the drag preview. Measured in the browser: task and event titles read the same size and weight.

**Files:** `lib/weekTitle.ts`, `components/calendar/Toolbar.tsx`, `components/calendar/Sidebar.tsx`, `components/tasks/TasksScreen.tsx`, `components/tasks/TaskControls.tsx`, `lib/store/ui.ts`, `components/calendar/TimeGrid.tsx`, `components/calendar/MonthView.tsx`, `components/calendar/ScheduleView.tsx`

**Screenshots** (`screenshots/2026-11-19-completed-and-titles/`)
![Tasks with Completed at the end](screenshots/2026-11-19-completed-and-titles/tasks-end.png)
![Week view titles](screenshots/2026-11-19-completed-and-titles/cal-titles.png)
![Week range heading](screenshots/2026-11-19-completed-and-titles/cal-week-title.png)
![Month view titles](screenshots/2026-11-19-completed-and-titles/cal-Month.png)

---

## 2026-11-19 — Design system tab hidden in production

**Asked for:** show the Design system tab only locally, not in production.

**What changed**
- The Design system tab is in the header and phone bar only when running `npm run dev`. The deployed site shows Calendar and Tasks only.
- Opening `/design-system` in production shows the "page could not be found" screen.
- Checked with a production build: no Design system link on desktop or phone.

**Files:** `components/shell/Header.tsx`, `app/(app)/design-system/page.tsx`

---

## 2026-11-19 — Log out in the account menu

**Asked for:** a log out option (it was only inside Settings).

**What changed**
- The round avatar at the top right now opens a menu with the signed-in email and a **Log out** item. The avatar shows the first letter of the email.
- Log out ends the session and returns to the home page. The same button in Settings → Account & sync now reads "Log out".
- Only shown when Supabase sign-in is on.

**Not checked in a browser:** needs a signed-in session, so no screenshot yet.

**Files:** `components/shell/Header.tsx`, `components/settings/SettingsDialog.tsx`, `lib/supabase/signOut.ts`

---

## 2026-11-19 — Better home page

**Asked for:** improve the home page design, keep one hero section only.

**What changed**
- Still one hero. Headline "Plan the day. Finish the work.", a short line, **Log in** and **Create an account** buttons, and three one-line benefits.
- A small picture of the real app sits beside it: a week of coloured events with today highlighted, and three task cards, one completed and struck through. On phones it sits below the text and shows three days.
- **Create an account** opens the popup on the Sign up tab; **Log in** opens it on Log in. A small Log in button is also in the top corner.
- Colours come from the existing tokens and calendar palette. Without Supabase keys the buttons read "Open Daybook" and go straight to the app.

**Files:** `components/home/Hero.tsx`

**Screenshots** (`screenshots/2026-11-19-home-page/`)
![Desktop](screenshots/2026-11-19-home-page/home-desktop.png)
![Phone](screenshots/2026-11-19-home-page/home-mobile.png)
![Sign up popup](screenshots/2026-11-19-home-page/home-signup.png)

---

## 2026-11-19 — Login, card moves, and clean-up

**Asked for:** a login; a simple home page with only a hero and a Log in button that opens a log in / sign up popup, then opens the app; keyboard and touch ways to move task cards; strikethrough on calendar events whose task is complete; no overdue marks in the Tasks tab; fix the duplicate "Design stand-up" tasks.

**What changed**
- Home page is one hero with a Log in button. The popup has Log in and Sign up; signing in opens the Calendar. New accounts start empty.
- Sign-in uses Supabase. Tasks and events save to the signed-in account (`supabase/schema.sql`, row-level security). Without Supabase keys the app still runs on local sample data with no login. Settings → Account has Sign out.
- Alt+Left / Alt+Right moves a focused task card one day and keeps focus. On touch screens, press and hold a card, then drag it to another day.
- Calendar event titles are struck through when the linked task is completed (week, all-day row, month, schedule).
- Overdue marks removed from task cards, day counts and month dots. The Overdue filter and section remain.
- Duplicate tasks fixed: a load or sync that overlapped a write could drop and re-create tasks. Snapshots are now refetched if a write overlapped them.
- Also in this batch: light only (dark mode removed), colours from tokens only, repeating tasks create their occurrences a month ahead, tasks need a date, time is optional with no default, the "All day" toggle and "Everything else" section removed.

**Not done yet:** Supabase sign-in has not been tried against a real project. Google Calendar and Tasks sync is still to come.

**Files:** `app/page.tsx`, `components/home/*`, `proxy.ts`, `lib/supabase/*`, `lib/data/supabase/supabaseRepository.ts`, `lib/store/data.ts`, `components/tasks/TasksScreen.tsx`, `components/tasks/TaskCard.tsx`, `components/calendar/*`, `components/settings/SettingsDialog.tsx`, `supabase/schema.sql`

**Screenshots** (`screenshots/2026-11-19-login-and-card-moves/`)
![Home](screenshots/2026-11-19-login-and-card-moves/hero.png)
![Log in popup](screenshots/2026-11-19-login-and-card-moves/popup-login.png)
![Sign up popup](screenshots/2026-11-19-login-and-card-moves/popup-signup.png)
![Struck-through event](screenshots/2026-11-19-login-and-card-moves/strike.png)
![Tasks after a card move](screenshots/2026-11-19-login-and-card-moves/moves.png)

---

## 2026-11-19 — Every calendar event has a task

**Asked for:** every event should have a task (for example "Design stand-up" appears in the Tasks view); linked both ways; recurring events get one repeating task; all-day events get a task with no time; deleting the event deletes its task after confirmation; completing the task keeps the event.

**What changed**
- Each event gets a linked task, on load and when an event is created. Existing sample events get tasks too.
- Changing an event's date, time, title, calendar or repeat updates its task, and the reverse.
- All day on a task makes its event all day. Clearing the time no longer deletes the event; it becomes all day.
- Deleting an event asks for confirmation, then deletes its task. Deleting a task deletes its event.
- Repeat on a task is saved to its event's recurrence.

**Not done yet:** completing a repeating task only marks it complete; it doesn't move to the next date.

**Files:** `lib/store/data.ts`, `lib/store/eventActions.ts`, `components/calendar/EventLayers.tsx`, `components/tasks/TaskLayers.tsx`, `components/ui/RepeatSelect.tsx`, `scripts/event-tasks.mjs`

**Screenshots** (`screenshots/2026-11-19-event-tasks/`)
![Tasks week](screenshots/2026-11-19-event-tasks/tasks-week.png)

---

## 2026-11-19 — Event editor opens as a side sheet

**Asked for:** the event should open as a side sheet, like the task details.

**What changed**
- The event editor opens in the same side sheet as task details, with a header bar and close button. It was a centred dialog before.

**Files:** `components/calendar/EventLayers.tsx`

---

## 2026-11-19 — Tasks always have a time, like the calendar

**Asked for:** match the calendar exactly: no Add time button; Date and Time as separate fields, with the time below the date; All day to switch the time off.

**What changed**
- Date and Time are separate fields in both the event editor and the task sheet. The time row sits below the date.
- Tasks have a time like events. New tasks start at 9:00 AM. Add time is removed.
- The All day switch sits below the time. On a task it removes the time and its calendar event; the task keeps its date.
- Every task with a date now creates a calendar event. This is what you asked for, but it means the calendar will fill up with task events.

**Files:** `components/ui/DateTimeRow.tsx`, `components/tasks/TaskLayers.tsx`, `components/calendar/EventLayers.tsx`, `scripts/task-time-link.mjs`

---

## 2026-11-19 — Event and task use one date and time row

**Asked for:** the event's time should match the task's time design.

**What changed**
- The event editor and the task sheet share one date and time row (`components/ui/DateTimeRow.tsx`): date, start time, "to", end time, duration.
- Tasks can have no time, so they get "Add time" and a remove button. Events always have a time, so the event row has neither.
- The All day switch stays below the row in the event editor.

**Files:** `components/ui/DateTimeRow.tsx`, `components/tasks/TaskLayers.tsx`, `components/calendar/EventLayers.tsx`

**Screenshots** (`screenshots/2026-11-19-event-datetime/`)
![Event editor](screenshots/2026-11-19-event-datetime/event-editor.png)

---

## 2026-11-19 — Event date reads like the calendar

**Asked for:** the event's date and time should look like the calendar's date and time.

**What changed**
- The event editor's date shows the plain calendar format, for example "Thu, 19 Nov", not "Today · Thu, 19 Nov".
- "Today" and "Tomorrow" before the date still appear in the task sheet and New task form, where you asked for them.

**Files:** `components/ui/DatePicker.tsx`, `components/tasks/TaskLayers.tsx`, `scripts/event-editor.mjs`

**Screenshots** (`screenshots/2026-11-19-event-datetime/`)
![Event editor](screenshots/2026-11-19-event-datetime/event-editor.png)

---

## 2026-11-19 — Tasks with a time, linked to the calendar

**Asked for:** an optional time on tasks (in the New task form and the task sheet), laid out like the calendar; a timed task becomes a calendar event; the two stay connected; deleting a task asks first; clearing the time removes only the event.

**What changed**
- Date and time is one row, as in the calendar: date, start time, "to", end time, duration. "Add time" appears once a date is set.
- A task with a time creates a calendar event on its calendar, with the same title, start and end. Changing the task's date, time, title or calendar moves or updates the event.
- Changing the event's date, time or title updates the task.
- Clearing the time deletes the event and keeps the task.
- Completing a task leaves its event alone.
- Deleting a task asks first, and says that its event will also be deleted.
- "Rename" in the label: "Due date" is now "Date".

**Files:** `lib/types.ts`, `lib/store/data.ts`, `lib/store/ui.ts`, `lib/data/mock/mockRepository.ts`, `components/tasks/TaskLayers.tsx`, `components/tasks/TaskCard.tsx`, `scripts/task-time-link.mjs`

**Screenshots** (`screenshots/2026-11-19-task-time/`)
![Calendar after a task with a time](screenshots/2026-11-19-task-time/calendar-after-task-time.png)

---

## 2026-11-19 — Day columns: priority first, newest first

**Asked for:** in each day's column, higher priority always at the top; within the same priority, the newest task at the top.

**What changed**
- Day columns sort by priority (high, medium, low, none), then by creation time with the newest first.
- The column order is set in `columnOrder` (`components/tasks/taskModel.ts`). The list view below the columns keeps its own sort setting.

**Files:** `components/tasks/taskModel.ts`, `components/tasks/TasksScreen.tsx`

**Screenshots** (`screenshots/2026-11-19-day-column-order/`)
![Tasks week](screenshots/2026-11-19-day-column-order/tasks-week.png)

---

## 2026-11-19 — New task: "Already completed" checkbox below Subtasks

**Asked for:** keep Mark complete in New task, but with less visual weight than Add subtask.

**What changed**
- Mark complete is now a circle checkbox labelled "Already completed", below the Subtasks section. Ticking it shows "Completed".
- The footer is back to Cancel and Save only.

**Files:** `components/tasks/TaskLayers.tsx`, `scripts/new-task-complete.mjs`

**Screenshots** (`screenshots/2026-11-19-already-completed/`)
![New task sheet](screenshots/2026-11-19-already-completed/new-task-sheet.png)

---

## 2026-11-19 — New task: Mark complete moved to the footer

**Asked for:** option 1 — Mark complete in the footer, separate from the subtasks.

**What changed**
- In the New task form, Mark complete is in the footer on the left, as a secondary button. Cancel and Save are on the right.
- It no longer sits in the scrollable body next to Add subtask.

**Files:** `components/tasks/TaskLayers.tsx`, `scripts/new-task-footer.mjs`

**Screenshots** (`screenshots/2026-11-19-new-task-footer/`)
![New task sheet](screenshots/2026-11-19-new-task-footer/new-task-sheet.png)

---

## 2026-11-19 — Scroll to the new subtask input

**Asked for:** when adding subtasks one below another, the view should scroll so the new input stays visible.

**What changed**
- After each subtask is added with Enter, the input scrolls into view (the browser term is "scroll into view").
- Applies in the task sheet and the New task form.

**Files:** `components/tasks/TaskLayers.tsx`, `scripts/subtask-scroll.mjs`

**Screenshots** (`screenshots/2026-11-19-subtask-scroll/`)
![Task sheet scrolled to new subtask](screenshots/2026-11-19-subtask-scroll/task-sheet-scroll.png)

---

## 2026-11-19 — Subtasks work like Google Tasks

**Asked for:** Add subtask button unchanged; each subtask looks like an input field with a checkbox and × on the right; click a subtask to edit it; the new subtask input appears below the list; remove the subtask count.

**What changed**
- Each subtask is a rounded input-style row: title on the left, checkbox and × on the right.
- Click a subtask's title to edit it. Enter or clicking away saves, Escape cancels.
- The new subtask input sits below the existing subtasks. Enter saves and opens a new input.
- The count next to "Subtasks" is removed.
- The New task form uses the same rows. Pending subtasks keep their checkbox state when the task is saved.

**Files:** `components/tasks/TaskLayers.tsx`, `scripts/subtask-sheet.mjs`

**Screenshots** (`screenshots/2026-11-19-subtask-rows/`)
![Task sheet with subtasks](screenshots/2026-11-19-subtask-rows/task-sheet-subtasks.png)

---

## 2026-11-19 — Subtasks, task sheet layout, card label removed

**Asked for:** subtasks inside a task; the task sheet to match New task (Due date and Calendar stacked, Delete in the top menu); remove the list label from task cards.

**What changed**
- A **Subtasks** section in the task sheet, below Priority. Type a title and press Enter (or Add) to create one; tick it to complete it; × deletes it. The count shows done/total.
- A subtask is a task that points at its parent and uses the same list and calendar. Subtasks don't appear as separate cards on the Tasks view.
- Due date and Calendar are stacked in the task sheet, as in New task.
- The list label is removed from task cards.
- Delete task is back in the ••• menu at the top of the task sheet.

**Files:** `lib/types.ts`, `lib/store/data.ts`, `lib/data/mock/mockRepository.ts`, `components/tasks/TasksScreen.tsx`, `components/tasks/TaskLayers.tsx`, `components/tasks/TaskCard.tsx`

**Screenshots** (`screenshots/2026-11-19-subtasks/`)
![Task sheet with subtasks](screenshots/2026-11-19-subtasks/task-sheet-subtasks.png)

---

## 2026-11-19 — Side sheets: New task and task details

**Asked for:** keep screenshots of the current New task side sheet and of the side sheet that opens when a task is clicked.

**What changed**
- New task opens in the same side sheet as task details, with Cancel and Save at the bottom right.
- The Due date field shows "Today · Thu, 19 Nov" (and the same format for Tomorrow).
- "Location" is removed from the new event form, and the "In 2 weeks" quick pick is removed from the date popup.

**Files:** `components/ui/Modal.tsx`, `components/tasks/TaskLayers.tsx`, `components/ui/DatePicker.tsx`, `components/calendar/EventLayers.tsx`, `scripts/sheets.mjs`

**Screenshots** (`screenshots/2026-11-19-side-sheets/`)
![New task side sheet](screenshots/2026-11-19-side-sheets/new-task-sheet.png)
![Task details side sheet](screenshots/2026-11-19-side-sheets/task-details-sheet.png)

---

## 2026-11-19 — New task form matches the side sheet; no scroll behind dialogs

**Asked for:** the new task form to match the task side sheet; remove "Show in Calendar"; remove "This app only" next to priority in both places; scrolling should only move the dialog, not the page behind it.

**What changed**
- The new task form uses the same layout as the side sheet: large title field, Description field below it, then Due date, Calendar and Priority with the same icons.
- "Show in Calendar" is removed.
- "This app only" is removed from the Priority label in the new task form and in the side sheet.
- Scrolling over the dimmed background no longer moves the page behind a dialog or sheet. The form's body is the only scrolling area inside it.

**Files:** `components/tasks/TaskLayers.tsx`, `components/ui/Modal.tsx`

**Screenshots** (`screenshots/2026-11-19-task-form-scroll/`)
![Tasks week](screenshots/2026-11-19-task-form-scroll/tasks-week.png)

---

## 2026-11-19 — Add task: title label, calendar picker, mark as completed

**Asked for:** a Title label; remove the List field; replace it with a choice of calendar (Family, Anjali, etc.); an option at the bottom to mark the task as already done.

**What changed**
- A **Title** label sits above the title field.
- The List field is removed. Tasks still go to the default Google Tasks list in the background.
- A **Calendar** field lists your calendars and defaults to your primary calendar (Anjali). The choice is stored in Daybook only, because Google Tasks has no calendars.
- A **Mark as already completed** option below Priority creates the task as done.
- "Show in Calendar" was checked in the browser: it opens the Calendar.

**Files:** `components/tasks/TaskLayers.tsx`, `lib/types.ts`, `lib/store/data.ts`, `lib/data/mock/mockRepository.ts`

**Screenshots** (`screenshots/2026-11-19-add-task-calendar/`)
![Tasks week](screenshots/2026-11-19-add-task-calendar/tasks-week.png)

---

## 2026-11-19 — Add task form clean-up

**Asked for:** no "Add details" prompt; labels on every field; due date always Today by default; clear list name; a way back to the Calendar; no "Enter to add" text.

**What changed**
- "Add details" is replaced by a visible **Description** field (optional).
- Every field has a label: Description, Due date, List, Priority.
- Due date defaults to **Today**, unless the task is opened from a specific day, in which case that day is used.
- The list field is labelled **List**, so "My Tasks" is clearly a list choice.
- "Show in Calendar" opens the Calendar on the task's due date (or today if none).
- "Enter to add" is removed.

**Files:** `components/tasks/TaskLayers.tsx`

**Screenshots** (`screenshots/2026-11-19-add-task-form/`)
![Tasks week](screenshots/2026-11-19-add-task-form/tasks-week.png)

---

## 2026-11-19 — Remove colour dot from event popover

**Asked for:** remove the green square beside the event title when an event is opened.

**What changed**
- The popover no longer shows the calendar colour square beside the title. The calendar colour still appears on the event blocks.

**Files:** `components/calendar/EventLayers.tsx`

**Screenshots** (`screenshots/2026-11-19-popover-no-dot/`)
![Calendar week](screenshots/2026-11-19-popover-no-dot/calendar-week.png)

---

## 2026-11-19 — Calendar colours, shadcn view dropdown

**Asked for:** set the four calendar colours (Anjali #3F51B5, Design Studio #0B8043, Learning #8E24AA, Family #F4511E); update the design system tab; use a shadcn component for the Week/Month dropdown.

**What changed**
- Calendars can now take a hex colour directly. The four calendars use the colours above (the request said "Learnig"; the calendar is named "Learning").
- Sample data version bumped so existing browsers pick up the new colours.
- Design system Colour section shows the four calendar colours with their hex values.
- The Week/Month/Day switch in the shared header uses a shadcn-style Select built on Radix (`components/ui/select.tsx`). Type-check and lint pass; not yet tried in the browser.

**Files:** `lib/colors.ts`, `lib/data/mock/seed.ts`, `lib/data/mock/mockRepository.ts`, `components/design/DesignSystem.tsx`, `components/shell/DateHeader.tsx`, `components/ui/select.tsx`, `package.json`

**Screenshots** (`screenshots/2026-11-19-calendar-colours/`)
![Calendar week](screenshots/2026-11-19-calendar-colours/calendar-week.png)

---

## 2026-11-19 — Event colour rule, no edge strip, sidebar, header, ghost button

**Asked for:** the event colour always comes from its calendar; remove the coloured left strip on event blocks; remove the Birthdays and Holidays calendars and the "Other calendars" group, with an "All" toggle; centre the header tabs; ghost button text black by default.

**What changed**
- Events have no colour of their own. Each event takes its calendar's colour everywhere: blocks, month chips, schedule dots, search results. The per-event colour picker is removed from the editor.
- The coloured left strip is removed from event blocks. Blocks are now a soft tint of their calendar colour.
- Birthdays and Holidays calendars and their sample events are removed. The "Other calendars" group is gone. "My calendars" has an **All** toggle that shows or hides every calendar.
- Calendar, Tasks and Design system tabs are centred in the header.
- Ghost button text is black by default (hover unchanged).

**Files:** `components/calendar/TimeGrid.tsx`, `EventLayers.tsx`, `Toolbar.tsx`, `useCalendar.ts`, `Sidebar.tsx`, `components/shell/Header.tsx`, `components/ui/Button.tsx`, `lib/data/mock/seed.ts`, `lib/data/mock/mockRepository.ts`, `lib/store/eventActions.ts`, `lib/store/ui.ts`, `lib/types.ts`, `DESIGN.md`

**Screenshots** (`screenshots/2026-11-19-no-colour-strip/`)
![Calendar week](screenshots/2026-11-19-no-colour-strip/calendar-week.png)

---

## 2026-11-19 — Semantic tokens, month-panel highlight, Tokens tab

**Asked for:** month-panel today and selected colour to the blue; connect them to a token so one change updates everything; rename the token to something semantic; add a Tokens list to the design system with every token.

**What changed**
- Renamed the primary tokens to semantic names: `--semantic-primary`, `--semantic-primary-hover`, `--semantic-on-primary`, `--semantic-destructive`. Components use the matching `bg-semantic-*` classes.
- Month-panel today and selected day now use `--semantic-date-highlight` (text `--semantic-date-highlight-text`), which points at `--semantic-primary`. Change the primary and these follow; retune the date highlight separately if you ever want to.
- Design system has a new **Tokens** section (second in the list) with every token grouped, showing its live value and a swatch for colours.

**Files:** `app/globals.css`, `components/ui/Button.tsx`, `components/ui/DatePicker.tsx`, `components/calendar/CalendarScreen.tsx`, `components/tasks/TasksScreen.tsx`, `components/design/DesignSystem.tsx`, `DESIGN.md`

**Screenshots** (`screenshots/`)
![Calendar week](screenshots/2026-11-19-semantic-tokens/calendar-week.png)
![Design system](screenshots/2026-11-19-semantic-tokens/design-system.png)

---

## 2026-11-19 — Primary and destructive buttons

**Asked for:** primary button colour `#1163ff` with white text; destructive button keeps white text.

**What changed**
- Primary button fill is `#1163ff` (token `--primary`), with white text (`--on-primary`). This is the only blue in the product.
- Destructive button uses a terracotta fill (`--danger-solid`) with white text.
- Found why the text stayed dark: a global rule set `color: inherit` on every `button`, which overrode the variant colour classes. The rule now covers form fields only.
- The floating Create and Add buttons on phones use the primary colour too.

**Files:** `app/globals.css`, `components/ui/Button.tsx`, `components/calendar/CalendarScreen.tsx`, `components/tasks/TasksScreen.tsx`, `components/design/DesignSystem.tsx`, `DESIGN.md`

**Screenshots** (`screenshots/2026-11-19-primary-button-blue/`)
![Tasks week](screenshots/2026-11-19-primary-button-blue/tasks-week.png)
![Tasks phone](screenshots/2026-11-19-primary-button-blue/tasks-phone.png)

---

## 2026-11-19 — Baseline: the app as it stands today

Starting point for this log. Everything below was built and adjusted earlier in the same project and is shown here as it looks now.

**What exists**
- **Calendar tab:** Day, Week, Month and Schedule views. Click or drag to create events, drag to move, repeating events (this event / all events), event popover and editor, search. Calendars (list, mini month, Create) open in a left **side sheet**.
- **Tasks tab:** Day, Week and Month. On a laptop, Week is **7 day columns** with the same day/date row as the Calendar; tasks outside the days shown sit under "Everything else". On phones it is a single list under the same date row. Quick add, details drawer with autosave, complete/reopen/delete with Undo, search, filter, sort, collapsible Completed.
- **Shared header** on both tabs: Today, previous/next, the date shown, Day / Week / Month switch.
- **Settings:** General, Calendar, Tasks, Notifications, Appearance, Account & sync, Shortcuts.
- **Look:** white page, warm neutral greys, olive accent, charcoal type, no blue. Light, dark and system themes.
- **Design system tab (temporary):** every component, token and state on one page.
- **Data:** sample data only, behind a `Repository` interface so Google Tasks and Calendar can be connected later without UI changes.

**Screenshots** (`screenshots/2026-11-19-baseline/`)

| | |
|---|---|
| Calendar, week | ![Calendar week](screenshots/2026-11-19-baseline/calendar-week.png) |
| Calendar, month | ![Calendar month](screenshots/2026-11-19-baseline/calendar-month.png) |
| Calendar, schedule | ![Calendar schedule](screenshots/2026-11-19-baseline/calendar-schedule.png) |
| Tasks, week (7 columns) | ![Tasks week](screenshots/2026-11-19-baseline/tasks-week.png) |
| Tasks, day | ![Tasks day](screenshots/2026-11-19-baseline/tasks-day.png) |
| Tasks, month | ![Tasks month](screenshots/2026-11-19-baseline/tasks-month.png) |
| Design system | ![Design system](screenshots/2026-11-19-baseline/design-system.png) |
| Calendar, phone | ![Calendar phone](screenshots/2026-11-19-baseline/calendar-phone.png) |
| Tasks, phone | ![Tasks phone](screenshots/2026-11-19-baseline/tasks-phone.png) |

**Changes already made earlier on 2026-11-18/19 (not individually screenshotted)**
1. Calendar sidebar became a side sheet that slides over the page.
2. Calendar and Tasks got one shared header with Day / Week / Month.
3. Tasks week became 7 columns; the Tasks day/date row now matches the Calendar's exactly (shared `DayHeaders` component).
4. Light theme changed from warm off-white to white.
5. A temporary Design system tab was added.

---

<!--
ENTRY TEMPLATE (copy above the previous entry)

## YYYY-MM-DD — Short title

**Asked for:** your request in one line.

**What changed**
- ...

**Files:** `path/one.tsx`, `path/two.ts`

**Screenshots** (`screenshots/YYYY-MM-DD-slug/`)
![Name](screenshots/YYYY-MM-DD-slug/name.png)

---
-->
