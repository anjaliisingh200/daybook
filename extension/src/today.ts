import type { CalendarEvent, DateKey, EventInstance, Task } from "@/lib/types";
import { expandEvent } from "@/lib/recurrence";
import { compareInstances } from "@/lib/layout";

/** A top-level task and the subtasks that sit under it. */
export interface TaskRow {
  task: Task;
  subtasks: Task[];
}

const RANK = { high: 0, medium: 1, low: 2, none: 3 } as const;
/** Same rule the Tasks day view uses: a hand-placed task keeps its place, the rest go by priority then newest first. */
const dayKey = (t: Task) => t.meta.order ?? RANK[t.meta.priority ?? "none"] * 1e13 - t.created;

/**
 * The tasks due today, as the Tasks day view shows them. Done tasks stay in the list, marked done.
 * If the person has ever placed a task by hand, the order is the hand-made one; otherwise newest first.
 */
export function todaysTasks(tasks: Task[], today: DateKey): TaskRow[] {
  const top = tasks.filter((t) => !t.parentId && t.due === today);
  const manual = top.some((t) => t.meta.order !== undefined);
  top.sort(manual ? (a, b) => dayKey(a) - dayKey(b) : (a, b) => b.created - a.created);
  return top.map((task) => ({
    task,
    subtasks: tasks.filter((t) => t.parentId === task.id).sort((a, b) => a.position - b.position),
  }));
}

/** Every occurrence that touches today (repeats expanded), all-day first, then by start time. */
export function todaysEvents(events: CalendarEvent[], today: DateKey, tz: string): EventInstance[] {
  const out: EventInstance[] = [];
  for (const ev of events) out.push(...expandEvent(ev, today, today, tz));
  return out.sort(compareInstances);
}

/** All-day events and events that run over more than one day sit in the strip above the hours. */
export const isBanner = (i: EventInstance) => i.allDay || i.startDate !== i.endDate;
