import type { CalendarEvent, CalendarInfo, NewTaskInput, Snapshot, Task, TaskList, TaskPatch } from "@/lib/types";
import type { NewEventInput, Repository } from "../repository";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Table = "task_lists" | "tasks" | "calendars" | "events";

const rid = () => Math.random().toString(36).slice(2, 10);

/** What a new account starts with: one task list and one calendar. Nothing else. */
const STARTER_LIST: TaskList = { id: "l_my", title: "My Tasks", color: "taupe" };
const STARTER_CALENDAR: CalendarInfo = { id: "c_me", name: "My calendar", color: "#3F51B5", readOnly: false, primary: true };

/**
 * Repository backed by Supabase. Every row keeps one app object as JSON; row-level
 * security limits each user to their own rows (see supabase/schema.sql).
 */
export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  private sb = supabaseBrowser();

  private async rows<T>(table: Table): Promise<T[]> {
    const { data, error } = await this.sb.from(table).select("data");
    if (error) throw error;
    return (data ?? []).map((r) => r.data as T);
  }

  /** The signed-in user's id, read from the local session (no network call). */
  private async uid(): Promise<string> {
    const { data } = await this.sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new Error("You are signed out. Log in again.");
    return id;
  }

  private async put(table: Table, obj: { id: string }): Promise<void> {
    const user_id = await this.uid();
    const { error } = await this.sb.from(table).upsert({ user_id, id: obj.id, data: obj }, { onConflict: "user_id,id" });
    if (error) throw error;
  }

  private async get<T>(table: Table, id: string): Promise<T> {
    const { data, error } = await this.sb.from(table).select("data").eq("id", id).single();
    if (error || !data) throw new Error("Not found");
    return data.data as T;
  }

  private async drop(table: Table, id: string): Promise<void> {
    const { error } = await this.sb.from(table).delete().eq("id", id);
    if (error) throw error;
  }

  /** Reads everything. A brand-new account gets the starter list and calendar. */
  private async snapshot(): Promise<Snapshot> {
    let [lists, calendars] = await Promise.all([this.rows<TaskList>("task_lists"), this.rows<CalendarInfo>("calendars")]);
    if (lists.length === 0) {
      await this.put("task_lists", STARTER_LIST);
      lists = [STARTER_LIST];
    }
    if (calendars.length === 0) {
      await this.put("calendars", STARTER_CALENDAR);
      calendars = [STARTER_CALENDAR];
    }
    const [tasks, events] = await Promise.all([this.rows<Task>("tasks"), this.rows<CalendarEvent>("events")]);
    return { lists, tasks, calendars, events, syncedAt: Date.now() };
  }

  async load(): Promise<Snapshot> {
    return this.snapshot();
  }

  async sync(): Promise<Snapshot> {
    return this.snapshot();
  }

  // ───────── tasks ─────────
  async createTask(input: NewTaskInput): Promise<Task> {
    const now = Date.now();
    const siblings = await this.rows<Task>("tasks");
    const maxPos = Math.max(0, ...siblings.filter((t) => t.listId === input.listId).map((t) => t.position));
    const task: Task = {
      id: `t_${rid()}`,
      listId: input.listId,
      parentId: input.parentId ?? null,
      title: input.title,
      notes: input.notes ?? "",
      status: "needsAction",
      due: input.due ?? null,
      completedAt: null,
      created: now,
      updated: now,
      position: maxPos + 1,
      meta: { ...(input.priority ? { priority: input.priority } : {}), ...(input.calendarId ? { calendarId: input.calendarId } : {}) },
    };
    await this.put("tasks", task);
    return task;
  }

  async updateTask(id: string, patch: TaskPatch): Promise<Task> {
    const t = await this.get<Task>("tasks", id);
    const { priority, calendarId, startMin, endMin, eventId, repeat, order, seriesId, skip, ...rest } = patch;
    if (repeat !== undefined) {
      if (repeat === "none") delete t.meta.repeat;
      else t.meta.repeat = repeat;
    }
    if (order !== undefined) {
      if (order === null) delete t.meta.order;
      else t.meta.order = order;
    }
    if (seriesId !== undefined) {
      if (seriesId === null) delete t.meta.seriesId;
      else t.meta.seriesId = seriesId;
    }
    if (skip !== undefined) {
      if (skip === null || skip.length === 0) delete t.meta.skip;
      else t.meta.skip = skip;
    }
    Object.assign(t, rest);
    for (const [key, value] of [["startMin", startMin], ["endMin", endMin], ["eventId", eventId]] as const) {
      if (value === undefined) continue;
      if (value === null) delete t.meta[key];
      else (t.meta as Record<string, unknown>)[key] = value;
    }
    if (priority !== undefined) {
      if (priority === null) delete t.meta.priority;
      else t.meta.priority = priority;
    }
    if (calendarId !== undefined) {
      if (calendarId === null) delete t.meta.calendarId;
      else t.meta.calendarId = calendarId;
    }
    if (patch.status === "completed") t.completedAt = Date.now();
    if (patch.status === "needsAction") t.completedAt = null;
    t.updated = Date.now();
    await this.put("tasks", t);
    return t;
  }

  async deleteTask(id: string): Promise<void> {
    await this.drop("tasks", id);
  }

  async restoreTask(task: Task): Promise<Task> {
    await this.put("tasks", task);
    return task;
  }

  // ───────── events ─────────
  async createEvent(input: NewEventInput): Promise<CalendarEvent> {
    const now = Date.now();
    const ev: CalendarEvent = { ...input, id: `e_${rid()}`, created: now, updated: now };
    await this.put("events", ev);
    return ev;
  }

  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const e = await this.get<CalendarEvent>("events", id);
    Object.assign(e, patch, { updated: Date.now() });
    // `undefined` in a patch means "clear this field"
    for (const k of Object.keys(patch) as (keyof CalendarEvent)[]) {
      if (patch[k] === undefined) delete (e as unknown as Record<string, unknown>)[k];
    }
    await this.put("events", e);
    return e;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.drop("events", id);
  }
}
