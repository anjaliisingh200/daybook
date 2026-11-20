"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { DateHeader } from "@/components/shell/DateHeader";
import { weekRangeTitle } from "@/lib/weekTitle";
import { MyCalendarsMenu } from "./MyCalendars";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { useFmt, useIsMobile, useToday, useTz } from "@/lib/hooks";
import { newDraft } from "@/lib/store/eventActions";
import { useUI } from "@/lib/store/ui";
import { useData } from "@/lib/store/data";
import { expandEvent } from "@/lib/recurrence";
import { addDays, parseKey } from "@/lib/dates";
import type { CalView, DateKey } from "@/lib/types";
import { useCalendarViews } from "@/lib/hooks";
import { toRect } from "@/lib/store/ui";
import type { Visible } from "./useCalendar";

export function CalendarToolbar({ view, anchor, visible, go }: { view: CalView; anchor: DateKey; visible: Visible; go: (d: 1 | -1) => void }) {
  const fmt = useFmt();
  const today = useToday();
  const mobile = useIsMobile();
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openEditor = useUI((s) => s.openEventEditor);

  const title = useMemo(() => {
    if (view === "day") return mobile ? fmt.dayShort(anchor) : `${fmt.dayLong(anchor)}, ${parseKey(anchor).y}`;
    if (view === "month" || view === "schedule") return mobile ? `${fmt.month(anchor, "short")} ${parseKey(anchor).y}` : fmt.monthYear(anchor);
    const a = visible.days[0] ?? anchor;
    const b = visible.days[visible.days.length - 1] ?? anchor;
    if (!mobile) return weekRangeTitle(a, b, (d) => fmt.month(d, "short"));
    const A = parseKey(a);
    const B = parseKey(b);
    if (A.m === B.m && A.y === B.y) return `${fmt.month(a, "short")} ${A.y}`;
    if (A.y === B.y) return `${fmt.month(a, "short")} – ${fmt.month(b, "short")} ${A.y}`;
    return `${fmt.month(a, "short")} ${A.y} – ${fmt.month(b, "short")} ${B.y}`;
  }, [view, anchor, visible, fmt, mobile]);

  const viewOptions = [
    { value: "day" as const, label: "Day", hint: "D" },
    { value: "week" as const, label: mobile ? "3 days" : "Week", hint: "W" },
    { value: "month" as const, label: "Month", hint: "M" },
    { value: "schedule" as const, label: "Schedule", hint: "A" },
  ];

  const stepLabel = view === "month" ? "month" : view === "day" ? "day" : view === "schedule" ? "week" : mobile ? "3 days" : "week";

  return (
    <DateHeader
      title={title}
      view={view}
      views={viewOptions}
      onView={setView}
      onToday={() => setAnchor(today)}
      onStep={go}
      stepLabel={stepLabel}
      right={
        <>
          <CalendarSearch />
          <MyCalendarsMenu />
          <Button size="sm" variant="primary" icon={<Plus className="size-4" />} className="max-md:hidden" onClick={() => openEditor(newDraft({ day: anchor }))}>
            Create
          </Button>
        </>
      }
    />
  );
}

// ───────────────────────────── search ─────────────────────────────

function CalendarSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const events = useData((s) => s.events);
  const cals = useCalendarViews();
  const tz = useTz();
  const today = useToday();
  const fmt = useFmt();
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openPopover = useUI((s) => s.openEventPopover);
  const mobile = useIsMobile();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(el.tagName)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const from = addDays(today, -183);
    const to = addDays(today, 365);
    const vis = new Map(cals.map((c) => [c.id, c]));
    const out = [];
    for (const ev of events) {
      const hay = `${ev.title} ${ev.description ?? ""} ${ev.location ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) continue;
      out.push(...expandEvent(ev, from, to, tz));
    }
    // upcoming first, then past (nearest first); cap recurrence noise
    const seen = new Map<string, number>();
    return out
      .sort((a, b) => {
        const au = a.startDate >= today ? 0 : 1;
        const bu = b.startDate >= today ? 0 : 1;
        return au - bu || (au === 0 ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)) || a.start - b.start;
      })
      .filter((i) => {
        const n = (seen.get(i.event.id) ?? 0) + 1;
        seen.set(i.event.id, n);
        return n <= 3;
      })
      .slice(0, 12)
      .map((i) => ({ i, cal: vis.get(i.calendarId) }));
  }, [q, events, cals, tz, today]);

  const close = () => {
    setOpen(false);
    setQ("");
  };

  return (
    <>
      <div ref={setAnchorEl} className={cn("flex items-center", open ? "w-[min(60vw,18rem)] md:w-72" : "")}>
        {open ? (
          <div className="flex h-9 w-full items-center gap-2 rounded-full border border-border-strong bg-surface px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="size-4 shrink-0 text-text-3" />
            <input
              ref={inputRef}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              placeholder="Search events"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
              aria-label="Search events"
            />
            <button onClick={close} aria-label="Close search" className="text-text-3 hover:text-text">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <IconButton label="Search" shortcut="/" onClick={() => setOpen(true)}>
            <Search className="size-5" />
          </IconButton>
        )}
      </div>
      <Popover open={open && q.trim().length >= 2} onClose={() => {}} anchor={anchorEl} placement="bottom-end" className="w-[min(92vw,24rem)]" ignore={anchorEl} role="listbox" label="Search results">
        {results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-text-2">No events match “{q.trim()}”.</p>
        ) : (
          <ul className="p-1.5">
            {results.map(({ i, cal }) => (
              <li key={i.key}>
                <button
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-surface-2"
                  onClick={(e) => {
                    const rect = toRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                    setAnchor(i.startDate);
                    if (mobile) setView("day");
                    close();
                    setTimeout(() => openPopover(i, mobile ? { ...rect, top: window.innerHeight / 3, bottom: window.innerHeight / 3 + 1, height: 1 } : { ...rect, left: window.innerWidth / 2 - 40, right: window.innerWidth / 2 + 40, width: 80 }), 80);
                  }}
                >
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: cal?.hex }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{i.title}</span>
                    <span className="block truncate text-xs text-text-2">
                      {fmt.dayShort(i.startDate)}
                      {i.allDay ? "" : ` · ${fmt.time(i.start)}`}
                      {cal ? ` · ${cal.name}` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Popover>
    </>
  );
}
