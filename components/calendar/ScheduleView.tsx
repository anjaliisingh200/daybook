"use client";
import { useMemo, useState } from "react";
import { CalendarX2, MapPin, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCalendarViews, useFmt, useToday } from "@/lib/hooks";
import { addDays, range } from "@/lib/dates";
import { byDay } from "@/lib/layout";
import { useUI, toRect } from "@/lib/store/ui";
import { newDraft } from "@/lib/store/eventActions";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Controls";
import type { DateKey, EventInstance } from "@/lib/types";
import { SCHEDULE_DAYS, useDoneEventIds, useInstanceColor, useInstances, type Visible } from "./useCalendar";

export function ScheduleView({ anchor }: { anchor: DateKey; visible: Visible }) {
  const [pages, setPages] = useState(1);
  const to = addDays(anchor, SCHEDULE_DAYS * pages - 1);
  const instances = useInstances(anchor, to);
  const days = useMemo(() => range(anchor, to), [anchor, to]);
  const perDay = useMemo(() => byDay(instances, days), [instances, days]);
  const openEditor = useUI((s) => s.openEventEditor);
  const nonEmpty = days.filter((d) => (perDay.get(d)?.length ?? 0) > 0);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-3 pb-24 pt-2 md:px-6">
        {nonEmpty.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 className="size-5" />}
            title="A clear stretch ahead"
            body="No events in the next couple of months for the calendars you're showing."
            action={
              <Button variant="primary" onClick={() => openEditor(newDraft({ day: anchor }))}>
                Create event
              </Button>
            }
          />
        ) : (
          <AgendaList days={nonEmpty} perDay={perDay} />
        )}
        <div className="flex justify-center py-6">
          <Button variant="secondary" size="sm" onClick={() => setPages((p) => p + 1)}>
            Load later events
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A list of days with their events. Shared by Schedule view and the month view's mobile agenda. */
export function AgendaList({ days, perDay, emptyLabel, showHeader }: { days: DateKey[]; perDay: Map<DateKey, EventInstance[]>; emptyLabel?: string; showHeader?: boolean }) {
  const fmt = useFmt();
  const today = useToday();
  const cals = useCalendarViews();
  const colorOf = useInstanceColor();
  const doneIds = useDoneEventIds();
  const openPopover = useUI((s) => s.openEventPopover);
  const calName = (id: string) => cals.find((c) => c.id === id)?.name ?? "";

  return (
    <ul className={cn(!showHeader && "divide-y divide-border")}>
      {days.map((d) => {
        const list = perDay.get(d) ?? [];
        const isToday = d === today;
        return (
          <li key={d} className={cn("flex gap-3 py-3 md:gap-6 md:py-4", showHeader && "flex-col px-4")}>
            <div className={cn("flex shrink-0 items-baseline gap-2 md:w-28 md:flex-col md:items-start md:gap-0", showHeader && "w-auto flex-row")}>
              <div className={cn("flex size-10 items-center justify-center rounded-full font-display text-2xl leading-none", isToday ? "bg-accent text-on-accent" : "text-text", showHeader && "hidden")}>{fmt.dayNum(d)}</div>
              <div className={cn("text-xs font-medium uppercase tracking-wider", isToday ? "text-accent" : "text-text-2", !showHeader && "md:mt-1")}>
                {showHeader ? fmt.dayLong(d) : `${fmt.month(d, "short")}, ${fmt.weekday(d, "short")}`}
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {list.length === 0 && <li className="py-2 text-sm text-text-3">{emptyLabel}</li>}
              {list.map((i) => (
                <li key={i.key + d}>
                  <button
                    onClick={(e) => openPopover(i, toRect(e.currentTarget.getBoundingClientRect()))}
                    className="group flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: colorOf(i) }} />
                    <span className="tnum w-[10.5rem] shrink-0 whitespace-nowrap pt-px text-sm text-text-2 max-md:w-[8.5rem] max-md:text-xs max-md:leading-5">{i.allDay ? "All day" : fmt.timeRange(i.start, i.end)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-[0.9375rem] font-medium leading-snug">
                        <span className={cn("truncate", doneIds.has(i.event.id) && "line-through decoration-text")}>{i.title}</span>
                        {i.isRecurring && <Repeat className="size-3 shrink-0 text-text-3" />}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-text-2">
                        <span>{calName(i.calendarId)}</span>
                        {i.event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {i.event.location}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
