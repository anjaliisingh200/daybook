# Modal · Drawer · LeftSheet
Source: `Modal.tsx`

- **Modal** — centred dialog for a short decision (Delete confirmation). On phones it becomes a bottom sheet.
- **Drawer** — the right side sheet for task details and the event editor (26rem wide). Same header bar and footer on both.
- **LeftSheet** — the calendar list sheet that slides in from the left.

**Rules**
- Esc and a backdrop click close them.
- Scrolling is locked to the sheet; the page behind does not move.
- Focus moves into the sheet when it opens.
