"use client";
import { CalendarDays, Eye, MoreHorizontal } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { ColorCheck } from "@/components/ui/Controls";
import { Dropdown } from "@/components/ui/Popover";
import { PALETTE, PALETTE_KEYS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { useCalendarViews, type CalendarView } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";

/** "My calendars" in the header: show or hide each calendar and pick its colour. */
export function MyCalendarsMenu() {
  const cals = useCalendarViews();
  const shown = cals.filter((c) => c.visible).length;
  return (
    <Dropdown
      placement="bottom-end"
      trigger={
        <Button size="sm" variant="secondary" icon={<CalendarDays className="size-4 text-text-3" />} aria-label="My calendars">
          <span className="max-md:hidden">My calendars</span>
          {cals.length > 0 && shown < cals.length && <span className="tnum text-text-3 max-md:hidden">{shown}/{cals.length}</span>}
        </Button>
      }
    >
      {() => (
        <div className="w-72 p-3">
          <CalendarGroup cals={cals} />
        </div>
      )}
    </Dropdown>
  );
}

function CalendarGroup({ cals }: { cals: CalendarView[] }) {
  const setVisible = usePrefs((p) => p.setCalendarVisible);
  if (!cals.length) return <p className="px-1 py-2 text-sm text-text-3">No calendars yet.</p>;
  const allOn = cals.every((c) => c.visible);
  const toggleAll = () => cals.forEach((c) => setVisible(c.id, !allOn));
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-3">My calendars</h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-2">
          <ColorCheck checked={allOn} color="var(--text-2)" label="Show all calendars" onChange={toggleAll} />
          All
        </label>
      </div>
      <ul>
        {cals.map((c) => (
          <li key={c.id} className="group flex items-center gap-1 rounded-md pr-0.5 hover:bg-surface-2">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-1.5">
              <ColorCheck checked={c.visible} color={c.hex} label={`Show ${c.name}`} onChange={(v) => setVisible(c.id, v)} />
              <span className={cn("truncate text-sm", !c.visible && "text-text-3")}>{c.name}</span>
            </label>
            <CalendarMenu cal={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CalendarMenu({ cal }: { cal: CalendarView }) {
  const setColor = usePrefs((p) => p.setCalendarColor);
  const setVisible = usePrefs((p) => p.setCalendarVisible);
  const all = useCalendarViews();
  return (
    <Dropdown
      placement="bottom-end"
      trigger={
        <IconButton label={`Options for ${cal.name}`} size="sm" className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100" noTooltip>
          <MoreHorizontal className="size-4" />
        </IconButton>
      }
    >
      {(close) => (
        <div className="w-56 p-1.5">
          <button
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2"
            onClick={() => {
              all.forEach((c) => setVisible(c.id, c.id === cal.id));
              close();
            }}
          >
            <Eye className="size-4 text-text-2" /> Display only this
          </button>
          <div className="my-1.5 h-px bg-border" />
          <div className="px-2.5 pb-1 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-3">Colour</div>
          <div className="grid grid-cols-5 gap-2 p-2">
            {PALETTE_KEYS.map((k) => (
              <button
                key={k}
                aria-label={PALETTE[k].name}
                title={PALETTE[k].name}
                onClick={() => {
                  setColor(cal.id, k);
                  close();
                }}
                className={cn("size-7 rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110", cal.colorKey === k && "ring-2 ring-text")}
                style={{ background: PALETTE[k].hex }}
              />
            ))}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
