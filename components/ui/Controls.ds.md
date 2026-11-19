# Controls
Source: `Controls.tsx` (Input, Textarea, Field, RoundCheck, ColorCheck, Switch, Segmented, Badge, Skeleton, EmptyState)

**Input / Textarea** — 36px / multi-line, border turns to the accent on focus with a soft ring. Always wrap in `Field` so the label sits above.

**Field** — a label above any control, with optional hint text below.

**RoundCheck** — the circular completion check.
- Unchecked: grey ring.
- Checked: light blue fill (`--semantic-primary` at 16%), blue ring, blue check.

**ColorCheck** — square checkbox used for calendar visibility, filled with the calendar colour.

**Switch** — on/off toggle.
- On: `--success` green (not the accent).
- Off: warm grey.

**Segmented** — one choice from a few; the selected segment is raised.

**Badge** — small status label: `neutral`, `accent`, `danger`, `muted`.

**Skeleton / EmptyState** — loading placeholder and the empty-list message with an icon and optional action.
