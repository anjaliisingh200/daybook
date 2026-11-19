import type { DateKey, Priority, Task, TaskList, TaskSort } from "@/lib/types";
import type { Fmt } from "@/lib/format";
import { addDays, diffDays, parseKey, startOfMonth } from "@/lib/dates";
import type { TaskFilters } from "@/lib/store/ui";

export interface TaskGroup {
  id: string;
  label: string;
  hint?: string;
  tone: "danger" | "accent" | "neutral";
  tasks: Task[];
}

const RANK: Record<Priority | "none", number> = { high: 0, medium: 1, low: 2, none: 3 };
export const prioRank = (t: Task) => RANK[t.meta.priority ?? "none"];

/** Day columns: higher priority first; within a priority, the newest task first. */
/**
 * One position value per task in a day. Untouched tasks keep the default order (priority, then newest first).
 * A task the user has dropped carries its own position, which places it exactly where it was released.
 */
export const dayKey = (t: Task) => t.meta.order ?? prioRank(t) * 1e13 - t.created;
/** Day order. Manual: one position per task. Default: newest first, so a new task is added at the top. */
export const columnOrderFor = (manual: boolean) => (a: Task, b: Task) =>
  manual ? dayKey(a) - dayKey(b) : b.created - a.created;

export function matches(t: Task, q: string, lists: Map<string, TaskList>): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return `${t.title} ${t.notes} ${lists.get(t.listId)?.title ?? ""}`.toLowerCase().includes(needle);
}

export function passesFilters(t: Task, f: TaskFilters, today: DateKey): boolean {
  if (f.lists.length && !f.lists.includes(t.listId)) return false;
  if (f.priorities.length && !f.priorities.includes(t.meta.priority ?? ("none" as Priority))) return false;
  switch (f.due) {
    case "overdue":
      return !!t.due && t.due < today;
    case "today":
      return t.due === today;
    case "week":
      return !!t.due && t.due >= today && diffDays(today, t.due) <= 7;
    case "none":
      return !t.due;
    default:
      return true;
  }
}

export function sorter(sort: TaskSort): (a: Task, b: Task) => number {
  const byDue = (a: Task, b: Task) => (a.due ?? "9999").localeCompare(b.due ?? "9999");
  switch (sort) {
    case "priority":
      return (a, b) => prioRank(a) - prioRank(b) || byDue(a, b) || a.position - b.position;
    case "title":
      return (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    case "updated":
      return (a, b) => b.updated - a.updated;
    default:
      return (a, b) => byDue(a, b) || prioRank(a) - prioRank(b) || a.position - b.position;
  }
}

/**
 * One unified collection, organised by date. Sorting and filtering change
 * which tasks are shown and their order inside a group, never the grouping.
 */
export function buildGroups(open: Task[], today: DateKey, fmt: Fmt, sort: TaskSort, showUndated: boolean): TaskGroup[] {
  const cmp = sorter(sort);
  const groups: TaskGroup[] = [];
  const push = (id: string, label: string, tone: TaskGroup["tone"], tasks: Task[], hint?: string) => {
    if (tasks.length) groups.push({ id, label, tone, hint, tasks: [...tasks].sort(cmp) });
  };

  const overdue = open.filter((t) => t.due && t.due < today);
  const todays = open.filter((t) => t.due === today);
  const tomorrow = open.filter((t) => t.due === addDays(today, 1));
  const week = open.filter((t) => t.due && diffDays(today, t.due) >= 2 && diffDays(today, t.due) <= 7);
  const later = open.filter((t) => t.due && diffDays(today, t.due) > 7);
  const undated = open.filter((t) => !t.due);

  push("overdue", "Overdue", "danger", overdue);
  push("today", "Today", "accent", todays, fmt.dayShort(today));
  push("tomorrow", "Tomorrow", "neutral", tomorrow, fmt.dayShort(addDays(today, 1)));
  push("week", "Next 7 days", "neutral", week, `${fmt.dayShort(addDays(today, 2))} – ${fmt.dayShort(addDays(today, 7))}`);

  const byMonth = new Map<string, Task[]>();
  for (const t of later) {
    const m = startOfMonth(t.due!);
    byMonth.set(m, [...(byMonth.get(m) ?? []), t]);
  }
  const sameMonthAsToday = startOfMonth(today);
  for (const m of [...byMonth.keys()].sort()) {
    const label = m === sameMonthAsToday ? "Later this month" : parseKey(m).y === parseKey(today).y ? fmt.month(m, "long") : fmt.monthYear(m);
    push(`m-${m}`, label, "neutral", byMonth.get(m)!);
  }
  if (showUndated) push("undated", "No date", "neutral", undated);
  return groups;
}
