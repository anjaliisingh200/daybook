import { useEffect, useMemo, useState } from "react";
import { dayKey } from "@/components/tasks/taskModel";
import { usePrefs } from "@/lib/store/prefs";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { DayTimeline } from "@/components/calendar/DayTimeline";
import { EventLayers } from "@/components/calendar/EventLayers";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskLayers } from "@/components/tasks/TaskLayers";
import { Button, IconButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Controls";
import { Toaster } from "@/components/ui/Toaster";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/dates";
import type { DateKey } from "@/lib/types";
import { useFmt, useToday, useTz } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { draftFromInstance, newDraft } from "@/lib/store/eventActions";
import { useUI } from "@/lib/store/ui";
import { currentAccount, type Account } from "./data";
import { Login } from "./Login";
import { tasksForDay } from "./today";

type Tab = "tasks" | "calendar";

const savedTab = (): Tab => {
  try {
    return localStorage.getItem("daybook.tab") === "calendar" ? "calendar" : "tasks";
  } catch {
    return "tasks";
  }
};

/** Minutes after midnight of the next half hour in `tz`: where a new event starts (copied from the website's Calendar). */
function nextHalfHour(tz: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value);
  const m = Number(parts.find((p) => p.type === "minute")?.value);
  return Math.min(Math.ceil((h * 60 + m + 1) / 30) * 30, 23 * 60 + 30);
}

/**
 * The floating add button: the website's own primary Button (same height, width style, corners and text size as the
 * "Add task" button in its toolbar), with a plus and a label, kept in the bottom corner.
 */
function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="primary" icon={<Plus className="size-4" />} aria-label={label} onClick={onClick} className="fixed bottom-5 right-4 z-20 shadow-lg">
      {label}
    </Button>
  );
}

/** One day's tasks: the website's Tasks day view (its own task cards, its own "Add task"). */
function TasksDay({ day }: { day: DateKey }) {
  const tasks = useData((s) => s.tasks);
  const lists = useData((s) => s.lists);
  const status = useData((s) => s.status);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const list = useMemo(() => tasksForDay(tasks, day), [tasks, day]);
  const manualOrder = usePrefs((p) => p.manualOrder);

  // Drag a task to another place in the day's list, as on the website's Tasks screen (the website's own rules for the order).
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const manual = manualOrder || list.some((t) => t.meta.order !== undefined);

  /** Puts a dragged task at a position (an index among the other tasks of the day). */
  const moveTask = (id: string, index: number) => {
    const moved = list.find((t) => t.id === id);
    if (!moved) return;
    const others = list.filter((t) => t.id !== id);
    if (!manual) {
      // First time the day is reordered by hand: the order becomes manual. Every task of the day is given its place
      // from the arrangement on screen, so the others stay exactly where they were.
      const arranged = [...others.slice(0, index), moved, ...others.slice(index)];
      usePrefs.getState().set({ manualOrder: true });
      arranged.forEach((t, i) => void useData.getState().updateTask(t.id, { order: (i + 1) * 1000 }));
      useUI.getState().toast("Manual order is on: a task stays where you drop it.", { duration: 6000 });
      return;
    }
    const prev = others[index - 1];
    const next = others[index];
    // Keys sort ascending, so the new key sits between its neighbours.
    const order = prev && next ? (dayKey(prev) + dayKey(next)) / 2 : prev ? dayKey(prev) + 1000 : next ? dayKey(next) - 1000 : 0;
    void useData.getState().updateTask(id, { order });
  };

  const slot = <div key="slot" className="my-1 h-12 rounded-md border border-dashed border-semantic-primary bg-[color-mix(in_srgb,var(--semantic-primary)_10%,transparent)] transition-all duration-150" />;
  const items: React.ReactNode[] = [];
  let shown = 0;
  for (const t of list) {
    if (t.id !== dragId) {
      if (overIndex === shown) items.push(slot);
      shown++;
    }
    items.push(
      <div
        key={t.id}
        data-card
        data-dragging={t.id === dragId || undefined}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/task-id", t.id);
          e.dataTransfer.effectAllowed = "move";
          setDragId(t.id);
        }}
        onDragEnd={() => {
          setDragId(null);
          setOverIndex(null);
        }}
        className={cn("transition-opacity duration-150", t.id === dragId && "opacity-40")}
      >
        <TaskCard task={t} list={listMap.get(t.listId)} selectedDay={day} hideDue hideToday />
      </div>
    );
  }
  if (overIndex === shown) items.push(slot);

  return (
    <div className="relative h-full min-h-0">
      <div className="h-full overflow-y-auto overscroll-contain">
        {status !== "ready" ? (
          <div className="space-y-1.5 px-1.5 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[8.25rem] rounded-xl" />
            ))}
          </div>
        ) : (
          <div
            data-day={day}
            // fills the whole space under the list, so a task can be dropped anywhere below the last card too
            className="flex min-h-full min-w-0 flex-col gap-0 px-1.5 pb-24 pt-2"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              // Where the card would land: after every card whose middle is above the pointer.
              const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]:not([data-dragging])")];
              const index = cards.filter((el) => {
                const r = el.getBoundingClientRect();
                return r.top + r.height / 2 < e.clientY;
              }).length;
              if (overIndex !== index) setOverIndex(index);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/task-id");
              const index = overIndex ?? list.filter((t) => t.id !== id).length;
              setDragId(null);
              setOverIndex(null);
              if (id) moveTask(id, index);
            }}
          >
            <div className="flex flex-col gap-1.5">{items}</div>
          </div>
        )}
      </div>
      <Fab label="Add task" onClick={() => openQuickAdd({ due: day })} />
    </div>
  );
}

