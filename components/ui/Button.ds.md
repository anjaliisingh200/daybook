# Button · IconButton
Source: `Button.tsx`

**Use:** every clickable action. Pick one variant per row of actions; never two primaries in one place.

| Variant | Look | Use for |
|---|---|---|
| `primary` | `--semantic-primary` fill, white text | the one main action (Save, Add task) |
| `secondary` | surface, grey border | supporting actions (Add subtask, Cancel-like actions) |
| `soft` | accent tint | low-emphasis choices |
| `ghost` | no fill, black text | quiet actions (Cancel, Add time) |
| `danger` | `--semantic-destructive` fill, white text | destructive only (Delete) |

Sizes: `sm` 32px, `md` 36px (default), `lg` 44px. `icon` sits left of the label.
`IconButton` is a round icon-only button with a tooltip; set `label` for screen readers.

**Rules**
- Text colour follows the variant; do not override it with `text-*` classes.
- Disabled buttons drop to 45% opacity and ignore the pointer.
