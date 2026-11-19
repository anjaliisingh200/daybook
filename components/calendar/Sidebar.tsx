"use client";
import { useState } from "react";
import { Eye, MoreHorizontal, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { ColorCheck } from "@/components/ui/Controls";
import { MonthPanel } from "@/components/ui/DatePicker";
import { Dropdown } from "@/components/ui/Popover";
import { PALETTE, PALETTE_KEYS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { useCalendarViews, useToday, useTz, type CalendarView } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import { startOfMonth, startOfWeek, addDays } from "@/lib/dates";
import { newDraft } from "@/lib/store/eventActions";
import { useCalView } from "./useCalendar";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, anchor } = useCalView();
  const today = useToday();
  const tz = useTz();
  const weekStart = usePrefs((p) => p.weekStart);
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openEditor = useUI((s) => s.openEventEditor);
  const cals = useCalendarViews();
  const [month, setMonth] = useState(startOfMonth(anchor));
  const [seenAnchor, setSeenAnchor] = useState(anchor);
  // keep the mini month in step with the main view (adjusting state during render)
  if (seenAnchor !== anchor) {
    setSeenAnchor(anchor);
    setMonth(startOfMonth(anchor));
  }

  const weekStartKey = startOfWeek(anchor, weekStart);
  const week = view === "week" ? Array.from({ length: 7 }, (_, i) => addDays(weekStartKey, i)) : undefined;


  return (
    <div className="flex flex-col gap-5 p-4 pt-4">
      <Button
        variant="secondary"
        size="lg"
        className="w-fit gap-2.5 rounded-2xl pl-4 pr-5 shadow-md"
        icon={<Plus className="size-5 text-accent" />}
        onClick={() => {
          onNavigate?.();
          openEditor(newDraft({ day: anchor === today || !anchor ? today : anchor }));
        }}
      >
        Create
      </Button>

      <MonthPanel
        compact
        value={anchor}
        month={month}
        onMonthChange={setMonth}
        highlightWeek={week}
        onChange={(k) => {
          setAnchor(k);
          if (view === "schedule" || view === "month") setView(view);
          onNavigate?.();
        }}
      />

      <CalendarGroup title="My calendars" cals={cals} showAll />

      <p className="px-1 text-xs leading-relaxed text-text-3">
        Visibility and colours here apply to this app only. They don&apos;t change your Google Calendar.
      </p>
      <span className="sr-only">{tz}</span>
    </div>
  );
}

function CalendarGroup({ title, cals, showAll }: { title: string; cals: CalendarView[]; showAll?: boolean }) {
  const setVisible = usePrefs((p) => p.setCalendarVisible);
  if (!cals.length) return null;
  const allOn = cals.every((c) => c.visible);
  const toggleAll = () => cals.forEach((c) => setVisible(c.id, !allOn));
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-3">{title}</h2>
        {showAll && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-2">
            <ColorCheck checked={allOn} color="var(--text-2)" label="Show all calendars" onChange={toggleAll} />
            All
          </label>
        )}
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
          <div className="px-2.5 pb-1 pt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-3">Colour (this app)</div>
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
