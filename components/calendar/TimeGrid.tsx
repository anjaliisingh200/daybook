"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useFmt, useIsMobile, useNow, useToday, useTz } from "@/lib/hooks";
import { zoned, tzOffsetLabel } from "@/lib/dates";
import { byDay, layoutDay, type Placed } from "@/lib/layout";
import { useUI, toRect } from "@/lib/store/ui";
import { usePrefs } from "@/lib/store/prefs";
import { moveEvent, newDraft } from "@/lib/store/eventActions";
import { useData } from "@/lib/store/data";
import type { CalView, DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances, type Visible } from "./useCalendar";
import { Lock, Repeat } from "lucide-react";
import { DayHeaders } from "@/components/shell/DayHeaders";

const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;
const snap = (m: number, step = 15) => Math.round(m / step) * step;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

type Drag =
  | { kind: "create"; day: number; a: number; b: number }
  | { kind: "move"; inst: EventInstance; day: number; start: number; dur: number };

export function evVars(hex: string): React.CSSProperties {
  return { ["--ev" as string]: hex };
}

/** Event titles use exactly the task card title style. */
export const evTitle = "text-[0.9375rem] font-medium leading-snug";

/** Event cards are the calendar's own colour, solid, with white text. */
export const evSurface = "bg-[var(--ev)] text-on-solid hover:brightness-95";

