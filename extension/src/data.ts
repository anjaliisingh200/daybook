import type { CalendarEvent, CalendarInfo, DateKey, Priority, Snapshot, Task, TaskList } from "@/lib/types";
import { zoned } from "@/lib/dates";
import { SignedOutError } from "./errors";
import { supabase } from "./supabase";

/** Everything the panel shows, read for one signed-in person. */
export interface DayData {
  lists: TaskList[];
  tasks: Task[];
  calendars: CalendarInfo[];
  events: CalendarEvent[];
  /** Where today's events came from. */
  source: "google" | "daybook";
  /** Google is connected on the website but its saved permission no longer works. */
  needsReconnect: boolean;
  /** Google events could not be reached this time (no internet, or the site is down). */
  eventsUnavailable: boolean;
}

export interface Account {
  id: string;
  email: string;
}

export { SignedOutError };

const STARTER_LIST: TaskList = { id: "l_my", title: "My Tasks", color: "taupe" };
const rid = () => Math.random().toString(36).slice(2, 10);

// ───────────────────────────── the account ─────────────────────────────

export async function currentAccount(): Promise<Account | null> {
  const { data } = await supabase().auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? "" } : null;
}

export async function signIn(email: string, password: string): Promise<Account> {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message === "Failed to fetch" ? "Couldn't reach the server. Check your connection and try again." : "That email and password don't match. Try again.");
  }
  return { id: data.user.id, email: data.user.email ?? email };
}

export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
}

// ───────────────────────────── reading ─────────────────────────────

async function rows<T>(table: "task_lists" | "tasks" | "calendars" | "events"): Promise<T[]> {
  const { data, error } = await supabase().from(table).select("data");
  if (error) {
    if (/jwt|auth/i.test(error.message)) throw new SignedOutError();
    throw new Error(error.message);
  }
  return (data ?? []).map((r) => r.data as T);
}

