/** Demo data for looking at the panel without logging in. Not part of the real build. */
import { buildSeed } from "@/lib/data/mock/seed";
import { systemTimeZone } from "@/lib/dates";
import type { DateKey, Task, TaskList } from "@/lib/types";
import type { Account, DayData } from "./data";
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
    state = { lists: snap.lists, tasks: snap.tasks, calendars: snap.calendars, events: snap.events, source: "google", needsReconnect: false, eventsUnavailable: false };
  }
  return { ...state, tasks: [...state.tasks] };
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
