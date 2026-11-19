"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { ArrowUpRight, Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { zoned } from "@/lib/dates";
import { useCalendarViews, useFmt, useNow, useToday, useTz } from "@/lib/hooks";
import { byDay } from "@/lib/layout";
import { newDraft } from "@/lib/store/eventActions";
import { usePrefs } from "@/lib/store/prefs";
import { toRect, useUI } from "@/lib/store/ui";
import type { DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances } from "./useCalendar";
import { evTitle, evVars } from "./TimeGrid";

const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;

/**
 * Day view as a timeline: a rail with a big label for every hour, and tall cards
 * for the events that start in that hour. A "Now" tag sits between the cards.
 */
export function DayTimeline({ anchor }: { anchor: DateKey }) {
  const fmt = useFmt();
  const tz = useTz();
  const today = useToday();
  const now = useNow(30_000);
  const h24 = usePrefs((p) => p.timeFormat) === "24";
  const instances = useInstances(anchor, anchor);
  const colorOf = useInstanceColor();
  const doneIds = useDoneEventIds();
  const cals = useCalendarViews();
  const openPopover = useUI((s) => s.openEventPopover);
  const openEditor = useUI((s) => s.openEventEditor);
  const scroller = useRef<HTMLDivElement>(null);

  const list = useMemo(() => byDay(instances, [anchor]).get(anchor) ?? [], [instances, anchor]);
  const banners = list.filter(isBanner);
  const timed = useMemo(
    () =>
      list
        .filter((i) => !isBanner(i))
        .map((i) => ({ i, startMin: zoned(i.start, tz).minutes }))
        .sort((a, b) => a.startMin - b.startMin),
    [list, tz]
  );
  const isToday = anchor === today;
  const nowMin = zoned(now, tz).minutes;
  const calName = (id: string) => cals.find((c) => c.id === id)?.name ?? "";

  // open on the working day: a little before now when viewing today, otherwise 7 AM
  useEffect(() => {
    const target = isToday ? Math.max(0, Math.floor(zoned(Date.now(), tz).minutes / 60) - 2) : 7;
    const el = scroller.current?.querySelector<HTMLElement>(`[data-hour="${target}"]`);
    if (el && scroller.current) scroller.current.scrollTop = el.offsetTop - 8;
  }, [anchor, isToday, tz]);

  const label = (h: number) => {
    if (h24) return { big: `${String(h).padStart(2, "0")}:00`, small: "" };
    return { big: `${String(h % 12 || 12).padStart(2, "0")}:00`, small: h < 12 ? "AM" : "PM" };
  };

  const card = (i: EventInstance) => {
    const done = doneIds.has(i.event.id);
    const current = isToday && !i.allDay && i.start <= now && now < i.end;
    const mins = i.allDay ? 0 : Math.round((i.end - i.start) / 60000);
    return (
      <button
        key={i.key}
        type="button"
        data-event
        onClick={(e) => openPopover(i, toRect(e.currentTarget.getBoundingClientRect()))}
        style={evVars(colorOf(i))}
        className={cn(
          "flex w-full items-start gap-4 rounded-sm border bg-surface p-4 text-left outline-none transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent",
          current ? "border-2 border-[var(--ev)]" : "border-border"
        )}
      >
        <span className="mt-1.5 size-3 shrink-0 bg-[var(--ev)]" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className={cn(evTitle, done && "line-through")}>{i.title}</span>
            {done && <span className="text-xs font-semibold uppercase tracking-wide text-success">✓ Done</span>}
            {current && !done && <span className="text-xs font-semibold uppercase tracking-wide text-text-2">Happening now</span>}
          </span>
          {i.event.description && <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-text-2">{i.event.description}</span>}
          <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-2">
            <Chip icon={<Clock className="size-3" />}>{i.allDay ? "All day" : fmt.timeRange(i.start, i.end)}</Chip>
            {mins > 0 && <Chip>{mins >= 60 && mins % 60 === 0 ? `${mins / 60} hr` : `${mins} mins`}</Chip>}
            <Chip dot={colorOf(i)}>{calName(i.calendarId)}</Chip>
            {i.event.location && <Chip icon={<MapPin className="size-3" />}>{i.event.location}</Chip>}
          </span>
        </span>
        <span className="hidden shrink-0 items-center gap-1 self-center text-sm font-medium text-accent sm:flex">
          Open <ArrowUpRight className="size-4" />
        </span>
      </button>
    );
  };

  /** The "Now" marker. In flow between cards, or placed at the minute inside an empty hour. */
  const nowTag = (topPct?: number) => (
    <div
      key="now"
      className={topPct === undefined ? "relative my-1 h-0" : "absolute inset-x-0 h-0"}
      style={topPct === undefined ? undefined : { top: `${topPct}%` }}
      aria-label={`Now, ${fmt.time(now)}`}
    >
      <div className="absolute -left-6 right-0 top-0 h-px bg-danger" />
      <div className="absolute -left-6 top-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-danger" />
      <div className="absolute left-0 top-0 z-[1] -translate-y-1/2 rounded-sm bg-danger px-2 py-0.5 text-[0.6875rem] font-semibold leading-tight text-on-solid">Now · {fmt.time(now)}</div>
    </div>
  );

  return (
    <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-4xl px-3 pb-24 pt-4 md:px-6">
        {banners.length > 0 && (
          <Row label={{ big: "All day", small: "" }} hasEvents>
            <div className="space-y-3">{banners.map((i) => card(i))}</div>
          </Row>
        )}
        {Array.from({ length: 24 }, (_, h) => {
          const here = timed.filter((t) => Math.floor(t.startMin / 60) === h);
          const isNowHour = isToday && Math.floor(nowMin / 60) === h;
          const items: ReactNode[] = [];
          let placed = false;
          for (const t of here) {
            if (isNowHour && !placed && nowMin < t.startMin) {
              items.push(nowTag());
              placed = true;
            }
            items.push(card(t.i));
          }
          if (isNowHour && !placed && here.length > 0) items.push(nowTag());
          return (
            <Row key={h} hour={h} label={label(h)} hasEvents={here.length > 0} current={isNowHour}>
              {items.length > 0 ? (
                <div className="space-y-3">{items}</div>
              ) : (
                <div className="relative h-full min-h-12">
                  <button
                    type="button"
                    aria-label={`Add event at ${label(h).big} ${label(h).small}`}
                    className="block h-full min-h-12 w-full rounded-sm text-left hover:bg-surface-2"
                    onClick={() => openEditor(newDraft({ day: anchor, startMin: h * 60 }))}
                  />
                  {isNowHour && nowTag(((nowMin % 60) / 60) * 100)}
                </div>
              )}
            </Row>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, hour, hasEvents, current, children }: { label: { big: string; small: string }; hour?: number; hasEvents: boolean; current?: boolean; children: ReactNode }) {
  return (
    <div data-hour={hour} className="flex">
      <div className={cn("w-24 shrink-0 pr-6 pt-1 text-right md:w-32", hasEvents ? "text-text" : "text-text-3")}>
        <div className={cn("tnum font-display text-[1.4rem] leading-none", current && "text-accent")}>{label.big}</div>
        {label.small && <div className="mt-0.5 text-sm font-semibold leading-none">{label.small}</div>}
      </div>
      <div className="relative w-px shrink-0 bg-border">
        <span className={cn("absolute left-1/2 top-2.5 -translate-x-1/2", hasEvents ? "size-2.5 bg-text-2" : "size-2 bg-border", current && "bg-accent ring-4 ring-accent-soft")} />
      </div>
      <div className={cn("min-w-0 flex-1 pl-6", hasEvents ? "pb-6" : "pb-2")}>{children}</div>
    </div>
  );
}

function Chip({ children, icon, dot }: { children: ReactNode; icon?: ReactNode; dot?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 px-2 py-1">
      {icon}
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}
