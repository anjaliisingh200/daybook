"use client";
import { create } from "zustand";
import type { CalendarEvent, CalendarInfo, NewTaskInput, Snapshot, Task, TaskList, TaskPatch } from "@/lib/types";
import type { NewEventInput, Repository } from "@/lib/data/repository";
import { MockRepository } from "@/lib/data/mock/mockRepository";
import { addDays, addMonths, dowOf, systemTimeZone, todayKey, zoned, zonedToMs } from "@/lib/dates";
import { presetOf, recurrenceFromPreset, type RepeatPreset } from "@/lib/recurrence";
import { useUI } from "./ui";
import { usePrefs } from "./prefs";

/**
 * The single place that holds Google-backed data in the browser.
 *
 * Writes are OPTIMISTIC: the UI updates instantly, the repository call runs in
 * the background, and on failure we roll back and tell the user. This is the
 * same behaviour we'll need against the real Google APIs.
 *
 * A task with a time is linked to a calendar event:
 *   task to event: date, time, title and calendar are pushed to the event.
 *   event to task: moving or renaming the event updates the task.
 *   clearing the time deletes the event; the task stays.
 *   deleting the task deletes the event (the UI asks first).
 *   completing the task leaves the event alone.
 */

// Swap this one line for `new GoogleRepository()` in the integration phase.
export const repo: Repository = new MockRepository();

export type SyncState = "idle" | "syncing" | "error" | "offline";

interface DataStore {
  status: "loading" | "ready" | "error";
  syncState: SyncState;
  syncedAt: number | null;
  lists: TaskList[];
  tasks: Task[];
  calendars: CalendarInfo[];
  events: CalendarEvent[];
  repoKind: Repository["kind"];

  load: () => Promise<void>;
  sync: (opts?: { silent?: boolean }) => Promise<void>;
  resetSample: () => Promise<void>;