export function TimeGrid({ view, anchor, visible }: { view: CalView; anchor: DateKey; visible: Visible }) {
  void view;
  void anchor;
  const { days, from, to } = visible;
  const fmt = useFmt();
  const tz = useTz();
  const today = useToday();
  const now = useNow(30_000);
  const instances = useInstances(from, to);
  const colorOf = useInstanceColor();
  const calendars = useData((s) => s.calendars);
  const doneIds = useDoneEventIds();
  const openPopover = useUI((s) => s.openEventPopover);
  const openQuick = useUI((s) => s.openQuickCreate);
  const quick = useUI((s) => s.quickCreate);
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const defaultDuration = usePrefs((p) => p.defaultDuration);
  const h24 = usePrefs((p) => p.timeFormat) === "24";

  const scrollRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const suppressClick = useRef(false);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };

  const n = days.length;
  // Desktop days never get narrower than 200px; the week scrolls sideways instead. Phones keep the full width.
  const isPhone = useIsMobile();
  const dayMin = isPhone ? 0 : 200;
  const grid = { gridTemplateColumns: `repeat(${n}, minmax(${dayMin}px, 1fr))` };
  const readOnlyIds = useMemo(() => new Set(calendars.filter((c) => c.readOnly).map((c) => c.id)), [calendars]);

  const perDay = useMemo(() => byDay(instances.filter((i) => !isBanner(i)), days), [instances, days]);
  const placed = useMemo(() => new Map(days.map((d) => [d, layoutDay(perDay.get(d) ?? [], d, tz)])), [days, perDay, tz]);
  const banners = useMemo(() => instances.filter(isBanner), [instances]);

  // initial scroll: show the working day (or "now" when today is on screen)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hourPx = el.scrollHeight / 24;
    const nowMin = zoned(Date.now(), tz).minutes;
    const target = days.includes(today) ? Math.max(0, nowMin / 60 - 2) : 7;
    el.scrollTop = target * hourPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length, tz]);

  // ── pointer helpers ──
  const pos = (e: { clientX: number; clientY: number }) => {
    const r = colsRef.current!.getBoundingClientRect();
    const colW = r.width / n;
    const hourPx = r.height / 24;
    return { day: clamp(Math.floor((e.clientX - r.left) / colW), 0, n - 1), min: clamp(((e.clientY - r.top) / hourPx) * 60, 0, 1440), r, colW, hourPx };
  };

  const rectFor = (day: number, start: number, dur: number) => {
    const r = colsRef.current!.getBoundingClientRect();
    const colW = r.width / n;
    const hourPx = r.height / 24;
    const left = r.left + day * colW;
    const top = r.top + (start / 60) * hourPx;
    return toRect({ left, top, right: left + colW, bottom: top + (dur / 60) * hourPx, width: colW, height: (dur / 60) * hourPx } as DOMRect);
  };

  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("[data-event]")) return;
    const p = pos(e);
    const start = Math.floor(p.min / 15) * 15;
    if (e.pointerType === "touch") {
      // taps only: let the browser scroll
      setDrag({ kind: "create", day: p.day, a: start, b: start });
      return;
    }
    colsRef.current!.setPointerCapture(e.pointerId);
    setDrag({ kind: "create", day: p.day, a: start, b: start });
  };

  const onBgPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.kind !== "create" || e.pointerType === "touch") return;
    const p = pos(e);
    setDrag({ ...d, b: Math.floor(p.min / 15) * 15 });
  };

  const onBgPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.kind !== "create") return;
    setDrag(null);
    if (colsRef.current?.hasPointerCapture(e.pointerId)) colsRef.current.releasePointerCapture(e.pointerId);
    const s = Math.min(d.a, d.b);
    // A new event always starts at the default duration (30 min); the popup can change it.
    const dur = defaultDuration;
    const start = Math.min(s, 1440 - Math.min(dur, 60));
    openQuick(rectFor(d.day, start, dur), newDraft({ day: days[d.day], startMin: start, durationMin: Math.min(dur, 1440 - start) }));
  };

  const startMove = (e: React.PointerEvent, inst: EventInstance, top: number) => {
    if (e.button !== 0) return;
    const ro = readOnlyIds.has(inst.calendarId);
    if (ro || inst.event.recurrence || e.pointerType === "touch") return;
    const sx = e.clientX;
    const sy = e.clientY;
    const grab = pos(e).min - top;
    const dur = Math.max(15, Math.round((inst.end - inst.start) / 60_000));
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
      moved = true;
      const p = pos(ev);
      setDrag({ kind: "move", inst, day: p.day, start: clamp(snap(p.min - grab), 0, 1440 - Math.min(dur, 1440)), dur });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const d = dragRef.current;
      if (moved && d && d.kind === "move") {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        setDrag(null);
        void moveEvent(inst, days[d.day], d.start, tz);
      } else setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // ── all-day / banner lanes ──
  const lanes = useMemo(() => {
    const out: { inst: EventInstance; s: number; e: number; lane: number }[] = [];
    const ends: number[] = [];
    for (const inst of banners) {
      const idx = days.map((d, i) => (d >= inst.startDate && d <= inst.endDate ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const s = idx[0];
      const e = idx[idx.length - 1];
      let lane = ends.findIndex((end) => end < s);
      if (lane === -1) {
        lane = ends.length;
        ends.push(e);
      } else ends[lane] = e;
      out.push({ inst, s, e, lane });
    }
    return { items: out, count: ends.length };
  }, [banners, days]);
  const [showAllBanners, setShowAllBanners] = useState(false);
  const visibleLanes = showAllBanners ? lanes.count : Math.min(lanes.count, 3);

  const todayIdx = days.indexOf(today);
  /** Hour labels in the timeline style: "07:00" with "PM" underneath. */
  const hourLabel = (h: number) => (h24 ? { big: `${String(h).padStart(2, "0")}:00`, small: "" } : { big: `${String(h % 12 || 12).padStart(2, "0")}:00`, small: h < 12 ? "AM" : "PM" });
  const nowMin = zoned(now, tz).minutes;
  const pending = quick && !quick.draft.allDay ? days.indexOf(quick.draft.startDate) : -1;

  useEffect(() => {
    // Escape cancels an in-progress create drag
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dragRef.current && setDrag(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* scrollable hours */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto overscroll-contain">
        {/* Day view is one readable column, not stretched across the screen. */}
        <div className={days.length === 1 ? "mx-auto max-w-3xl" : "contents"}>
        <div className="sticky top-0 z-20 w-max min-w-full bg-bg">
        {/* day headers: shared with the Tasks tab */}
      {/* the day view needs no day header: the page heading already names the day */}
      {days.length > 1 && (
        <DayHeaders
          days={days}
          gutter={tzOffsetLabel(tz, now).replace("GMT", "GMT ")}
          minColumnWidth={dayMin}
          onPick={(d) => {
            setAnchor(d);
            setView("day");
          }}
        />
      )}

        {/* all-day banners */}
        {lanes.count > 0 && (
        <div className="flex shrink-0 border-b border-border">
          <div className="flex w-12 shrink-0 items-start justify-center pt-1.5 text-[0.625rem] font-medium text-text-3 md:w-16">All day</div>
          <div className="relative grid flex-1 gap-y-[3px] py-1" style={{ ...grid, gridAutoRows: "1.375rem" }}>
              {days.map((d, i) => (
              <div key={d} className={cn("pointer-events-none row-span-full border-l border-border first:border-l-0")} style={{ gridColumn: i + 1, gridRow: `1 / span ${Math.max(visibleLanes, 1) + 1}` }} />
            ))}
              {lanes.items
              .filter((x) => x.lane < visibleLanes)
              .map(({ inst, s, e, lane }) => (
                <button
                  key={inst.key}
                  data-event
                  onClick={(ev) => openPopover(inst, toRect(ev.currentTarget.getBoundingClientRect()))}
                  className={cn("z-[1] mx-[3px] flex min-w-0 items-center gap-1 truncate rounded-sm px-1.5 text-left text-xs font-medium", evSurface)}
                  style={{ ...evVars(colorOf(inst)), gridColumn: `${s + 1} / ${e + 2}`, gridRow: lane + 1 }}
                  title={inst.title}
                >
                  <span className={cn("truncate", evTitle, doneIds.has(inst.event.id) && "line-through")}>{inst.title}</span>
                    {!inst.allDay && <span className="shrink-0 font-normal text-on-solid/85">{fmt.time(inst.start, { compact: true })}</span>}
                </button>
              ))}
              {lanes.count > 3 && (
              <button
                onClick={() => setShowAllBanners((v) => !v)}
                className="z-[1] mx-[3px] rounded-[5px] px-1.5 text-left text-xs font-medium text-text-2 hover:bg-surface-2"
                style={{ gridColumn: "1 / -1", gridRow: visibleLanes + 1 }}
              >
                  {showAllBanners ? "Show less" : `${lanes.count - 3} more…`}
              </button>
            )}
          </div>
        </div>
      )}

        </div>
        <div className="relative flex select-none" style={{ height: "calc(var(--hour-h) * 24)" }}>
          <div className="sticky left-0 z-10 w-12 shrink-0 bg-bg md:w-16" aria-hidden>
            <div className="absolute inset-y-0 right-0 w-px bg-border" />
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1 bg-bg pl-0.5 text-right text-text-2 md:right-3" style={{ top: `calc(var(--hour-h) * ${h})` }}>
                <span className="tnum block text-[0.8125rem] font-normal leading-none md:text-base">{hourLabel(h).big}</span>
                {hourLabel(h).small && <span className="mt-0.5 block text-[0.6875rem] leading-none md:text-xs">{hourLabel(h).small}</span>}
              </span>
            ))}
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span key={`m${h}`} className="absolute -right-[3px] size-[7px] -translate-y-1/2 bg-border" style={{ top: `calc(var(--hour-h) * ${h})` }} />
            ))}
            {todayIdx >= 0 && (
              <div className="absolute right-1.5 z-[2] -translate-y-1/2 rounded-sm bg-semantic-primary px-1.5 py-1 leading-tight text-semantic-on-primary" style={{ top: `calc(var(--hour-h) * ${nowMin / 60})` }}>
                <div className="text-[0.625rem] opacity-90">Now</div>
                <div className="tnum text-xs font-medium">{fmt.time(now)}</div>
                <span className="absolute -right-1.5 top-1/2 -translate-y-1/2 border-y-[5px] border-l-[5px] border-y-transparent border-l-semantic-primary" />
              </div>
            )}
          </div>

          <div
            ref={colsRef}
            className="relative grid flex-1 touch-pan-y"
            style={grid}
            onPointerDown={onBgPointerDown}
            onPointerMove={onBgPointerMove}
            onPointerUp={onBgPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {days.map((d, di) => (
              <div
                key={d}
                data-day={d}
                className={cn("relative border-l border-border first:border-l-0", d === today && "bg-accent-soft/50")}
                style={{
                  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent calc(var(--hour-h) - 1px), var(--border) calc(var(--hour-h) - 1px), var(--border) var(--hour-h))",
                }}
              >
                {(placed.get(d) ?? []).map((p) => (
                  <EventBlock
                    key={p.inst.key + d}
                    p={p}
                    color={colorOf(p.inst)}
                    dim={drag?.kind === "move" && drag.inst.key === p.inst.key}
                    readOnly={readOnlyIds.has(p.inst.calendarId)}
                    onPointerDown={(e) => startMove(e, p.inst, p.top)}
                    onClick={(el) => {
                      if (suppressClick.current) return;
                      openPopover(p.inst, toRect(el.getBoundingClientRect()));
                    }}
                  />
                ))}

                {/* create-drag preview */}
                {drag?.kind === "create" && drag.day === di && Math.abs(drag.b - drag.a) >= 15 && (
                  <GhostBlock start={Math.min(drag.a, drag.b)} dur={Math.abs(drag.b - drag.a) + 15} label={`${fmt.minutes(Math.min(drag.a, drag.b))} – ${fmt.minutes((Math.max(drag.a, drag.b) + 15) % 1440)}`} />
                )}
                {drag?.kind === "move" && drag.day === di && (
                  <GhostBlock start={drag.start} dur={drag.dur} color={colorOf(drag.inst)} title={drag.inst.title} label={`${fmt.minutes(drag.start)} – ${fmt.minutes((drag.start + drag.dur) % 1440)}`} />
                )}
                {pending === di && quick && !drag && <GhostBlock start={quick.draft.startMin} dur={Math.max(15, (quick.draft.endDate === quick.draft.startDate ? quick.draft.endMin : 1440) - quick.draft.startMin)} title={quick.draft.title || "(No title)"} solid />}

                {/* now line */}
                {di === todayIdx && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: `calc(var(--hour-h) * ${nowMin / 60})` }}>
                    <div className="relative h-px bg-semantic-primary">
                      <span className="absolute -left-1 -top-[4.5px] size-2.5 rounded-full bg-semantic-primary" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  p,
  color,
  dim,
  readOnly,
  onPointerDown,
  onClick,
}: {
  p: Placed;
  color: string;
  dim: boolean;
  readOnly: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (el: HTMLElement) => void;
}) {
  const fmt = useFmt();
  const { inst } = p;
  const done = useDoneEventIds().has(inst.event.id);
  const h = p.bottom - p.top;
  const widthPct = 100 / p.cols;
  return (
    <button
      data-event
      type="button"
      onPointerDown={onPointerDown}
      onClick={(e) => onClick(e.currentTarget)}
      className={cn(
        "absolute overflow-hidden rounded-sm px-2 text-left text-[0.8125rem] leading-tight outline-none transition-[background,opacity,box-shadow] focus-visible:ring-2 focus-visible:ring-accent",
        h < 40 ? "flex items-center py-0" : "py-1",
        evSurface,
        dim && "opacity-35",
        readOnly ? "cursor-pointer" : inst.event.recurrence ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      )}
      style={{
        ...evVars(color),
        top: `calc(var(--hour-h) * ${p.top / 60} + 1px)`,
        height: `calc(var(--hour-h) * ${h / 60} - 2px)`,
        left: `calc(${p.col * widthPct}% + 2px)`,
        width: `calc(${widthPct}% - 6px)`,
        zIndex: 2 + p.col,
      }}
    >
      {h < 40 ? (
        // short events: one tidy line, "Title  9:00 AM"
        <span className="flex items-center gap-1.5 whitespace-nowrap leading-none">
          <span className={cn("truncate", evTitle, done && "line-through")}>{inst.title}</span>
          <span className="tnum shrink-0 text-[0.6875rem] text-on-solid/85">{fmt.time(inst.start, { compact: true })}</span>
        </span>
      ) : (
        <span className="flex items-start gap-1">
          <span className={cn("line-clamp-2 flex-1", evTitle, done && "line-through")}>{inst.title}</span>
          {inst.isRecurring && <Repeat className="mt-0.5 size-3 shrink-0 text-on-solid/85" aria-label="Repeats" />}
          {readOnly && <Lock className="mt-0.5 size-3 shrink-0 text-on-solid/85" aria-label="Read only" />}
        </span>
      )}
      {h >= 52 && <span className="tnum mt-0.5 block truncate text-xs text-on-solid/90">{fmt.timeRange(inst.start, inst.end)}</span>}
      {h >= 66 && inst.event.location && <span className="mt-0.5 block truncate text-xs text-on-solid/80">{inst.event.location}</span>}
    </button>
  );
}

function GhostBlock({ start, dur, label, color, title, solid }: { start: number; dur: number; label?: string; color?: string; title?: string; solid?: boolean }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-x-[2px] z-[5] overflow-hidden rounded-sm border border-dashed px-2 py-1 text-xs", solid ? "border-accent bg-accent-soft" : "border-accent bg-accent-soft/80")}
      style={{ top: `calc(var(--hour-h) * ${start / 60} + 1px)`, height: `calc(var(--hour-h) * ${dur / 60} - 2px)`, ...(color ? { borderColor: color } : {}) }}
    >
      {title && <div className={cn("truncate", evTitle)}>{title}</div>}
      {label && <div className="tnum text-text-2">{label}</div>}
    </div>
  );
}