/** One day's calendar: the website's Day timeline. */
function CalendarDay({ day }: { day: DateKey }) {
  const tz = useTz();
  const status = useData((s) => s.status);
  const calendars = useData((s) => s.calendars);
  const openEditor = useUI((s) => s.openEventEditor);
  const popover = useUI((s) => s.eventPopover);
  const closePopover = useUI((s) => s.closeEventPopover);

  // Clicking an event opens the event page (the website's editor) straight away, instead of the quick view.
  // A read-only calendar keeps the quick view, because that is where the website says it is read-only.
  useEffect(() => {
    if (!popover) return;
    if (calendars.find((c) => c.id === popover.instance.calendarId)?.readOnly) return;
    openEditor(draftFromInstance(popover.instance, tz));
    closePopover();
  }, [popover, calendars, tz, openEditor, closePopover]);

  return (
    <div className="relative h-full min-h-0">
      {status !== "ready" ? <Skeleton className="m-3 h-64" /> : <DayTimeline anchor={day} />}
      <Fab label="Add event"onClick={() => openEditor(newDraft({ day, startMin: nextHalfHour(tz) }))} />
    </div>
  );
}

export function App() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>(savedTab);
  const load = useData((s) => s.load);
  const sync = useData((s) => s.sync);
  const today = useToday();
  const fmt = useFmt();
  // The day shown. It follows today (and the midnight rollover) until the person steps to another day.
  const [picked, setPicked] = useState<DateKey | null>(null);
  const day = picked ?? today;
  const step = (dir: 1 | -1) => {
    const next = addDays(day, dir);
    setPicked(next === today ? null : next);
  };

  useEffect(() => {
    void currentAccount().then((a) => setAccount(__DEMO__ && location.search.includes("login") ? null : a));
  }, []);

  // load once signed in, then keep fresh the way the website does: every minute while visible, and when the panel comes back into view
  useEffect(() => {
    if (!account) return;
    void load();
    const poll = () => document.visibilityState === "visible" && void sync({ silent: true });
    const id = setInterval(poll, 60_000);
    const onVis = () => document.visibilityState === "visible" && Date.now() - (useData.getState().syncedAt ?? 0) > 30_000 && void sync({ silent: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", poll);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", poll);
    };
  }, [account, load, sync]);

  const pick = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem("daybook.tab", t);
    } catch {
      /* the choice just isn't remembered */
    }
  };

  if (account === undefined) return <div className="flex h-full items-center justify-center text-sm text-text-3">Loading…</div>;
  if (account === null) return <Login onSignedIn={setAccount} />;

  return (
    <div className="flex h-full flex-col bg-bg">
      {/* the top row: the day, with a chevron at each end to step to the previous or next day. The tab stays as it is. */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2">
        <IconButton label="Previous day" onClick={() => step(-1)}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <h1 className="font-display min-w-0 flex-1 truncate text-center text-[1.5rem] leading-none">{fmt.dayLong(day)}</h1>
        <IconButton label="Next day" onClick={() => step(1)}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      {/* the website's Tasks / Calendar switch, under the day */}
      <nav aria-label="Primary" className="shrink-0 border-b border-border px-3 py-2">
        <ul role="tablist" className="flex rounded-xl bg-surface-2 p-1">
          {(
            [
              { id: "tasks", label: "Tasks", Icon: CheckCircle2 },
              { id: "calendar", label: "Calendar", Icon: CalendarDays },
            ] as const
          ).map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <li key={id} className="flex-1" role="presentation">
                <button
                  role="tab"
                  aria-selected={active}
                  onClick={() => pick(id)}
                  className={cn(
                    "flex h-8 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-150",
                    active ? "bg-raised text-text shadow-sm" : "text-text-2 hover:text-text"
                  )}
                >
                  <Icon className={cn("size-4", active && "text-accent")} />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <main className="min-h-0 flex-1">{tab === "tasks" ? <TasksDay day={day} /> : <CalendarDay day={day} />}</main>

      <EventLayers />
      <TaskLayers />
      <Toaster />
    </div>
  );
}
