/**
 * Domain types.
 *
 * Tasks and calendar events are deliberately SEPARATE types with no shared
 * base — they are different things in Google too. The UI may render them
 * side by side, but never treats one as the other.
 */

/** A calendar day with no time zone attached: "2026-11-18". */
export type DateKey = string;

// ───────────────────────── Tasks (Google Tasks) ─────────────────────────

export type Priority = "high" | "medium" | "low";

export interface TaskList {
  id: string;
  title: string;
  /** Muted colour used for the list chip. App-only (Google lists have no colour). */
  color: string;
}

/** Fields that exist in Google Tasks and are synchronised. */
export interface Task {
  id: string;
  /** The parent task, when this is a subtask. Subtasks share the parent's list. */
  parentId?: string | null;
  listId: string;
  title: string;
  notes: string;
  status: "needsAction" | "completed";
  /** Floating date (Google Tasks stores a date only, never a time). */
  due: DateKey | null;
  completedAt: number | null;
  updated: number;
  created: number;
  /** Sort key within the list (Google's `position`). */
  position: number;
  /** APP-ONLY metadata. Not part of Google Tasks. */
  meta: TaskMeta;
}

export interface TaskMeta {
  priority?: Priority;
  /** App-only: the calendar this task belongs to (Google Tasks has no calendars). */
  calendarId?: string;
  /** App-only: optional time on the task's date, in minutes from midnight. */
  startMin?: number;
  endMin?: number;
  /** App-only: the calendar event this task is linked to, when it has a time. */
  eventId?: string;
  /** App-only: manual position within its day (lower is higher). Unset means newest first. */
  order?: number;
  /** App-only: for a generated occurrence, the id of the repeating task it belongs to. */
  seriesId?: string;
  /** App-only: how the task repeats ("none", "daily", "weekly", "weekdays", "monthly", "yearly"). */
  repeat?: string;
}

export type NewTaskInput = {
  title: string;
  notes?: string;
  due?: DateKey | null;
  listId: string;
  priority?: Priority;
  calendarId?: string;
  parentId?: string | null;
};

export type TaskPatch = Partial<
  Pick<Task, "title" | "notes" | "due" | "listId" | "status"> & {
    priority: Priority | null;
    calendarId: string | null;
    startMin: number | null;
    endMin: number | null;
    eventId: string | null;
    repeat: string;
    order: number | null;
    seriesId: string | null;
  }
>;

// ─────────────────────── Calendar (Google Calendar) ───────────────────────

export interface CalendarInfo {
  id: string;
  name: string;
  /** Default colour key (see lib/colors.ts). */
  color: string;
  readOnly: boolean;
  primary?: boolean;
}

export type Freq = "daily" | "weekly" | "monthly" | "yearly";

export interface Recurrence {
  freq: Freq;
  interval: number;
  /** weekly: days of week, 0 = Sunday */
  byDay?: number[];
  until?: DateKey;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  /** The task this event belongs to, when the event was created from a task with a time. */
  taskId?: string;
  title: string;
  description?: string;
  location?: string;
  allDay: boolean;
  /** Timed events: epoch ms. All-day events: unused (0). */
  start: number;
  end: number;
  /** IANA zone the event was created in (drives recurrence across DST). */
  tz: string;
  /** All-day events: first day, and last day INCLUSIVE. */
  startDate?: DateKey;
  endDate?: DateKey;
  recurrence?: Recurrence;
  /** Instances removed from a recurring series ("delete this event"). */
  exdates?: DateKey[];
  /** If this event is an edited single instance of a series. */
  recurringEventId?: string;
  guests?: string[];
  meetLink?: string;
  created: number;
  updated: number;
}

/** One concrete occurrence of an event on the calendar (recurrences expanded). */
export interface EventInstance {
  key: string;
  event: CalendarEvent;
  calendarId: string;
  title: string;
  allDay: boolean;
  /** Timed: epoch ms of this occurrence. */
  start: number;
  end: number;
  /** All-day span (inclusive). Timed events: derived in display zone. */
  startDate: DateKey;
  endDate: DateKey;
  /** Date this occurrence belongs to in the series (for exdates). */
  seriesDate: DateKey;
  isRecurring: boolean;
}

export interface Snapshot {
  lists: TaskList[];
  tasks: Task[];
  calendars: CalendarInfo[];
  events: CalendarEvent[];
  syncedAt: number;
}

// ───────────────────────────── Preferences ─────────────────────────────

export type Density = "compact" | "comfortable" | "spacious";
export type FontSize = "small" | "medium" | "large";
export type CalView = "day" | "week" | "month" | "schedule";
export type TaskSort = "due" | "priority" | "title" | "updated";
export type TaskLayout = "grid" | "list";
export type OverdueStyle = "highlight" | "subtle";
export type DateFormat = "long" | "dmy" | "mdy" | "ymd";
