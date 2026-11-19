"use client";
import { useMemo } from "react";
import { useData } from "@/lib/store/data";
import { usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import { useCalendarViews, useIsMobile, useTz, useToday, type CalendarView } from "@/lib/hooks";
import { addDays, dowOf, monthGrid, startOfWeek } from "@/lib/dates";
import { compareInstances } from "@/lib/layout";
import { expandEvent } from "@/lib/recurrence";
import { hexOf } from "@/lib/colors";
import type { CalView, DateKey, EventInstance } from "@/lib/types";

export function useCalView(): { view: CalView; anchor: DateKey } {
  const stored = useUI((s) => s.calView);
  const def = usePrefs((p) => p.defaultView);
  const anchorStored = useUI((s) => s.calAnchor);
  const today = useToday();
  return { view: stored ?? def, anchor: anchorStored ?? today };
}

export interface Visible {
  /** The days shown as columns (day / week views). */
  days: DateKey[];
  /** Full fetch window. */
  from: DateKey;
  to: DateKey;
  step: number;
}

export const SCHEDULE_DAYS = 60;

export function useVisible(view: CalView, anchor: DateKey): Visible {
  const weekStart = usePrefs((p) => p.weekStart);
  const hideWeekends = usePrefs((p) => p.hideWeekends);
  const mobile = useIsMobile();
  return useMemo(() => {
    if (view === "day") return { days: [anchor], from: anchor, to: anchor, step: 1 };
    if (view === "week") {
      if (mobile) {
        const days = [anchor, addDays(anchor, 1), addDays(anchor, 2)];
        return { days, from: days[0], to: days[2], step: 3 };
      }
      const start = startOfWeek(anchor, weekStart);
      let days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
      if (hideWeekends) days = days.filter((d) => dowOf(d) !== 0 && dowOf(d) !== 6);
      return { days, from: start, to: addDays(start, 6), step: 7 };
    }
    if (view === "month") {
      const grid = monthGrid(anchor, weekStart);
      return { days: grid.flat(), from: grid[0][0], to: grid[grid.length - 1][6], step: 0 };
    }
    return { days: [], from: anchor, to: addDays(anchor, SCHEDULE_DAYS - 1), step: 7 };
  }, [view, anchor, weekStart, hideWeekends, mobile]);
}

/** Instances in [from, to] from visible calendars, sorted. */
export function useInstances(from: DateKey, to: DateKey): EventInstance[] {
  const events = useData((s) => s.events);
  const cals = useCalendarViews();
  const tz = useTz();
  return useMemo(() => {
    const vis = new Set(cals.filter((c) => c.visible).map((c) => c.id));
    const out: EventInstance[] = [];
    for (const ev of events) {
      if (!vis.has(ev.calendarId)) continue;
      out.push(...expandEvent(ev, from, to, tz));
    }
    return out.sort(compareInstances);
  }, [events, cals, from, to, tz]);
}

export function useInstanceColor(): (i: EventInstance) => string {
  const cals = useCalendarViews();
  return useMemo(() => {
    const map = new Map<string, CalendarView>(cals.map((c) => [c.id, c]));
    return (i: EventInstance) => map.get(i.calendarId)?.hex ?? hexOf(undefined);
  }, [cals]);
}

export function stepAnchor(view: CalView, anchor: DateKey, dir: 1 | -1, step: number, weekStart: number): DateKey {
  if (view === "month") {
    const { y, m } = { y: Number(anchor.slice(0, 4)), m: Number(anchor.slice(5, 7)) };
    const total = y * 12 + (m - 1) + dir;
    const ny = Math.floor(total / 12);
    const nm = (total % 12) + 1;
    return `${ny}-${String(nm).padStart(2, "0")}-01`;
  }
  void weekStart;
  return addDays(anchor, dir * (step || 1));
}

/** Ids of events whose linked task is completed. Their titles read struck through. */
export function useDoneEventIds(): Set<string> {
  const tasks = useData((s) => s.tasks);
  const events = useData((s) => s.events);
  return useMemo(() => {
    const done = new Set(tasks.filter((t) => t.status === "completed").map((t) => t.id));
    return new Set(events.filter((e) => e.taskId && done.has(e.taskId)).map((e) => e.id));
  }, [tasks, events]);
}
