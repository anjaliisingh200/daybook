import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useGoogle } from "@/lib/store/google";
import type { CalendarEvent, NewTaskInput, Snapshot, Task, TaskPatch } from "@/lib/types";
import { GoogleExpiredError, GoogleRepository } from "./google/googleRepository";
import { MockRepository } from "./mock/mockRepository";
import type { NewEventInput, Repository } from "./repository";
import { SupabaseRepository } from "./supabase/supabaseRepository";

/**
 * The one repository the app talks to. It picks where data comes from:
 *   Google, when this user has connected a Google account;
 *   otherwise Daybook's own storage (Supabase when signed in, local sample data without it).
 * If Google stops accepting the saved permission, it falls back to Daybook's own data and
 * flags that Google needs to be connected again.
 */
export class SwitchingRepository implements Repository {
  private base: Repository = isSupabaseConfigured ? new SupabaseRepository() : new MockRepository();
  private google = new GoogleRepository();
  private active: Repository = this.base;

  reset?: () => Promise<Snapshot>;

  constructor() {
    if (this.base.reset) this.reset = () => this.base.reset!();
  }

  get kind(): Repository["kind"] {
    return this.active.kind;
  }

  /** Asks the server whether this user is connected to Google, and switches to match. */
  private async choose(): Promise<void> {
    this.active = this.base;
    if (!isSupabaseConfigured) return;
    try {
      const res = await fetch("/api/google/status", { cache: "no-store" });
      if (!res.ok) return;
      const s = (await res.json()) as { configured: boolean; connected: boolean; email: string | null };
      useGoogle.getState().set({ configured: s.configured, connected: s.connected, email: s.email, known: true });
      if (s.connected) this.active = this.google;
    } catch {
      // offline or no server: stay on Daybook's own data
    }
  }

  private async fromActive(read: (r: Repository) => Promise<Snapshot>): Promise<Snapshot> {
    try {
      const snap = await read(this.active);
      if (this.active === this.google) useGoogle.getState().set({ needsReconnect: false });
      return snap;
    } catch (e) {
      if (e instanceof GoogleExpiredError) {
        useGoogle.getState().set({ needsReconnect: true });
        this.active = this.base;
        return read(this.base);
      }
      throw e;
    }
  }

  async load() {
    await this.choose();
    return this.fromActive((r) => r.load());
  }
  sync() {
    return this.fromActive((r) => r.sync());
  }

  createTask(input: NewTaskInput): Promise<Task> {
    return this.active.createTask(input);
  }
  updateTask(id: string, patch: TaskPatch): Promise<Task> {
    return this.active.updateTask(id, patch);
  }
  deleteTask(id: string): Promise<void> {
    return this.active.deleteTask(id);
  }
  restoreTask(task: Task): Promise<Task> {
    return this.active.restoreTask(task);
  }
  createEvent(input: NewEventInput): Promise<CalendarEvent> {
    return this.active.createEvent(input);
  }
  updateEvent(id: string, patch: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.active.updateEvent(id, patch);
  }
  deleteEvent(id: string): Promise<void> {
    return this.active.deleteEvent(id);
  }
}
