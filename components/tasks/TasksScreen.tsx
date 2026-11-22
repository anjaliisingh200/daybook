"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCheck, ChevronDown, ListFilter, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState, Skeleton } from "@/components/ui/Controls";
import { DateHeader } from "@/components/shell/DateHeader";
import { weekRangeTitle } from "@/lib/weekTitle";
import { DayHeaders } from "@/components/shell/DayHeaders";
import { revealColumn } from "@/lib/scroll";
import { cn } from "@/lib/cn";
import { addDays, addMonths, dowOf, parseKey, startOfWeek } from "@/lib/dates";
import { hexOf } from "@/lib/colors";
import { useFmt, useHotkeys, useIsMobile, useToday } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { usePrefs } from "@/lib/store/prefs";
import { NO_FILTERS, useUI } from "@/lib/store/ui";
import type { DateKey, Task } from "@/lib/types";
import { MonthNav } from "./MonthNav";
import { FilterMenu, TaskSearch, activeFilterCount } from "./TaskControls";
import { TaskCard } from "./TaskCard";
import { buildGroups, columnOrderFor, dayKey, matches, passesFilters } from "./taskModel";

export function TasksScreen() {
  const status = useData((s) => s.status);
  const tasks = useData((s) => s.tasks);
  const lists = useData((s) => s.lists);
  const sort = usePrefs((p) => p.taskSort);
  const showCompleted = usePrefs((p) => p.showCompleted);
  const showUndated = usePrefs((p) => p.showUndated);
  const manualOrder = usePrefs((p) => p.manualOrder);
  const layout = usePrefs((p) => p.taskLayout);
  const weekStart = usePrefs((p) => p.weekStart);
  const hideWeekends = usePrefs((p) => p.hideWeekends);
  const query = useUI((s) => s.taskQuery);
  const filters = useUI((s) => s.taskFilters);
  const setFilters = useUI((s) => s.setTaskFilters);
  const selected = useUI((s) => s.tasksSelected);
  const setSelected = useUI((s) => s.setTasksSelected);
  const weekAnchor = useUI((s) => s.tasksWeekAnchor);
  const setWeekAnchor = useUI((s) => s.setTasksWeekAnchor);
  const completedOpen = useUI((s) => s.completedOpen);
  const setCompletedOpen = useUI((s) => s.setCompletedOpen);
  const openQuickAdd = useUI((s) => s.openQuickAdd);
  const setQuery = useUI((s) => s.setTaskQuery);
  const view = useUI((s) => s.tasksView);
  const setView = useUI((s) => s.setTasksView);
  const fmt = useFmt();
  const today = useToday();
  const mobile = useIsMobile();
  // Input type of the last press on a card. A touch drag uses the long-press code below, never native drag.
  const lastPointer = useRef<string>("mouse");
  const scrollRef = useRef<HTMLDivElement>(null);
  // Drag and drop between days and within a day.
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<{ day: DateKey; index: number } | null>(null);
  // Keyboard and touch moves. A keyboard move keeps focus on the card; a long press starts a touch drag.
  const focusAfterMove = useRef<string | null>(null);
  const press = useRef<{ id: string; x: number; y: number; pointerId: number; timer: number | null; active: boolean; slot: { day: DateKey; index: number } | null } | null>(null);
  const suppressClick = useRef(false);
  /** Where the finger is during a touch drag, for scrolling the list when it nears an edge. */
  const dragPoint = useRef<{ x: number; y: number } | null>(null);
  // While a touch drag is active, stop the browser from panning, so it keeps sending pointer events.
  useEffect(() => {
    const block = (e: TouchEvent) => {
      if (press.current?.active) e.preventDefault();
    };
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, []);
  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    document.querySelector<HTMLElement>(`[data-task="${id}"]`)?.focus();
  }, [tasks]);

  /** Puts a dragged task on a day at a position (index among that day's other tasks). */
  const moveTask = (id: string, day: DateKey, index: number) => {
    const moved = tasks.find((t) => t.id === id);
    const others = (byDay.get(day) ?? []).filter((t) => t.id !== id);
    if (moved && !manualOrder && moved.due === day) {
      // First time a day is reordered by hand: the order becomes manual. Every task of the day is given its place
      // from the arrangement on screen, so the others stay exactly where they were.
      const arranged = [...others.slice(0, index), moved, ...others.slice(index)];
      usePrefs.getState().set({ manualOrder: true });
      arranged.forEach((t, i) => void useData.getState().updateTask(t.id, { order: (i + 1) * 1000 }));
      useUI.getState().toast("Manual order is on: a task stays where you drop it. You can change this in Settings → Tasks.", { duration: 6000 });
      return;
    }
    const prev = others[index - 1];
    const next = others[index];
    // Keys sort ascending, so the new key sits between its neighbours.
    const order = prev && next ? (dayKey(prev) + dayKey(next)) / 2 : prev ? dayKey(prev) + 1000 : next ? dayKey(next) - 1000 : 0;
    // Moving to another day moves the task's calendar event with it, keeping the time.
    // With manual order off, the task simply takes its default place on the new day.
    void useData.getState().updateTask(id, { due: day, order: manualOrder ? order : null });
  };

  /** Where a card dropped at (x, y) would land: a day column and a position in it. */
  const slotAt = (id: string, x: number, y: number): { day: DateKey; index: number } | null => {
    let col = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-day]") ?? null;
    if (!col) {
      // Below the last card there is only empty space (the list's bottom padding): the column above it is the target.
      const sc = scrollRef.current?.getBoundingClientRect();
      if (!sc || y < sc.top || y > sc.bottom) return null;
      col = [...document.querySelectorAll<HTMLElement>("[data-day]")].find((c) => {
        const r = c.getBoundingClientRect();
        return x >= r.left && x < r.right;
      }) ?? null;
    }
    if (!col) return null;
    const day = col.dataset.day as DateKey;
    const cards = [...col.querySelectorAll<HTMLElement>("[data-card]:not([data-dragging])")];
    const index = cards.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2 < y;
    }).length;
    return { day, index };
  };

  /** Alt+Left / Alt+Right moves a card one day. Focus stays on the card after it moves. */
  const moveByKey = (id: string, dir: 1 | -1) => {
    const t = tasks.find((x) => x.id === id);
    if (!t?.due) return;
    const to = addDays(t.due, dir);
    focusAfterMove.current = id;
    moveTask(id, to, byDay.get(to)?.length ?? 0);
  };

  const anchor = weekAnchor ?? selected ?? today;
  /** Desktop week/day: one column per day, exactly like the calendar. Phones keep the single list. */
  const columnsMode = view !== "month";
  const listMap = useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
  const nFilters = activeFilterCount(filters);
  const filtering = nFilters > 0 || query.trim().length > 0;

  const days = useMemo<DateKey[]>(() => {
    if (view === "day") return [anchor];
    const start = startOfWeek(anchor, weekStart);
    const all = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return hideWeekends ? all.filter((d) => dowOf(d) !== 0 && dowOf(d) !== 6) : all;
  }, [view, anchor, weekStart, hideWeekends]);

  const { groups, byDay, completed, counts, selectedHasTasks } = useMemo(() => {
    const topTasks = tasks.filter((t) => !t.parentId);
    const allOpen = topTasks.filter((t) => t.status === "needsAction");
    const visible = (t: Task) => matches(t, query, listMap) && passesFilters(t, filters, today);
    const open = allOpen.filter(visible);
    const done = topTasks.filter((t) => t.status === "completed" && visible(t)).sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

    const daySet = new Set(days);
    const byDay = new Map<DateKey, Task[]>(days.map((d) => [d, []]));
    const outside: Task[] = [];
    for (const t of open) {
      if (columnsMode && t.due && daySet.has(t.due)) byDay.get(t.due)!.push(t);
      else outside.push(t);
    }
    // Completed tasks stay in their day column, marked with a check, instead of disappearing.
    const inColumns = (t: Task) => columnsMode && !!t.due && daySet.has(t.due);
    for (const t of done) if (inColumns(t)) byDay.get(t.due!)!.push(t);
    for (const arr of byDay.values()) arr.sort(columnOrderFor(manualOrder));

    const counts = new Map<DateKey, number>();
    for (const t of allOpen) {
      if (!t.due) continue;
      counts.set(t.due, (counts.get(t.due) ?? 0) + 1);
    }
    return {
      // the list (month view): by date
      groups: columnsMode ? [] : buildGroups(outside, today, fmt, sort, showUndated),
      byDay,
      completed: done,
      counts,
      selectedHasTasks: selected ? topTasks.some((t) => t.due === selected) : true,
    };
  }, [tasks, query, filters, today, sort, showUndated, fmt, listMap, selected, days, columnsMode, manualOrder]);

  // The finger can end over the drop slot instead of the card, and the browser then delivers the release there.
  // So while a touch drag is active, the release is also heard on the whole page.
  const moveTaskRef = useRef(moveTask);
  useEffect(() => {
    moveTaskRef.current = moveTask;
  });
  useEffect(() => {
    if (!dragId) return;
    const finish = (e: PointerEvent, cancelled: boolean) => {
      const p = press.current;
      if (!p?.active || e.pointerId !== p.pointerId) return;
      press.current = null;
      setDragId(null);
      setOver(null);
      if (cancelled) return;
      suppressClick.current = true;
      if (p.slot) moveTaskRef.current(p.id, p.slot.day, p.slot.index);
    };
    const up = (e: PointerEvent) => finish(e, false);
    const cancel = (e: PointerEvent) => finish(e, true);
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", cancel);
    return () => {
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
    };
  }, [dragId]);

  // While a card is held near the top or bottom of the list, keep scrolling so a long day can be reordered.
  useEffect(() => {
    const sc = scrollRef.current;
    if (!dragId || !sc) return;
    let raf = 0;
    const tick = () => {
      const p = press.current;
      const pt = dragPoint.current;
      if (p?.active && pt) {
        const r = sc.getBoundingClientRect();
        const EDGE = 72;
        const dy = pt.y < r.top + EDGE ? -Math.ceil((r.top + EDGE - pt.y) / 5) : pt.y > r.bottom - EDGE ? Math.ceil((pt.y - (r.bottom - EDGE)) / 5) : 0;
        if (dy) {
          sc.scrollTop += dy;
          const slot = slotAt(p.id, pt.x, pt.y);
          p.slot = slot;
          setOver((prev) => (prev?.day === slot?.day && prev?.index === slot?.index ? prev : slot));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dragId]);

  // keep today's column on screen: on load, and whenever the week changes
  useEffect(() => {
    const sc = scrollRef.current;
    if (status !== "ready" || !columnsMode || !sc) return;
    sc.scrollLeft = 0;
    const col = sc.querySelector<HTMLElement>(`[data-day="${today}"]`);
    if (col) revealColumn(sc, col);
  }, [status, columnsMode, days, today]);

  const scrollToDay = useCallback((d: DateKey) => {
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector<HTMLElement>(`[data-due="${d}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const pick = (d: DateKey) => {
    // Like the calendar: clicking a day in the week header opens that day.
    if (columnsMode && view === "week") {
      setWeekAnchor(d);
      setSelected(d);
      setView("day");
      return;
    }
    if (selected === d && view !== "day") {
      setSelected(null);
      return;
    }
    setSelected(d);
    if (view === "day") setWeekAnchor(d);
    scrollToDay(d);
  };
  const goToday = () => {
    setWeekAnchor(null);
    setSelected(today);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    scrollToDay(today);
  };
  const step = (dir: 1 | -1) => {
    if (view === "day") {
      const d = addDays(anchor, dir);
      setWeekAnchor(d);
      setSelected(d);
      scrollToDay(d);
    } else if (view === "month") setWeekAnchor(addMonths(anchor, dir));
    else setWeekAnchor(addDays(startOfWeek(anchor, weekStart), dir * 7));
  };

  useHotkeys({
    a: (e) => (e.preventDefault(), openQuickAdd({ due: selected })),
    c: (e) => (e.preventDefault(), openQuickAdd({ due: selected })),
    t: goToday,
    d: () => setView("day"),
    w: () => setView("week"),
    m: () => setView("month"),
    j: () => step(1),
    k: () => step(-1),
  });

  const wStart = startOfWeek(anchor, weekStart);
  const wEnd = addDays(wStart, 6);
  const A = parseKey(wStart);
  const B = parseKey(wEnd);
  let title: string;
  if (view === "day") title = mobile ? fmt.dayShort(anchor) : `${fmt.dayLong(anchor)}, ${parseKey(anchor).y}`;
  else if (view === "month") title = mobile ? `${fmt.month(anchor, "short")} ${parseKey(anchor).y}` : fmt.monthYear(anchor);
  else if (!mobile) title = weekRangeTitle(wStart, wEnd, (d) => fmt.month(d, "short"));
  else if (A.m === B.m) title = `${fmt.month(wStart, "short")} ${A.y}`;
  else if (A.y === B.y) title = `${fmt.month(wStart, "short")} – ${fmt.month(wEnd, "short")} ${A.y}`;
  else title = `${fmt.month(wStart, "short")} ${A.y} – ${fmt.month(wEnd, "short")} ${B.y}`;

  const gridClass = layout === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "mx-auto grid max-w-3xl grid-cols-1 gap-2.5";
  const single = days.length === 1;
  /** A day never gets narrower than this, so on a small window the week scrolls sideways. */
  const DAY_MIN_WIDTH = mobile ? 176 : 200;
  const colTemplate = { gridTemplateColumns: `repeat(${days.length}, minmax(${DAY_MIN_WIDTH}px, 1fr))` };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <DateHeader
        title={title}
        view={view}
        views={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        onView={setView}
        onToday={goToday}
        onStep={step}
        stepLabel={view}
        right={
          mobile ? undefined : (
            <>
              <TaskSearch className="w-48 lg:w-60" />
              <FilterMenu />
              <Button variant="primary" size="sm" icon={<Plus className="size-4" />} onClick={() => openQuickAdd({ due: selected })}>
                Add task
              </Button>
            </>
          )
        }
      />

      {/* phones have no room in the header, so search and filter get their own row */}
      {mobile && (
        <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
          <TaskSearch className="min-w-0 flex-1" />
          <FilterMenu compact />
        </div>
      )}

      {nFilters > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 text-xs md:px-4">
          <ListFilter className="size-3.5 text-text-3" />
          {filters.lists.map((id) => (
            <FilterPill key={id} label={listMap.get(id)?.title ?? id} swatch={hexOf(listMap.get(id)?.color)} onClear={() => setFilters({ ...filters, lists: filters.lists.filter((x) => x !== id) })} />
          ))}
          {filters.priorities.map((p) => (
            <FilterPill key={p} label={p === ("none" as string) ? "No priority" : `${p[0].toUpperCase()}${p.slice(1)} priority`} onClear={() => setFilters({ ...filters, priorities: filters.priorities.filter((x) => x !== p) })} />
          ))}
          {filters.due !== "any" && <FilterPill label={{ overdue: "Overdue", today: "Due today", week: "Next 7 days", none: "No date", any: "" }[filters.due]} onClear={() => setFilters({ ...filters, due: "any" })} />}
          <button className="ml-1 text-text-2 underline-offset-2 hover:underline" onClick={() => setFilters(NO_FILTERS)}>
            Clear all
          </button>
        </div>
      )}

      {!columnsMode && selected && !selectedHasTasks && (
        <div className="anim-fade mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-lg bg-surface-2 px-3 py-2 text-sm text-text-2 md:mx-6">
          <span>Nothing due {fmt.relative(selected, today).toLowerCase() === "today" ? "today" : `on ${fmt.dayShort(selected)}`}. Your other tasks are all still below.</span>
          <button className="ml-auto shrink-0 font-medium text-accent hover:underline" onClick={() => openQuickAdd({ due: selected })}>
            Add one
          </button>
        </div>
      )}

      {/* tasks */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        {/* Day view is a single readable column, not stretched across the screen. */}
        <div className={view === "day" ? "mx-auto max-w-3xl" : "contents"}>
        {/* the day / date row lives inside the scroller so it is exactly as wide as the columns */}
        <div className="sticky top-0 z-10 w-max min-w-full bg-bg">
      {view === "day" ? null : view !== "month" ? (
        <DayHeaders days={days} selected={selected} onPick={pick} minColumnWidth={DAY_MIN_WIDTH} badge={columnsMode ? undefined : (d) => ((counts.get(d) ?? 0) > 0 ? <span>{counts.get(d)}</span> : null)} />
      ) : (
        <div className="shrink-0 border-b border-border px-3 py-3 md:px-6">
          <div className="mx-auto max-w-[88rem]">
            <MonthNav month={anchor} selected={selected} counts={counts} onPick={pick} />
          </div>
        </div>
      )}

        </div>
        {status === "ready" && columnsMode && (
          <div className="grid" style={colTemplate}>
            {days.map((d) => {
              const list = byDay.get(d) ?? [];
              const visibleCount = list.filter((t) => t.id !== dragId).length;
              const isOver = over?.day === d;
              const slot = <div key={`slot-${d}`} className="my-1 h-12 rounded-md border border-dashed border-semantic-primary bg-[color-mix(in_srgb,var(--semantic-primary)_10%,transparent)] transition-all duration-150" />;
              const items: ReactNode[] = [];
              let visibleIndex = 0;
              for (const t of list) {
                if (t.id !== dragId) {
                  if (isOver && over.index === visibleIndex) items.push(slot);
                  visibleIndex++;
                }
                items.push(
                  <div
                    key={t.id}
                    data-card
                    data-dragging={t.id === dragId || undefined}
                    draggable
                    onKeyDown={(e) => {
                      if (!e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
                      e.preventDefault();
                      moveByKey(t.id, e.key === "ArrowRight" ? 1 : -1);
                    }}
                    onPointerDown={(e) => {
                      lastPointer.current = e.pointerType;
                      if (e.pointerType !== "touch" || e.button !== 0) return;
                      const el = e.currentTarget;
                      const p = { id: t.id, x: e.clientX, y: e.clientY, pointerId: e.pointerId, timer: null as number | null, active: false, slot: null as { day: DateKey; index: number } | null };
                      p.timer = window.setTimeout(() => {
                        p.active = true;
                        p.timer = null;
                        el.setPointerCapture?.(p.pointerId);
                        dragPoint.current = { x: p.x, y: p.y };
                        setDragId(p.id);
                        navigator.vibrate?.(10);
                      }, 350);
                      press.current = p;
                    }}
                    onPointerMove={(e) => {
                      const p = press.current;
                      if (!p || e.pointerId !== p.pointerId) return;
                      if (!p.active) {
                        if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10 && p.timer !== null) {
                          window.clearTimeout(p.timer);
                          press.current = null;
                        }
                        return;
                      }
                      e.preventDefault();
                      dragPoint.current = { x: e.clientX, y: e.clientY };
                      const slot = slotAt(p.id, e.clientX, e.clientY);
                      p.slot = slot;
                      if (slot?.day !== over?.day || slot?.index !== over?.index) setOver(slot);
                    }}
                    onPointerUp={(e) => {
                      const p = press.current;
                      if (!p || e.pointerId !== p.pointerId) return;
                      if (p.timer !== null) window.clearTimeout(p.timer);
                      press.current = null;
                      if (p.active) {
                        suppressClick.current = true;
                        setDragId(null);
                        setOver(null);
                        if (p.slot) moveTask(p.id, p.slot.day, p.slot.index);
                      }
                    }}
                    onPointerCancel={(e) => {
                      const p = press.current;
                      if (!p || e.pointerId !== p.pointerId) return;
                      if (p.timer !== null) window.clearTimeout(p.timer);
                      press.current = null;
                      if (p.active) {
                        setDragId(null);
                        setOver(null);
                      }
                    }}
                    onClickCapture={(e) => {
                      if (!suppressClick.current) return;
                      suppressClick.current = false;
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onDragStart={(e) => {
                      if (lastPointer.current === "touch") {
                        e.preventDefault();
                        return;
                      }
                      e.dataTransfer.setData("text/task-id", t.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(t.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                    className={cn("transition-opacity duration-150", t.id === dragId && "touch-none opacity-40")}
                  >
                    <TaskCard task={t} list={listMap.get(t.listId)} selectedDay={selected} compact={!single} hideDue={single && mobile} hideToday={single} />
                  </div>
                );
              }
              if (isOver && over.index === visibleCount) items.push(slot);
              return (
                <div
                  key={d}
                  data-day={d}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    // Where the card would land: after every card whose middle is above the pointer.
                    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]:not([data-dragging])")];
                    const index = cards.filter((el) => {
                      const r = el.getBoundingClientRect();
                      return r.top + r.height / 2 < e.clientY;
                    }).length;
                    if (over?.day !== d || over.index !== index) setOver({ day: d, index });
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData("text/task-id");
                    const index = over?.day === d ? over.index : visibleCount;
                    setDragId(null);
                    setOver(null);
                    if (id) moveTask(id, d, index);
                  }}
                  className={cn(
                    "flex min-h-[19rem] min-w-0 flex-col gap-0 border-l border-border px-1.5 py-2 transition-colors duration-150 first:border-l-0",
                    d === today && "bg-surface"
                  )}
                >
                  <div className="flex flex-col gap-1.5">{items}</div>
                  <button
                    onClick={() => openQuickAdd({ due: d })}
                    className="mt-auto flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-text-3 transition-colors hover:bg-surface-2 hover:text-text"
                    aria-label={`Add task on ${fmt.dayLong(d)}`}
                  >
                    <Plus className="size-3.5" /> Add task
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="mx-auto max-w-[88rem] px-3 pb-28 md:px-6 md:pb-16">
          {status !== "ready" ? (
            <div className={cn(gridClass, "pt-5")}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[8.25rem] rounded-xl" />
              ))}
            </div>
          ) : !columnsMode && groups.length === 0 && completed.length === 0 ? (
            filtering ? (
              <EmptyState
                icon={<ListFilter className="size-5" />}
                title="No tasks match"
                body="Nothing fits the current search and filters. Your tasks are safe, just out of view."
                action={
                  <Button
                    onClick={() => {
                      setFilters(NO_FILTERS);
                      setQuery("");
                    }}
                  >
                    Clear search and filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={<CheckCheck className="size-5" />}
                title="All clear"
                body="You have no tasks. Add one and it will appear in Google Tasks too."
                action={
                  <Button variant="primary" icon={<Plus className="size-4" />} onClick={() => openQuickAdd({ due: selected })}>
                    Add task
                  </Button>
                }
              />
            )
          ) : (
            <>
              {!columnsMode && groups.length === 0 && <EmptyState icon={<CheckCheck className="size-5" />} title="Nothing left to do" body="Every task in view is complete." />}
              {groups.map((g) => (
                <section key={g.id} aria-label={g.label}>
                  <div className="sticky top-0 z-10 -mx-3 flex items-center gap-2.5 bg-bg/90 px-3 pb-2 pt-4 backdrop-blur md:-mx-6 md:px-6">
                    <h2 className={cn("text-xs font-semibold uppercase tracking-[0.12em]", g.tone === "accent" ? "text-accent" : "text-text-2")}>{g.label}</h2>
                    <span className="tnum rounded-full bg-surface-2 px-1.5 text-[0.6875rem] font-medium leading-5 text-text-2">{g.tasks.length}</span>
                    {g.hint && <span className="hidden text-xs text-text-3 sm:inline">{g.hint}</span>}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className={gridClass}>
                    {g.tasks.map((t) => (
                      <TaskCard key={t.id} task={t} list={listMap.get(t.listId)} selectedDay={selected} />
                    ))}
                  </div>
                </section>
              ))}

              {showCompleted && view !== "day" && !(mobile && view === "week") && (
                <section className="mt-8" aria-label="Completed">
                  <button onClick={() => setCompletedOpen(!completedOpen)} aria-expanded={completedOpen} className="flex w-full items-center gap-2.5 rounded-lg py-2 text-left">
                    <ChevronDown className={cn("size-4 text-text-3 transition-transform", !completedOpen && "-rotate-90")} />
                    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-2">Completed</h2>
                    <span className="tnum rounded-full bg-surface-2 px-1.5 text-[0.6875rem] font-medium leading-5 text-text-2">{completed.length}</span>
                    <span className="h-px flex-1 bg-border" />
                  </button>
                  {completedOpen &&
                    (completed.length === 0 ? (
                      <p className="py-4 text-sm text-text-3">No completed tasks to show.</p>
                    ) : (
                      <div className={cn(gridClass, "anim-fade pt-2")}>
                        {completed.map((t) => (
                          <TaskCard key={t.id} task={t} list={listMap.get(t.listId)} selectedDay={selected} />
                        ))}
                      </div>
                    ))}
                </section>
              )}
            </>
          )}
        </div>
        </div>
      </div>

      {/* Phone add button */}
      <button
        aria-label="Add task"
        onClick={() => openQuickAdd({ due: selected })}
        className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-2xl bg-semantic-primary text-semantic-on-primary shadow-lg transition-transform active:scale-95 md:hidden"
      >
        <Plus className="size-6" />
      </button>
    </div>
  );
}

function FilterPill({ label, swatch, onClear }: { label: string; swatch?: string; onClear: () => void }) {
  return (
    <span className="flex h-6 items-center gap-1.5 rounded-full border border-accent-line bg-accent-soft pl-2 pr-1 font-medium">
      {swatch && <span className="size-2 rounded-full" style={{ background: swatch }} />}
      {label}
      <button onClick={onClear} aria-label={`Remove filter ${label}`} className="flex size-4 items-center justify-center rounded-full hover:bg-surface-3">
        <X className="size-3" />
      </button>
    </span>
  );
}
