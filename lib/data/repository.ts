import type { CalendarEvent, NewTaskInput, Snapshot, Task, TaskPatch } from "@/lib/types";

/**
 * The seam between the UI and the data source.
 *
 * The UI talks ONLY to the stores in lib/store, and the stores talk ONLY to a
 * Repository. Today the implementation is the mock one (localStorage). In the
 * integration phase a GoogleRepository implements this same interface against
 * /api/tasks/* and /api/calendar/* — no UI code changes.
 */
export type NewEventInput = Omit<CalendarEvent, "id" | "created" | "updated">;

export interface Repository {
  readonly kind: "mock" | "supabase" | "google";

  /** First load. */
  load(): Promise<Snapshot>;
  /** Pull remote changes (Google: delta poll + reconcile). */
  sync(): Promise<Snapshot>;

  createTask(input: NewTaskInput): Promise<Task>;
  updateTask(id: string, patch: TaskPatch): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  /** Undo for delete. Google: re-insert; the id may change. */
  restoreTask(task: Task): Promise<Task>;

  createEvent(input: NewEventInput): Promise<CalendarEvent>;
  updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;

  /** Mock-only: regenerate sample data. */
  reset?(): Promise<Snapshot>;
}
