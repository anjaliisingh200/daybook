import type { CalendarEvent, NewTaskInput, Snapshot, Task, TaskPatch } from "@/lib/types";
import type { NewEventInput, Repository } from "../repository";
import { buildSeed } from "./seed";
import { systemTimeZone } from "@/lib/dates";

const KEY = "daybook.mock.v4";
const delay = (ms = 90 + Math.random() * 110) => new Promise((r) => setTimeout(r, ms));
const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Mock repository: sample data persisted in localStorage so edits survive a
 * refresh. Behaves like a slow-ish network (short random latency) so the
 * optimistic-update paths in the UI are genuinely exercised.
 */
export class MockRepository implements Repository {
  readonly kind = "mock" as const;
  private state: Snapshot | null = null;

  private read(): Snapshot {
    if (this.state) return this.state;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        this.state = JSON.parse(raw) as Snapshot;
        return this.state;
      }
    } catch {
      /* fall through to seed */
    }
    this.state = buildSeed(systemTimeZone());
    this.write();
    return this.state;
  }

  private write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }

  async load(): Promise<Snapshot> {
    await delay(350);
    return structuredClone(this.read());
  }

  async sync(): Promise<Snapshot> {
    await delay(500);
    const s = this.read();
    s.syncedAt = Date.now();
    this.write();
    return structuredClone(s);
  }

  async reset(): Promise<Snapshot> {
    await delay(250);
    this.state = buildSeed(systemTimeZone());
    this.write();
    return structuredClone(this.state);
  }

  // ───────── tasks ─────────
  async createTask(input: NewTaskInput): Promise<Task> {
    await delay();
    const s = this.read();
    const now = Date.now();
    const maxPos = Math.max(0, ...s.tasks.filter((t) => t.listId === input.listId).map((t) => t.position));
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
    s.tasks.push(task);
    this.write();
    return structuredClone(task);
  }

  async updateTask(id: string, patch: TaskPatch): Promise<Task> {
    await delay();
    const s = this.read();
    const t = s.tasks.find((x) => x.id === id);
    if (!t) throw new Error("Task not found");
    const { priority, calendarId, startMin, endMin, eventId, repeat, order, seriesId, ...rest } = patch;
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
    this.write();
    return structuredClone(t);
  }

  async deleteTask(id: string): Promise<void> {
    await delay();
    const s = this.read();
    s.tasks = s.tasks.filter((t) => t.id !== id);
    this.write();
  }

  async restoreTask(task: Task): Promise<Task> {
    await delay();
    const s = this.read();
    if (!s.tasks.some((t) => t.id === task.id)) s.tasks.push(task);
    this.write();
    return structuredClone(task);
  }

  // ───────── events ─────────
  async createEvent(input: NewEventInput): Promise<CalendarEvent> {
    await delay();
    const s = this.read();
    const now = Date.now();
    const ev: CalendarEvent = { ...input, id: `e_${rid()}`, created: now, updated: now };
    s.events.push(ev);
    this.write();
    return structuredClone(ev);
  }

  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    await delay();
    const s = this.read();
    const e = s.events.find((x) => x.id === id);
    if (!e) throw new Error("Event not found");
    Object.assign(e, patch, { updated: Date.now() });
    // `undefined` in a patch means "clear this field"
    for (const k of Object.keys(patch) as (keyof CalendarEvent)[]) {
      if (patch[k] === undefined) delete (e as unknown as Record<string, unknown>)[k];
    }
    this.write();
    return structuredClone(e);
  }

  async deleteEvent(id: string): Promise<void> {
    await delay();
    const s = this.read();
    s.events = s.events.filter((e) => e.id !== id);
    this.write();
  }
}
