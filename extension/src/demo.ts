/** Demo data for looking at the panel without logging in. Not part of the real build. */
import { buildSeed } from "@/lib/data/mock/seed";
import { systemTimeZone } from "@/lib/dates";
import type { CalendarEvent, DateKey, Task, TaskList } from "@/lib/types";
import { zoned } from "@/lib/dates";
import type { Account, DayData, NewEvent, TaskEdit } from "./data";
import { SignedOutError } from "./errors";

export { SignedOutError };

const account: Account = { id: "demo", email: "anjali@example.com" };
let signedIn = !location.search.includes("login");
let state: DayData | null = null;

export async function currentAccount(): Promise<Account | null> {
  return signedIn ? account : null;
}
export async function signIn(): Promise<Account> {
  signedIn = true;
  return account;
}
export async function signOut(): Promise<void> {
  signedIn = false;
}

export async function loadAll(): Promise<DayData> {
  if (!state) {
    const snap = buildSeed(systemTimeZone());
    state = { lists: snap.lists, tasks: snap.tasks, calendars: snap.calendars, events: snap.events, source: location.search.includes("google") ? "google" : "daybook", needsReconnect: false, eventsUnavailable: false };
  }
  return { ...state, tasks: [...state.tasks], events: [...state.events] };
}

export async function setDone(id: string, done: boolean): Promise<Task> {
  const task = state!.tasks.find((t) => t.id === id)!;
  task.status = done ? "completed" : "needsAction";
  task.completedAt = done ? Date.now() : null;
  return { ...task };
}

export async function addTask(title: string, due: DateKey, lists: TaskList[]): Promise<{ task: Task; list: TaskList | null }> {
  const now = Date.now();
  const task: Task = { id: `t_${now}`, listId: lists[0].id, parentId: null, title, notes: "", status: "needsAction", due, completedAt: null, created: now, updated: now, position: 999, meta: {} };
  state!.tasks.push(task);
  return { task, list: null };
}

export async function updateTask(id: string, patch: TaskEdit): Promise<Task> {
  const task = state!.tasks.find((t) => t.id === id)!;
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.notes !== undefined) task.notes = patch.notes;
  if (patch.priority !== undefined) {
    if (patch.priority === null) delete task.meta.priority;
    else task.meta.priority = patch.priority;
  }
  return { ...task, meta: { ...task.meta } };
}

export async function deleteTask(task: Task, subtasks: Task[]): Promise<void> {
  const gone = new Set([task.id, ...subtasks.map((s) => s.id)]);
  state!.tasks = state!.tasks.filter((t) => !gone.has(t.id));
}

export async function addSubtask(parent: Task, title: string): Promise<Task> {
  const now = Date.now();
  const sub: Task = { id: `t_${now}`, listId: parent.listId, parentId: parent.id, title, notes: "", status: "needsAction", due: null, completedAt: null, created: now, updated: now, position: 999, meta: {} };
  state!.tasks.push(sub);
  return sub;
}

export async function addEvent(input: NewEvent): Promise<{ event: CalendarEvent; task: Task; list: TaskList | null }> {
  const now = Date.now();
  const timed = !input.allDay;
  const event: CalendarEvent = { ...input, id: `e_${now}`, taskId: `t_${now}`, created: now, updated: now };
  const task: Task = {
    id: event.taskId!,
    listId: state!.lists[0].id,
    parentId: null,
    title: input.title,
    notes: "",
    status: "needsAction",
    due: input.startDate ?? zoned(input.start, input.tz).key,
    completedAt: null,
    created: now,
    updated: now,
    position: 999,
    meta: { calendarId: input.calendarId, eventId: event.id, ...(timed ? { startMin: zoned(input.start, input.tz).minutes, endMin: zoned(input.end, input.tz).minutes } : {}) },
  };
  state!.events.push(event);
  state!.tasks.push(task);
  return { event, task, list: null };
}
