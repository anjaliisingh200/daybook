"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { zoned } from "@/lib/dates";
import { useFmt, useNow, useToday, useTz } from "@/lib/hooks";
import { byDay, layoutDay, type Placed } from "@/lib/layout";
import { useData } from "@/lib/store/data";
import { moveEvent, newDraft } from "@/lib/store/eventActions";
import { usePrefs } from "@/lib/store/prefs";
import { toRect, useUI } from "@/lib/store/ui";
import type { DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances } from "./useCalendar";
import { EventCardBody, eventCardClass, eventTier } from "./EventCard";
import { evVars } from "./eventStyle";

const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
const snap = (m: number, step = 15) => Math.round(m / step) * step;

/** An event being dragged to another time of the day. */
type MoveDrag = { inst: EventInstance; start: number; dur: number };

/** Every hour is exactly this tall, with or without events. Events sit at their real time inside it. */
const HOUR = "8rem";
const at = (minutes: number) => `calc(${HOUR} * ${minutes / 60})`;

/** An event card: the same card the week view uses. `mins` is its length on the timeline. */
function EventButton({
  inst,
  mins,
  color,
  done,
  dim,
  className,
  style,
  onPointerDown,
  onOpen,
}: {
  inst: EventInstance;
  mins: number;
  color: string;
  done: boolean;
  /** Faded while it is being dragged. */
  dim?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent) => void;
  onOpen: (rect: ReturnType<typeof toRect>) => void;
}) {
  const heightPx = mins * 2 - 6; // an hour is 8rem, about 120px
  return (
    <button
      type="button"
      data-event
      onPointerDown={onPointerDown}
      onClick={(e) => onOpen(toRect(e.currentTarget.getBoundingClientRect()))}
      style={{ ...evVars(color), ...style }}
      className={cn(eventCardClass(eventTier(heightPx)), dim && "opacity-40", className)}
    >
      <EventCardBody inst={inst} done={done} heightPx={heightPx} />
    </button>
  );
}

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
  const calendars = useData((s) => s.calendars);
  const readOnlyIds = useMemo(() => new Set(calendars.filter((c) => c.readOnly).map((c) => c.id)), [calendars]);
  const [drag, setDragState] = useState<MoveDrag | null>(null);
  const dragRef = useRef<MoveDrag | null>(null);
  const suppressClick = useRef(false);
  const setDrag = (d: MoveDrag | null) => {
    dragRef.current = d;
    setDragState(d);
  };

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

  /** The minute of the day under a vertical pointer position. */
  const minuteAt = (clientY: number) => {
    const r = body.current!.getBoundingClientRect();
    return clamp(((clientY - r.top) / r.height) * 1440, 0, 1440);
  };

  /**
   * Drag an event to another time of the day, as in the week grid: it snaps to 15 minutes, a dashed copy shows where it will land,
   * and letting go moves it. Escape cancels. Holding it near the top or bottom scrolls the day.
   * Not for repeating events, events in read-only calendars, or touch (a touch drag scrolls).
   */
  const startMove = (e: React.PointerEvent, p: Placed) => {
    const inst = p.inst;
    if (e.button !== 0 || e.pointerType === "touch" || inst.event.recurrence || readOnlyIds.has(inst.calendarId)) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let lastY = e.clientY;
    const grab = minuteAt(e.clientY) - p.top;
    const dur = Math.max(15, Math.round((inst.end - inst.start) / 60_000));
    let moved = false;
    const place = () => setDrag({ inst, dur, start: clamp(snap(minuteAt(lastY) - grab), 0, 1440 - Math.min(dur, 1440)) });
    const timer = window.setInterval(() => {
      const sc = scroller.current;
      if (!sc || !moved) return;
      const r = sc.getBoundingClientRect();
      const dy = lastY < r.top + 56 ? -14 : lastY > r.bottom - 56 ? 14 : 0;
      if (dy) {
        sc.scrollTop += dy;
        place();
      }
    }, 16);
    const onMove = (ev: PointerEvent) => {
      lastY = ev.clientY;
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      place();
    };
    /** `released`: the mouse button is already up (false when Escape cancels a drag that is still being held). */
    const finish = (commit: boolean, released: boolean) => {
      window.clearInterval(timer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      const d = dragRef.current;
      setDrag(null);
      if (!moved) return;
      // the click that ends a drag, wherever the pointer is let go, must not open an event or start a new one
      suppressClick.current = true;
      const clear = () => setTimeout(() => (suppressClick.current = false), 0);
      if (released) clear();
      else window.addEventListener("pointerup", clear, { once: true });
      if (commit && d && d.start !== p.top) void moveEvent(inst, anchor, d.start, tz);
    };
    const onUp = () => finish(true, true);
    const onCancel = () => finish(false, true);
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && finish(false, false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  };

  /** Opens an event's quick view, unless the click is the end of a drag. */
  const open = (i: EventInstance) => (rect: ReturnType<typeof toRect>) => {
    if (suppressClick.current) return;
    openPopover(i, rect);
  };

  const cardAt = (p: Placed) => (
    <EventButton
      key={p.inst.key}
      inst={p.inst}
      mins={p.bottom - p.top}
      color={colorOf(p.inst)}
      done={doneIds.has(p.inst.event.id)}
      dim={drag?.inst.key === p.inst.key}
      onPointerDown={(e) => startMove(e, p)}
      onOpen={open(p.inst)}
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
                <EventButton key={i.key} inst={i} mins={30} color={colorOf(i)} done={doneIds.has(i.event.id)} onOpen={open(i)} />
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
              // letting go of a dragged event over empty space is the end of the drag, not a click to start a new event
              if (suppressClick.current) return;
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
              {/* where a dragged event will land */}
              {drag && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[5] overflow-hidden rounded-sm border border-dashed bg-accent-soft/80 px-3 py-2.5"
                  style={{ top: at(drag.start), height: `calc(${at(drag.dur)} - 6px)`, borderColor: colorOf(drag.inst) }}
                >
                  <div className="truncate text-[0.9375rem] font-medium leading-snug">{drag.inst.title}</div>
                  <div className="tnum text-xs text-text-2">{`${fmt.minutes(drag.start)} – ${fmt.minutes((drag.start + drag.dur) % 1440)}`}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
