"use client";
import { Plus } from "lucide-react";
import { useUI } from "@/lib/store/ui";
import { usePrefs } from "@/lib/store/prefs";
import { useData } from "@/lib/store/data";
import { useHotkeys, useToday, useTz } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/Controls";
import { CalendarToolbar } from "./Toolbar";
import { TimeGrid } from "./TimeGrid";
import { DayTimeline } from "./DayTimeline";
import { MonthView } from "./MonthView";
import { ScheduleView } from "./ScheduleView";
import { stepAnchor, useCalView, useVisible } from "./useCalendar";
import { newDraft } from "@/lib/store/eventActions";

export function CalendarScreen() {
  const { view, anchor } = useCalView();
  const visible = useVisible(view, anchor);
  const status = useData((s) => s.status);
  const weekStart = usePrefs((p) => p.weekStart);
  const today = useToday();
  const tz = useTz();
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openEditor = useUI((s) => s.openEventEditor);

  const go = (dir: 1 | -1) => setAnchor(stepAnchor(view, anchor, dir, visible.step, weekStart));

  useHotkeys({
    t: () => setAnchor(today),
    d: () => setView("day"),
    w: () => setView("week"),
    m: () => setView("month"),
    a: () => setView("schedule"),
    j: () => go(1),
    k: () => go(-1),
    ArrowRight: () => go(1),
    ArrowLeft: () => go(-1),
    c: (e) => {
      e.preventDefault();
      openEditor(newDraft({ day: anchor, startMin: nextHalfHour(tz) }));
    },
  });

  return (
    <div className="flex h-full min-h-0">
      <section className="flex min-w-0 flex-1 flex-col">
        <CalendarToolbar view={view} anchor={anchor} visible={visible} go={go} />
        <div className="relative min-h-0 flex-1 bg-canvas">
          {status !== "ready" ? (
            <CalendarSkeleton />
          ) : view === "month" ? (
            <MonthView anchor={anchor} visible={visible} />
          ) : view === "schedule" ? (
            <ScheduleView anchor={anchor} visible={visible} />
          ) : view === "day" ? (
            <DayTimeline anchor={anchor} />
          ) : (
            <TimeGrid view={view} anchor={anchor} visible={visible} />
          )}
        </div>
      </section>

      {/* Phone create button */}
      <button
        aria-label="Create event"
        onClick={() => openEditor(newDraft({ day: view === "month" || view === "schedule" ? anchor : visible.days[0] ?? anchor, startMin: nextHalfHour(tz) }))}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-2xl bg-semantic-primary text-semantic-on-primary shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}

function nextHalfHour(tz: string): number {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  const total = h * 60 + m;
  return Math.min(22 * 60, Math.ceil((total + 1) / 30) * 30);
}

function CalendarSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <Skeleton className="h-10 w-full" />
      <div className="grid flex-1 grid-cols-7 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-full" />
        ))}
      </div>
    </div>
  );
}
