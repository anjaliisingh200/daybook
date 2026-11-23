"use client";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/cn";
import { zoned } from "@/lib/dates";
import { useFmt, useNow, useToday, useTz } from "@/lib/hooks";
import { byDay, layoutDay, type Placed } from "@/lib/layout";
import { newDraft } from "@/lib/store/eventActions";
import { usePrefs } from "@/lib/store/prefs";
import { toRect, useUI } from "@/lib/store/ui";
import type { DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances } from "./useCalendar";
import { EventCardBody, eventCardClass, eventTier } from "./EventCard";
import { evVars } from "./eventStyle";

const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;

/** Every hour is exactly this tall, with or without events. Events sit at their real time inside it. */
const HOUR = "8rem";
const at = (minutes: number) => `calc(${HOUR} * ${minutes / 60})`;

/**
 * Day view as a timeline: a rail with a big label for every hour, and outlined cards
 * placed at the time they start. Hours are all the same height.
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
  const openPopover = useUI((s) => s.openEventPopover);
  const openEditor = useUI((s) => s.openEventEditor);
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const list = useMemo(() => byDay(instances, [anchor]).get(anchor) ?? [], [instances, anchor]);
  const banners = list.filter(isBanner);
  const placed = useMemo(() => layoutDay(list.filter((i) => !isBanner(i)), anchor, tz), [list, anchor, tz]);
  const isToday = anchor === today;
  const nowMin = zoned(now, tz).minutes;

  // open on the working day: a little before now when viewing today, otherwise 7 AM
  useEffect(() => {
    const sc = scroller.current;
    const el = body.current;
    if (!sc || !el) return;
    const target = isToday ? Math.max(0, Math.floor(zoned(Date.now(), tz).minutes / 60) - 2) : 7;
    const hourPx = el.offsetHeight / 24;
    sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + target * hourPx - 8;
  }, [anchor, isToday, tz]);

  const label = (h: number) => {
    if (h24) return { big: `${String(h).padStart(2, "0")}:00`, small: "" };
    return { big: `${String(h % 12 || 12).padStart(2, "0")}:00`, small: h < 12 ? "AM" : "PM" };
  };

  const hours = Array.from({ length: 24 }, (_, h) => h);

  /** An event card: the same component the week view uses. `mins` is its length on the timeline. */
  const Card = ({ i, mins, className, style }: { i: EventInstance; mins: number; className?: string; style?: React.CSSProperties }) => {
    const heightPx = mins * 2 - 6; // an hour is 8rem, about 120px
    return (
      <button
        type="button"
        data-event
        onClick={(e) => openPopover(i, toRect(e.currentTarget.getBoundingClientRect()))}
        style={{ ...evVars(colorOf(i)), ...style }}
        className={cn(eventCardClass(eventTier(heightPx)), className)}
      >
        <EventCardBody inst={i} done={doneIds.has(i.event.id)} heightPx={heightPx} />
      </button>
    );
  };

  const cardAt = (p: Placed) => (
    <Card
      key={p.inst.key}
      i={p.inst}
      mins={p.bottom - p.top}
      className="absolute"
      style={{
        top: at(p.top),
        height: `calc(${at(p.bottom - p.top)} - 6px)`,
        left: `${(p.col / p.cols) * 100}%`,
        width: `calc(${100 / p.cols}% - 8px)`,
        zIndex: 2 + p.col,
      }}
    />
  );

  return (
    <div ref={scroller} className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-4xl px-3 pb-24 pt-4 md:px-6">
        {banners.length > 0 && (
          <div className="mb-4 flex">
            <div className="w-28 shrink-0 pr-6 text-right md:w-44">
              <div className="tnum text-[1.25rem] font-normal leading-none text-text">All day</div>
            </div>
            <div className="w-px shrink-0 bg-border" />
            <div className="min-w-0 flex-1 space-y-2">
              {banners.map((i) => (
                <Card key={i.key} i={i} mins={30} />
              ))}
            </div>
          </div>
        )}

        <div ref={body} className="relative flex" style={{ height: `calc(${HOUR} * 24)` }}>
          {/* hour labels, and the "Now" tag to the left of the rail */}
          <div className="relative w-28 shrink-0 md:w-44">
            <div aria-hidden>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-6 z-[1] -translate-y-1 bg-bg pl-1 text-right text-text-2"
                  style={{ top: at(h * 60) }}
                >
                  <div className="tnum text-[1.25rem] font-normal leading-none">{label(h).big}</div>
                  {label(h).small && <div className="mt-1 text-sm font-normal leading-none">{label(h).small}</div>}
                </div>
              ))}
            </div>
            {isToday && (
              <div className="pointer-events-none absolute inset-x-0 z-[2] h-0" style={{ top: at(nowMin) }} aria-label={`Now, ${fmt.time(now)}`}>
                <div className="absolute inset-x-0 top-0 h-px bg-semantic-primary" />
                <div className="absolute right-0 top-0 size-2 translate-x-1/2 -translate-y-1/2 rounded-full bg-semantic-primary" />
                <div className="absolute left-0 top-0 -translate-y-1/2 rounded-sm bg-semantic-primary px-2.5 py-1.5 leading-tight text-semantic-on-primary">
                  <div className="text-xs opacity-90">Now</div>
                  <div className="tnum text-[0.9375rem] font-medium">{fmt.time(now)}</div>
                  <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 border-y-[6px] border-l-[6px] border-y-transparent border-l-semantic-primary" />
                </div>
              </div>
            )}
          </div>

          {/* rail */}
          <div className="relative w-px shrink-0 bg-border" aria-hidden>
            {hours.map((h) => (
              <span key={h} className="absolute left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 bg-border" style={{ top: `calc(${at(h * 60)} + 0.5px)` }} />
            ))}
          </div>

          {/* events */}
          <div
            className="relative min-w-0 flex-1 cursor-pointer"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-event]")) return;
              const r = e.currentTarget.getBoundingClientRect();
              const minutes = Math.floor((((e.clientY - r.top) / r.height) * 1440) / 30) * 30;
              openEditor(newDraft({ day: anchor, startMin: Math.max(0, Math.min(1410, minutes)) }));
            }}
          >
            <div className="relative h-full">
              {hours.map((h) => (
                <div key={h} aria-hidden className="pointer-events-none absolute left-0 right-0 h-px bg-border" style={{ top: at(h * 60) }} />
              ))}
              {placed.map(cardAt)}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
