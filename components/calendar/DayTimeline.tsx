"use client";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Clock, MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { zoned } from "@/lib/dates";
import { useCalendarViews, useFmt, useNow, useToday, useTz } from "@/lib/hooks";
import { byDay, layoutDay, type Placed } from "@/lib/layout";
import { newDraft } from "@/lib/store/eventActions";
import { usePrefs } from "@/lib/store/prefs";
import { toRect, useUI } from "@/lib/store/ui";
import type { DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances } from "./useCalendar";
import { evSurface, evTitle, evVars } from "./TimeGrid";

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
  const cals = useCalendarViews();
  const openPopover = useUI((s) => s.openEventPopover);
  const openEditor = useUI((s) => s.openEventEditor);
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  const list = useMemo(() => byDay(instances, [anchor]).get(anchor) ?? [], [instances, anchor]);
  const banners = list.filter(isBanner);
  const placed = useMemo(() => layoutDay(list.filter((i) => !isBanner(i)), anchor, tz), [list, anchor, tz]);
  const isToday = anchor === today;
  const nowMin = zoned(now, tz).minutes;
  const calName = (id: string) => cals.find((c) => c.id === id)?.name ?? "";

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

  /** An event card. `mins` is its height on the timeline; short events show less. */
  const Card = ({ i, mins, className, style }: { i: EventInstance; mins: number; className?: string; style?: React.CSSProperties }) => {
    const done = doneIds.has(i.event.id);
    const duration = i.allDay ? 0 : Math.round((i.end - i.start) / 60000);
    const short = mins < 45;
    return (
      <button
        type="button"
        data-event
        onClick={(e) => openPopover(i, toRect(e.currentTarget.getBoundingClientRect()))}
        style={{ ...evVars(colorOf(i)), ...style }}
        className={cn(
          "overflow-hidden rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-accent",
          evSurface,
          short ? "flex items-center gap-2.5 px-3" : "p-3.5",
          className
        )}
      >
        {short ? (
          <>
            <span className={cn("min-w-0 truncate", evTitle, done && "line-through")}>{i.title}</span>
            <span className="tnum ml-auto shrink-0 text-xs text-on-solid/90">{i.allDay ? "All day" : fmt.timeRange(i.start, i.end)}</span>
          </>
        ) : (
          <span className="flex items-start gap-3">
            <span className="min-w-0 flex-1">
              <span className={cn("block truncate", evTitle, done && "line-through")}>{i.title}</span>
              {mins >= 90 && i.event.description && <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-on-solid/90">{i.event.description}</span>}
              <span className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-on-solid">
                <Chip icon={<Clock className="size-3" />}>{i.allDay ? "All day" : fmt.timeRange(i.start, i.end)}</Chip>
                {duration > 0 && <Chip>{duration >= 60 && duration % 60 === 0 ? `${duration / 60} hr` : `${duration} mins`}</Chip>}
                <Chip dot>{calName(i.calendarId)}</Chip>
                {i.event.location && <Chip icon={<MapPin className="size-3" />}>{i.event.location}</Chip>}
              </span>
            </span>
          </span>
        )}
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
            <div className="min-w-0 flex-1 space-y-2 pl-6">
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
              <span key={h} className="absolute left-1/2 size-2 -translate-x-1/2 bg-border" style={{ top: at(h * 60) }} />
            ))}
          </div>

          {/* events */}
          <div
            className="relative min-w-0 flex-1 cursor-pointer pl-6"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-event]")) return;
              const r = e.currentTarget.getBoundingClientRect();
              const minutes = Math.floor((((e.clientY - r.top) / r.height) * 1440) / 30) * 30;
              openEditor(newDraft({ day: anchor, startMin: Math.max(0, Math.min(1410, minutes)) }));
            }}
          >
            <div className="relative h-full">
              {hours.map((h) => (
                <div key={h} aria-hidden className="pointer-events-none absolute -left-6 right-0 h-px bg-border" style={{ top: at(h * 60) }} />
              ))}
              {placed.map(cardAt)}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ children, icon, dot }: { children: ReactNode; icon?: ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-sm bg-on-solid/20 px-2 py-1">
      {icon}
      {dot && <span className="size-2 rounded-full bg-on-solid" />}
      {children}
    </span>
  );
}