/** Asks the Daybook website for something, proving who we are with the Supabase login. */
async function site<T>(path: string): Promise<{ ok: true; body: T } | { ok: false; status: number; error?: string }> {
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new SignedOutError();
  const res = await fetch(`${__SITE_URL__}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, error: body.error };
  }
  return { ok: true, body: (await res.json()) as T };
}

/** Reads the person's tasks, and today's events from Google when it is connected on the website, otherwise from Daybook. */
export async function loadAll(): Promise<DayData> {
  const [lists, tasks] = await Promise.all([rows<TaskList>("task_lists"), rows<Task>("tasks")]);

  let google: Snapshot | null = null;
  let needsReconnect = false;
  let eventsUnavailable = false;
  try {
    const status = await site<{ connected: boolean }>("/api/google/status");
    if (status.ok && status.body.connected) {
      const snap = await site<Snapshot>("/api/google/snapshot");
      if (snap.ok) google = snap.body;
      else if (snap.status === 401 && snap.error === "AUTH_EXPIRED") needsReconnect = true;
      else eventsUnavailable = true;
    } else if (!status.ok) {
      eventsUnavailable = status.status !== 404;
    }
  } catch (e) {
    if (e instanceof SignedOutError) throw e;
    eventsUnavailable = true; // offline, or the site is not reachable from here
  }

  if (google) return { lists, tasks, calendars: google.calendars, events: google.events, source: "google", needsReconnect: false, eventsUnavailable: false };
  const [calendars, events] = await Promise.all([rows<CalendarInfo>("calendars"), rows<CalendarEvent>("events")]);
  return { lists, tasks, calendars, events, source: "daybook", needsReconnect, eventsUnavailable };
}

// ───────────────────────────── writing ─────────────────────────────

async function userId(): Promise<string> {
  const account = await currentAccount();
  if (!account) throw new SignedOutError();
  return account.id;
}

async function put(table: "task_lists" | "tasks" | "events", obj: { id: string }): Promise<void> {
  const user_id = await userId();
  const { error } = await supabase().from(table).upsert({ user_id, id: obj.id, data: obj }, { onConflict: "user_id,id" });
  if (error) throw new Error(error.message);
}

/** Ticks a task off, or reopens it. Reads the newest copy first so a change made on the website a moment ago is not lost. */
export async function setDone(id: string, done: boolean): Promise<Task> {
  const { data, error } = await supabase().from("tasks").select("data").eq("id", id).single();
  if (error || !data) throw new Error("That task no longer exists.");
  const task = data.data as Task;
  task.status = done ? "completed" : "needsAction";
  task.completedAt = done ? Date.now() : null;
  task.updated = Date.now();
  await put("tasks", task);
  return task;
}

/** Adds a task for today, in the first task list (the list is created for a brand-new account). */
export async function addTask(title: string, due: DateKey, lists: TaskList[], tasks: Task[]): Promise<{ task: Task; list: TaskList | null }> {
  let list = lists[0] ?? null;
  let created: TaskList | null = null;
  if (!list) {
    await put("task_lists", STARTER_LIST);
    list = created = STARTER_LIST;
  }
  const now = Date.now();
  const maxPos = Math.max(0, ...tasks.filter((t) => t.listId === list.id).map((t) => t.position));
  const task: Task = {
    id: `t_${rid()}`,
    listId: list.id,
    parentId: null,
    title,
    notes: "",
    status: "needsAction",
    due,
    completedAt: null,
    created: now,
    updated: now,
    position: maxPos + 1,
    meta: {},
  };
  await put("tasks", task);
  return { task, list: created };
}

/** What the task sheet can change. Date, time and repeat are changed on the website, where the linked calendar event is kept in step. */
export interface TaskEdit {
  title?: string;
  notes?: string;
  priority?: Priority | null;
}

async function readTask(id: string): Promise<Task> {
  const { data, error } = await supabase().from("tasks").select("data").eq("id", id).single();
  if (error || !data) throw new Error("That task no longer exists.");
  return data.data as Task;
}

export async function updateTask(id: string, patch: TaskEdit): Promise<Task> {
  const task = await readTask(id);
  if (patch.title !== undefined) task.title = patch.title;
  if (patch.notes !== undefined) task.notes = patch.notes;
  if (patch.priority !== undefined) {
    if (patch.priority === null) delete task.meta.priority;
    else task.meta.priority = patch.priority;
  }
  task.updated = Date.now();
  await put("tasks", task);
  // A task with a time shares its title with its calendar event.
  if (patch.title !== undefined && task.meta.eventId) {
    const { data } = await supabase().from("events").select("data").eq("id", task.meta.eventId).maybeSingle();
    if (data) {
      const linked: CalendarEvent = { ...(data.data as CalendarEvent), title: patch.title, updated: Date.now() };
      await put("events", linked);
    }
  }
  return task;
}

/** Deletes a task, its subtasks, and the calendar event it is linked to (as the website does). */
export async function deleteTask(task: Task, subtasks: Task[]): Promise<void> {
  const ids = [task.id, ...subtasks.map((s) => s.id)];
  const { error } = await supabase().from("tasks").delete().in("id", ids);
  if (error) throw new Error(error.message);
  if (task.meta.eventId) await supabase().from("events").delete().eq("id", task.meta.eventId);
}

/** Adds a subtask under a task. It has no date of its own; it shows with its parent. */
export async function addSubtask(parent: Task, title: string, tasks: Task[]): Promise<Task> {
  const now = Date.now();
  const maxPos = Math.max(0, ...tasks.filter((t) => t.listId === parent.listId).map((t) => t.position));
  const sub: Task = { id: `t_${rid()}`, listId: parent.listId, parentId: parent.id, title, notes: "", status: "needsAction", due: null, completedAt: null, created: now, updated: now, position: maxPos + 1, meta: parent.meta.calendarId ? { calendarId: parent.meta.calendarId } : {} };
  await put("tasks", sub);
  return sub;
}

/** What the event form fills in. */
export type NewEvent = Omit<CalendarEvent, "id" | "created" | "updated" | "taskId">;

/**
 * Creates an event in Daybook's own calendar, with the task that goes with it (every Daybook event has one,
 * linked both ways, as on the website).
 */
export async function addEvent(input: NewEvent, lists: TaskList[], tasks: Task[]): Promise<{ event: CalendarEvent; task: Task; list: TaskList | null }> {
  let list = lists[0] ?? null;
  let created: TaskList | null = null;
  if (!list) {
    await put("task_lists", STARTER_LIST);
    list = created = STARTER_LIST;
  }
  const now = Date.now();
  const eventId = `e_${rid()}`;
  const taskId = `t_${rid()}`;
  const timed = !input.allDay;
  const due = input.startDate ?? zoned(input.start, input.tz).key;
  const event: CalendarEvent = { ...input, id: eventId, taskId, created: now, updated: now };
  const maxPos = Math.max(0, ...tasks.filter((t) => t.listId === list.id).map((t) => t.position));
  const task: Task = {
    id: taskId,
    listId: list.id,
    parentId: null,
    title: input.title,
    notes: "",
    status: "needsAction",
    due,
    completedAt: null,
    created: now,
    updated: now,
    position: maxPos + 1,
    meta: { calendarId: input.calendarId, eventId, ...(timed ? { startMin: zoned(input.start, input.tz).minutes, endMin: zoned(input.end, input.tz).minutes } : {}) },
  };
  await put("events", event);
  await put("tasks", task);
  return { event, task, list: created };
}
