# DatePicker
Source: `DatePicker.tsx` (DateField, MonthPanel, TimeSelect)

- **DateField** — the date box with a calendar icon. Opens a month panel with quick picks (Today, Tomorrow, Next week).
  - `relativeLabel` adds "Today ·" before the date (tasks only).
  - `clearable` shows a clear action.
- **MonthPanel** — the month grid; today is ringed, the selected day is filled with the date highlight colour.
- **TimeSelect** — a time box with a clock icon, in 15-minute steps. `from` shows the duration.
