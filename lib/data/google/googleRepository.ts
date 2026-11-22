import type { CalendarEvent, NewTaskInput, Snapshot, Task, TaskPatch } from "@/lib/types";
import type { GoogleFeatures } from "@/lib/google/features";
import type { NewEventInput, Repository } from "../repository";

/** Google rejected the saved permission. The person has to connect again. */
export class GoogleExpiredError extends Error {
  constructor() {
    super("Google needs to be connected again");
    this.name = "GoogleExpiredError";
  }
}

const READ_ONLY = "Google is connected read-only for now. Editing arrives in the next update.";
const refuse = (): never => {
  throw new Error(READ_ONLY);
};

/**
 * Repository backed by the user's Google Calendar and Google Tasks, through this app's own server
 * (/api/google/*). The browser never sees a Google token.
 * Phase 1: reading only. Every write is refused with a plain message, and the store rolls it back.
 */
export class GoogleRepository implements Repository {
  readonly kind = "google" as const;
  /** Which parts of Google the server reads (from the last answer). Phase 1: events only. */
  features: GoogleFeatures = { calendarList: false, tasks: false };

  private async read(): Promise<Snapshot> {
    const res = await fetch("/api/google/snapshot", { cache: "no-store" });
    if (res.status === 401) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (body.error === "AUTH_EXPIRED") throw new GoogleExpiredError();
      throw new Error("You are signed out. Log in again.");
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Google answered ${res.status}`);
    }
    const body = (await res.json()) as Snapshot & { features?: GoogleFeatures };
    if (body.features) this.features = body.features;
    return body;
  }

  load() {
    return this.read();
  }
  sync() {
    return this.read();
  }

  async createTask(input: NewTaskInput): Promise<Task> {
    void input;
    return refuse();
  }
  async updateTask(id: string, patch: TaskPatch): Promise<Task> {
    void id;
    void patch;
    return refuse();
  }
  async deleteTask(id: string): Promise<void> {
    void id;
    return refuse();
  }
  async restoreTask(task: Task): Promise<Task> {
    void task;
    return refuse();
  }
  async createEvent(input: NewEventInput): Promise<CalendarEvent> {
    void input;
    return refuse();
  }
  async updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    void id;
    void patch;
    return refuse();
  }
  async deleteEvent(id: string): Promise<void> {
    void id;
    return refuse();
  }
}
