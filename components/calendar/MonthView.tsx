"use client";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { useFmt, useIsMobile, useToday } from "@/lib/hooks";
import { byDay } from "@/lib/layout";
import { sameMonth, parseKey } from "@/lib/dates";
import { useUI, toRect } from "@/lib/store/ui";
import { newDraft } from "@/lib/store/eventActions";
import { Popover } from "@/components/ui/Popover";
import type { DateKey, EventInstance } from "@/lib/types";
import { useDoneEventIds, useInstanceColor, useInstances, type Visible } from "./useCalendar";
import { evSurface, evVars } from "./TimeGrid";
import { AgendaList } from "./ScheduleView";

const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;

export function MonthView({ anchor, visible }: { anchor: DateKey; visible: Visible }) {
  const fmt = useFmt();
  const today = useToday();
  const mobile = useIsMobile();
  const instances = useInstances(visible.from, visible.to);
  const colorOf = useInstanceColor();
  const perDay = useMemo(() => byDay(instances, visible.days), [instances, visible.days]);
  const openPopover = useUI((s) => s.openEventPopover);
  const openQuick = useUI((s) => s.openQuickCreate);
  const openEditor = useUI((s) => s.openEventEditor);
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const [more, setMore] = useState<{ day: DateKey; el: HTMLElement } | null>(null);

  const weeks = visible.days.length / 7;
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellH, setCellH] = useState(120);
  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCellH(el.clientHeight / weeks));
    ro.observe(el);
    return () => ro.disconnect();
  }, [weeks, mobile]);
  const maxChips = Math.max(1, Math.floor((cellH - 34) / 22));

  const header = visible.days.slice(0, 7);

  return (
    <div className="flex h-full flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-border">
        {header.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[0.6875rem] font-medium uppercase tracking-wider text-text-2 md:text-left">
            {fmt.weekday(d, mobile ? "narrow" : "short")}
          </div>
        ))}
      </div>

      <div ref={gridRef} className={cn("grid min-h-0 grid-cols-7", mobile ? "shrink-0" : "flex-1")} style={{ gridTemplateRows: mobile ? `repeat(${weeks}, 3.25rem)` : `repeat(${weeks}, minmax(0, 1fr))` }}>
        {visible.days.map((d) => {
          const list = perDay.get(d) ?? [];
          const inMonth = sameMonth(d, anchor);
          const isToday = d === today;
          const shown = list.slice(0, maxChips - (list.length > maxChips ? 1 : 0));
          const hidden = list.length - shown.length;
          const first = parseKey(d).d === 1;
          return (
            <div
              key={d}
              role="gridcell"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-event],[data-more],[data-daynum]")) return;
                if (mobile) return setAnchor(d);
                const r = toRect(e.currentTarget.getBoundingClientRect());
                openQuick(r, newDraft({ day: d, allDay: true }));
              }}
              onDoubleClick={() => !mobile && openEditor(newDraft({ day: d, allDay: true }))}
              className={cn(
                "relative flex min-h-0 flex-col overflow-hidden border-b border-l border-border p-1 transition-colors first:border-l-0 nth-[7n+1]:border-l-0",
                !inMonth && "bg-surface-2/40",
                mobile && d === anchor && "bg-accent-soft",
                !mobile && "hover:bg-surface-2/50"
              )}
            >
              <button
                data-daynum
                onClick={() => {
                  setAnchor(d);
                  if (!mobile) setView("day");
                }}
                className={cn(
                  "mx-auto flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[0.8125rem] md:mx-0 md:mb-0.5",
                  isToday ? "bg-accent font-semibold text-on-accent" : inMonth ? "text-text hover:bg-surface-3" : "text-text-3 hover:bg-surface-3"
                )}
                aria-label={fmt.dayLong(d)}
              >
                {first && !mobile ? `${fmt.dayNum(d)} ${fmt.month(d, "short")}` : fmt.dayNum(d)}
              </button>

              {mobile ? (
                <div className="mt-1 flex flex-wrap justify-center gap-[3px]">
                  {list.slice(0, 4).map((i) => (
                    <span key={i.key} className="size-1.5 rounded-full" style={{ background: colorOf(i) }} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-0 flex-col gap-[2px]">
                  {shown.map((i) => (
                    <MonthChip key={i.key} inst={i} day={d} color={colorOf(i)} onOpen={(el) => openPopover(i, toRect(el.getBoundingClientRect()))} />
                  ))}
                  {hidden > 0 && (
                    <button data-more onClick={(e) => setMore({ day: d, el: e.currentTarget })} className="rounded px-1.5 text-left text-xs font-medium text-text-2 hover:bg-surface-3">
                      {hidden} more
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {mobile && (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
          <AgendaList days={[anchor]} perDay={perDay} emptyLabel="Nothing planned" showHeader />
        </div>
      )}

      <Popover open={!!more} onClose={() => setMore(null)} anchor={more?.el ?? null} placement="right-start" className="w-64 p-2" label="More events">
        {more && (
          <div>
            <div className="px-2 pb-1.5 pt-1 text-sm font-semibold">{fmt.dayLong(more.day)}</div>
            <div className="flex flex-col gap-[3px]">
              {(perDay.get(more.day) ?? []).map((i) => (
                <MonthChip
                  key={i.key}
                  inst={i}
                  day={more.day}
                  color={colorOf(i)}
                  onOpen={(el) => {
                    openPopover(i, toRect(el.getBoundingClientRect()));
                    setMore(null);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}

function MonthChip({ inst, day, color, onOpen }: { inst: EventInstance; day: DateKey; color: string; onOpen: (el: HTMLElement) => void }) {
  const fmt = useFmt();
  const done = useDoneEventIds().has(inst.event.id);
  const banner = isBanner(inst);
  const startsHere = inst.startDate === day;
  const endsHere = inst.endDate === day;
  return (
    <button
      data-event
      onClick={(e) => onOpen(e.currentTarget)}
      title={inst.title}
      className={cn(
        "flex h-5 min-w-0 shrink-0 items-center gap-1.5 truncate px-1.5 text-left text-xs",
        banner ? cn("font-medium", evSurface, !startsHere && "rounded-l-none border-l-0", startsHere && "rounded-l-[5px]", endsHere ? "rounded-r-[5px]" : "rounded-r-none -mr-1") : "rounded-[5px] hover:bg-surface-3"
      )}
      style={evVars(color)}
    >
      {!banner && <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />}
      {!banner && <span className="tnum shrink-0 text-text-2">{fmt.time(inst.start, { compact: true })}</span>}
      <span className={cn("truncate text-[0.9375rem] font-medium leading-none", done && "line-through")}>{banner && !startsHere && day !== inst.startDate && parseKey(day).d !== 1 ? " " : inst.title}</span>
    </button>
  );
}