  addTask: (input: NewTaskInput) => Promise<Task | null>;
  updateTask: (id: string, patch: TaskPatch) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addEvent: (input: NewEventInput) => Promise<CalendarEvent | null>;
  updateEvent: (id: string, patch: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

const toast = (message: string, extra?: Parameters<ReturnType<typeof useUI.getState>["toast"]>[1]) => useUI.getState().toast(message, extra);

function apply(snap: Snapshot): Partial<DataStore> {
  return { lists: snap.lists, tasks: snap.tasks, calendars: snap.calendars, events: snap.events, syncedAt: snap.syncedAt };
}

/** Task fields that change the calendar event when they change. */
const EVENT_FIELDS: readonly string[] = ["title", "due", "startMin", "endMin", "calendarId", "repeat"];

/** The time zone times are entered in: the user's setting, or the device's. */
function appTimeZone(): string {
  const tz = usePrefs.getState().timeZone;
  return tz === "auto" ? systemTimeZone() : tz;
}

/**
 * Writes in flight. A load or sync snapshot taken while a write is pending (or that a write overlapped)
 * is stale: applying it would drop tasks and events created in that window. Such snapshots are refetched.
 */
let inflight = 0;
let writeSeq = 0;
const WRITE_METHODS = ["createTask", "updateTask", "deleteTask", "restoreTask", "createEvent", "updateEvent", "deleteEvent"] as const;
for (const name of WRITE_METHODS) {
  const original = (repo[name] as (...a: unknown[]) => Promise<unknown>).bind(repo);
  (repo as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => {
    inflight++;
    writeSeq++;
    return original(...args).finally(() => {
      inflight--;
      writeSeq++;
    });
  };
}
const settledSnapshot = async <T>(fetch: () => Promise<T>): Promise<T> => {
  for (;;) {
    const seq = writeSeq;
    const snap = await fetch();
    if (inflight === 0 && seq === writeSeq) return snap;
    await new Promise((r) => setTimeout(r, 15));
  }
};

export const useData = create<DataStore>((set, get) => {
  /** Changes a task locally and in the repository. Does not touch the calendar. */
  const applyTaskPatch = async (id: string, patch: TaskPatch) => {
    const before = get().tasks.find((t) => t.id === id);
    if (!before) return;
    const { priority, calendarId, startMin, endMin, eventId, repeat, order, seriesId, ...rest } = patch;
    const meta = { ...before.meta };
    if (repeat !== undefined) {
      if (repeat === "none") delete meta.repeat;
      else meta.repeat = repeat;
    }
    if (order !== undefined) {
      if (order === null) delete meta.order;
      else meta.order = order;
    }
    if (seriesId !== undefined) {
      if (seriesId === null) delete meta.seriesId;
      else meta.seriesId = seriesId;
    }
    if (priority !== undefined) {
      if (priority === null) delete meta.priority;
      else meta.priority = priority;
    }
    if (calendarId !== undefined) {
      if (calendarId === null) delete meta.calendarId;
      else meta.calendarId = calendarId;
    }
    if (startMin !== undefined) {
      if (startMin === null) delete meta.startMin;
      else meta.startMin = startMin;
    }
    if (endMin !== undefined) {
      if (endMin === null) delete meta.endMin;
      else meta.endMin = endMin;
    }
    if (eventId !== undefined) {
      if (eventId === null) delete meta.eventId;
      else meta.eventId = eventId;
    }
    const next: Task = {
      ...before,
      ...rest,
      meta,
      completedAt: patch.status === "completed" ? Date.now() : patch.status === "needsAction" ? null : before.completedAt,
      updated: Date.now(),
    };
    set({ tasks: get().tasks.map((t) => (t.id === id ? next : t)) });
    try {
      const real = await repo.updateTask(id, patch);
      set({ tasks: get().tasks.map((t) => (t.id === id ? real : t)) });
    } catch {
      set({ tasks: get().tasks.map((t) => (t.id === id ? before : t)) });
      toast("Couldn't save that change. It was undone.", { tone: "error" });
    }
  };

  const rawUpdateEvent = async (id: string, fields: Partial<CalendarEvent>) => {
    const real = await repo.updateEvent(id, fields);
    set({ events: get().events.map((e) => (e.id === id ? real : e)) });
  };

  const rawDeleteEvent = async (id: string) => {
    await repo.deleteEvent(id);
    set({ events: get().events.filter((e) => e.id !== id) });
  };

  /**
   * Task to event. A task with a date and time has an event; so does every task linked to an event.
   * All day (no time) on a linked task makes its event all day. Clearing the date removes the event.
   */
  const syncTaskToEvent = async (taskId: string) => {
    const t = get().tasks.find((x) => x.id === taskId);
    if (!t) return;
    // Occurrences of a repeating task share its calendar event through the series; they never make their own.
    if (t.meta.seriesId) return;
    const linked = t.meta.eventId ? get().events.find((e) => e.id === t.meta.eventId) : undefined;
    if (!t.due) {
      if (linked) {
        await rawDeleteEvent(linked.id).catch(() => {});
        await applyTaskPatch(t.id, { eventId: null, startMin: null, endMin: null });
      }
      return;
    }
    const hasTime = t.meta.startMin !== undefined;
    if (!linked && !hasTime) return;

    const tz = appTimeZone();
    const calendarId = t.meta.calendarId ?? get().calendars.find((c) => c.primary)?.id ?? get().calendars[0]?.id ?? "";
    const recurrence = recurrenceFromPreset((t.meta.repeat ?? "none") as RepeatPreset, t.due);
    const fields: NewEventInput = hasTime
      ? (() => {
          const startMin = t.meta.startMin!;
          const endMin = t.meta.endMin ?? Math.min(startMin + usePrefs.getState().defaultDuration, 1439);
          const start = zonedToMs(t.due!, startMin, tz);
          const end = Math.max(zonedToMs(t.due!, endMin, tz), start + 15 * 60_000);
          return { calendarId, title: t.title, allDay: false, start, end, tz, taskId: t.id, recurrence };
        })()
      : { calendarId, title: t.title, allDay: true, start: 0, end: 0, tz, startDate: t.due, endDate: t.due, taskId: t.id, recurrence };

    if (linked) {
      await rawUpdateEvent(linked.id, fields);
      return;
    }
    const created = await repo.createEvent(fields);
    set({ events: [...get().events, created] });
    await applyTaskPatch(t.id, { eventId: created.id });
  };

  /** Event to task: after an event moves, is renamed or changes repeat, update its task. */
  const reverseSync = async (ev: CalendarEvent) => {
    if (!ev.taskId) return;
    const preset = presetOf(ev.recurrence);
    const repeat = preset === "custom" ? "none" : preset;
    if (ev.allDay) {
      await applyTaskPatch(ev.taskId, { due: ev.startDate ?? null, startMin: null, endMin: null, title: ev.title, calendarId: ev.calendarId, repeat });
      return;
    }
    const s = zoned(ev.start, ev.tz);
    const e = zoned(ev.end, ev.tz);
    await applyTaskPatch(ev.taskId, {
      due: s.key,
      startMin: s.minutes,
      endMin: e.key === s.key ? e.minutes : 1439,
      title: ev.title,
      calendarId: ev.calendarId,
      repeat,
    });
  };

  /** Every event gets a task: created here, linked both ways. */
  const linkNewTask = async (ev: CalendarEvent) => {
    if (ev.taskId) return;
    const listId = get().lists.find((l) => l.id === usePrefs.getState().defaultListId)?.id ?? get().lists[0]?.id ?? "";
    const tz = ev.tz;
    const due = ev.startDate ?? zoned(ev.start, tz).key;
    const task = await get().addTask({ title: ev.title, listId, due, calendarId: ev.calendarId });
    if (!task) return;
    const preset = presetOf(ev.recurrence);
    const timed = !ev.allDay;
    await applyTaskPatch(task.id, {
      eventId: ev.id,
      repeat: preset === "custom" ? "none" : preset,
      startMin: timed ? zoned(ev.start, tz).minutes : null,
      endMin: timed ? zoned(ev.end, tz).minutes : null,
    });
    await rawUpdateEvent(ev.id, { taskId: task.id });
  };

  /** The next date a repeat rule lands on. */
  const stepDate = (preset: string, d: string): string => {
    switch (preset) {
      case "daily":
        return addDays(d, 1);
      case "weekly":
        return addDays(d, 7);
      case "weekdays": {
        let n = addDays(d, 1);
        while (dowOf(n) === 0 || dowOf(n) === 6) n = addDays(n, 1);
        return n;
      }
      case "monthly":
        return addMonths(d, 1);
      case "yearly":
        return addMonths(d, 12);
      default:
        return addDays(d, 36500);
    }
  };

  /** Repeating tasks: keep the next month's occurrences created. Completing one only marks that one done. */
  const HORIZON_DAYS = 30;
  const ensureOccurrences = async () => {
    const today = todayKey(appTimeZone());
    const horizon = addDays(today, HORIZON_DAYS);
    const roots = get().tasks.filter((t) => !t.parentId && !t.meta.seriesId && t.meta.repeat && t.meta.repeat !== "none" && t.due);
    for (const root of roots) {
      const preset = root.meta.repeat!;
      const have = new Set(get().tasks.filter((t) => t.id === root.id || t.meta.seriesId === root.id).map((t) => t.due));
      let cur = root.due!;
      for (let i = 0; i < 400 && cur <= horizon; i++) {
        if (cur >= today && !have.has(cur)) {
          have.add(cur);
          const made = await get().addTask({ title: root.title, listId: root.listId, due: cur, calendarId: root.meta.calendarId, priority: root.meta.priority });
          if (made) await applyTaskPatch(made.id, { repeat: preset, seriesId: root.id, startMin: root.meta.startMin ?? null, endMin: root.meta.endMin ?? null });
        }
        cur = stepDate(preset, cur);
      }
    }
  };

  /** Gives every event that has no task one. Runs after loading and syncing. */
  /**
   * Runs `fn` once at a time. Load and sync both ask for tasks; without this, two runs
   * saw the same event with no task yet and each created one, which made duplicates.
   */
  const once = (fn: () => Promise<void>) => {
    let running: Promise<void> | null = null;
    return () => {
      if (!running) running = fn().finally(() => (running = null));
      return running;
    };
  };

  const ensureOccurrencesOnce = once(ensureOccurrences);
  const ensureTasks = once(async () => {
    // Re-read the events now: anything linked by an earlier run is skipped.
    const missing = get().events.filter((e) => !e.taskId);
    for (const e of missing) {
      if (!get().events.find((x) => x.id === e.id)?.taskId) await linkNewTask(e);
    }
    await ensureOccurrencesOnce();
  });

  return {
    status: "loading",
    syncState: "idle",
    syncedAt: null,
    lists: [],
    tasks: [],
    calendars: [],
    events: [],
    repoKind: repo.kind,

    async load() {
      try {
        const snap = await settledSnapshot(() => repo.load());
        set({ ...apply(snap), status: "ready", syncState: "idle" });
        void ensureTasks();
      } catch {
        set({ status: "error" });
      }
    },

    async sync(opts) {
      if (get().syncState === "syncing") return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        set({ syncState: "offline" });
        return;
      }
      set({ syncState: "syncing" });
      try {
        const snap = await settledSnapshot(() => repo.sync());
        set({ ...apply(snap), syncState: "idle" });
        void ensureTasks();
        if (!opts?.silent) toast("Everything is up to date");
      } catch {
        set({ syncState: "error" });
        toast("Couldn't sync. We'll try again shortly.", { tone: "error" });
      }
    },

    async resetSample() {
      if (!repo.reset) return;
      set({ status: "loading" });
      const snap = await repo.reset();
      set({ ...apply(snap), status: "ready" });
      toast("Sample data restored");
    },

    // ───────────── tasks ─────────────
    async addTask(input) {
      if (!input.due) {
        toast("A task needs a date before it can be saved.", { tone: "error" });
        return null;
      }
      const now = Date.now();
      const tmpId = `tmp_${Math.random().toString(36).slice(2)}`;
      const maxPos = Math.max(0, ...get().tasks.filter((t) => t.listId === input.listId).map((t) => t.position));
      const optimistic: Task = {
        id: tmpId,
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
      set({ tasks: [...get().tasks, optimistic] });
      try {
        const real = await repo.createTask(input);
        set({ tasks: get().tasks.map((t) => (t.id === tmpId ? real : t)) });
        return real;
      } catch {
        set({ tasks: get().tasks.filter((t) => t.id !== tmpId) });
        toast("Couldn't create the task. Nothing was saved.", { tone: "error" });
        return null;
      }
    },

    async updateTask(id, patch) {
      // A task always has a date, so it can't be cleared.
      if (patch.due === null) return;
      await applyTaskPatch(id, patch);
      if (Object.keys(patch).some((k) => EVENT_FIELDS.includes(k))) await syncTaskToEvent(id);
      if (patch.repeat !== undefined) await ensureOccurrencesOnce();
    },

    async toggleTask(id) {
      const t = get().tasks.find((x) => x.id === id);
      if (!t) return;
      const completing = t.status === "needsAction";
      await get().updateTask(id, { status: completing ? "completed" : "needsAction" });
      if (completing) {
        toast("Task completed", {
          action: { label: "Undo", onClick: () => void get().updateTask(id, { status: "needsAction" }) },
        });
      }
    },

    async deleteTask(id) {
      const t = get().tasks.find((x) => x.id === id);
      if (!t) return;
      // Deleting a task deletes its calendar event too. The UI asks for confirmation first.
      if (t.meta.eventId && get().events.some((e) => e.id === t.meta.eventId)) await rawDeleteEvent(t.meta.eventId).catch(() => {});
      set({ tasks: get().tasks.filter((x) => x.id !== id) });
      try {
        await repo.deleteTask(id);
        toast("Task deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              set({ tasks: [...get().tasks, t] });
              try {
                const back = await repo.restoreTask(t);
                set({ tasks: get().tasks.map((x) => (x.id === t.id ? back : x)) });
                if (back.due && back.meta.startMin !== undefined) await syncTaskToEvent(back.id);
              } catch {
                set({ tasks: get().tasks.filter((x) => x.id !== t.id) });
                toast("Couldn't restore the task.", { tone: "error" });
              }
            },
          },
        });
      } catch {
        set({ tasks: [...get().tasks, t] });
        toast("Couldn't delete the task.", { tone: "error" });
      }
    },

    // ───────────── events ─────────────
    async addEvent(input) {
      const now = Date.now();
      const tmpId = `tmp_${Math.random().toString(36).slice(2)}`;
      set({ events: [...get().events, { ...input, id: tmpId, created: now, updated: now }] });
      try {
        const real = await repo.createEvent(input);
        set({ events: get().events.map((e) => (e.id === tmpId ? real : e)) });
        await linkNewTask(real);
        return real;
      } catch {
        set({ events: get().events.filter((e) => e.id !== tmpId) });
        toast("Couldn't create the event.", { tone: "error" });
        return null;
      }
    },

    async updateEvent(id, patch) {
      const before = get().events.find((e) => e.id === id);
      if (!before) return;
      const next = { ...before, ...patch, updated: Date.now() } as CalendarEvent;
      for (const k of Object.keys(patch) as (keyof CalendarEvent)[]) {
        if (patch[k] === undefined) delete (next as unknown as Record<string, unknown>)[k];
      }
      set({ events: get().events.map((e) => (e.id === id ? next : e)) });
      try {
        const real = await repo.updateEvent(id, patch);
        set({ events: get().events.map((e) => (e.id === id ? real : e)) });
        await reverseSync(real);
      } catch {
        set({ events: get().events.map((e) => (e.id === id ? before : e)) });
        toast("Couldn't save the event. It was undone.", { tone: "error" });
      }
    },

    async deleteEvent(id) {
      const before = get().events.find((e) => e.id === id);
      if (!before) return;
      set({ events: get().events.filter((e) => e.id !== id) });
      try {
        await repo.deleteEvent(id);
        // The task stays; only its time goes.
        const task = before.taskId ? get().tasks.find((t) => t.id === before.taskId) : undefined;
        if (task && task.meta.eventId === id) await get().deleteTask(task.id);
      } catch {
        set({ events: [...get().events, before] });
        toast("Couldn't delete the event.", { tone: "error" });
      }
    },
  };
});
