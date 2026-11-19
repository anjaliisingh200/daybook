# DESIGN

Status: **implemented** (Phase 3). Tokens live in `app/globals.css`; components in `components/ui`.

## Non-negotiables
- **Blue appears in exactly one place: the primary button (`#1163ff`, white text).** Nowhere else: not in links, selection, focus rings, today markers, native controls (`accent-color`, `::selection` and autofill are overridden) or the colour palettes. Checked by search: the only hex values in components are warm neutrals.
- Warm, restrained, neutral. Colour is used for meaning: terracotta = overdue/destructive/now-line; accent = today, selection, primary actions.
- Not Notion, not Linear, not a dashboard, not Kanban.

## Tokens

There is no dark mode. Every colour decision lives in a token in `app/globals.css`.

| Role | Value |
|---|---|
| `--bg` page | `#ffffff` |
| `--surface` card/panel | `#ffffff` |
| `--surface-2` sunken/hover | `#f6f4ef` |
| `--raised` active pill | `#ffffff` |
| `--border` | `#e8e4da` |
| `--text` | `#26231f` |
| `--text-2` / `--text-3` | `#5f584d` / `#766f63` |
| `--danger` (terracotta) | `#b2513a` |
| Accent (olive default) | `#646b3f` |
| `--semantic-primary` button fill | `#1163ff` |
| `--semantic-destructive` destructive button fill (white text) | `#b2513a` |

- **Accents** (user choice): olive, terracotta, taupe, charcoal, plum, ochre, each with a base and a hover value (`lib/colors.ts`).
- **Calendar/list colours**: terracotta, clay, ochre, olive, sage, moss, rose, plum, taupe, charcoal. Events render as a soft tint of their colour, so text stays charcoal and legible.
- **Priority**: high = terracotta, medium = ochre, low = muted grey; always paired with an icon, never colour alone.
- **Type**: Instrument Sans (UI) and Instrument Serif (dates and headings: month titles, date numbers, empty states).
- **Density**: compact / cozy / roomy via `--hour-h`, `--card-pad`. **Font size**: small / medium / large via root `font-size` (everything is `rem`).
- **Motion**: 100–200 ms ease-out pops, a check "pop" on completion, shimmer skeletons. Honours `prefers-reduced-motion`.

## Design system tab (temporary)
A third tab, **Design system** (`/design-system`), shows every component, token and state in one scrolling reference: colour, type, shape, buttons, form controls, date and time pickers, menus and overlays, task cards, calendar pieces, feedback states and motion. It exists only while the design is being refined. To remove it, delete its entry in `components/shell/Header.tsx` (`TABS`) and the `app/(app)/design-system` and `components/design` folders. The product itself stays at two tabs.

## Components built
Buttons and icon buttons · tooltips · popovers and dropdowns (auto flip/shift) · menus (keyboard navigable) · selects · modal / bottom sheet / side drawer · toasts with Undo · round and square checkboxes · switch · segmented control · badges · date picker (month panel + quick picks) · time select (15-min steps with durations) · skeletons · empty states · sync-status pill.

## Layout
- **Header** (desktop): brand, **exactly two tabs** (Calendar, Tasks), sync pill, settings, account menu. **Phones**: the same two tabs move to a bottom bar.
- **Shared date header (both tabs, identical)**: Today, previous/next, the date or range being shown, and the Day / Week / Month switch (Calendar also offers Schedule). Nothing else lives in it.
- **Calendar**: below the header, a slim action row (Calendars, search, Create). The calendar list and mini month live in a **side sheet** that slides over the page from the left, not a fixed sidebar. Phones: week becomes 3 days, month shows dots with an agenda beneath, a floating Create button.
- **Tasks**: below the header, the date navigation follows the chosen view (7-day strip, single-day card, or month grid with task counts), then a search/filter/sort/layout/Add task row, then one scrolling list of cards grouped by date with sticky group labels. The date navigation never filters. Detail drawer (desktop) or bottom sheet (phone). Phones: single column, floating Add button.

## Honesty rules in the UI
- Task cards show a **date only**, never a time.
- Anything stored only in Daybook (priority, calendar colours/visibility, preferences) is labelled **This app only**.
- Task reminders are shown as **Not supported by Google**, not faked.
- Sync pill states: Synced · Syncing · Offline · Sync failed. Sample-data mode is stated in the pill tooltip and in Account & sync.
