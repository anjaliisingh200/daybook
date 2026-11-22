import type { DateKey, Priority, Task, TaskList, TaskSort } from "@/lib/types";
import type { Fmt } from "@/lib/format";
import { diffDays } from "@/lib/dates";
import type { TaskFilters } from "@/lib/store/ui";

export interface TaskGroup {
  id: string;
  label: string;
  hint?: string;
  tone: "accent" | "neutral";
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
/** A week as a list: one group for every day of it, empty days included, in order. */
export function buildWeekGroups(tasks: Task[], days: DateKey[], today: DateKey, fmt: Fmt, sort: TaskSort): TaskGroup[] {
  const cmp = sorter(sort);
  return days.map((d) => ({
    id: d,
    label: fmt.dayLong(d),
    tone: d === today ? "accent" : "neutral",
    tasks: tasks.filter((t) => t.due === d).sort(cmp),
  }));
}

export function buildGroups(open: Task[], today: DateKey, fmt: Fmt, sort: TaskSort, showUndated: boolean): TaskGroup[] {
  const cmp = sorter(sort);
  const byDate = new Map<DateKey, Task[]>();
  const undated: Task[] = [];
  for (const t of open) {
    if (t.due) byDate.set(t.due, [...(byDate.get(t.due) ?? []), t]);
    else undated.push(t);
  }

  // One group per date, oldest first. No "Overdue", "Tomorrow" or "Next 7 days" buckets: a date is a date.
  const groups: TaskGroup[] = [...byDate.keys()].sort().map((d) => ({
    id: d,
    label: d.slice(0, 4) === today.slice(0, 4) ? fmt.dayLong(d) : `${fmt.dayLong(d)}, ${d.slice(0, 4)}`,
    tone: d === today ? "accent" : "neutral",
    tasks: [...byDate.get(d)!].sort(cmp),
  }));
  if (showUndated && undated.length) groups.push({ id: "undated", label: "No date", tone: "neutral", tasks: [...undated].sort(cmp) });
  return groups;
}
