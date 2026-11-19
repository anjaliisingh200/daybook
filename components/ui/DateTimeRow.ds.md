# DateTimeRow
Source: `DateTimeRow.tsx`

The one date and time layout used by **events and tasks**, matching the calendar.

Order: **Date** field, then **Time** (start, "to", end, duration), then the **All day** switch.

- Tasks: All day removes the time (and for linked tasks, makes the event all day).
- Events: pass no `onAllDay`; the switch lives in the editor.
- Never put Date and Time on one line.
