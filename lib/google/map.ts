import { PALETTE_KEYS } from "../colors";
import type { CalendarEvent, CalendarInfo, DateKey, Task, TaskList } from "../types";

/** The parts of Google's answers the app reads. Anything else Google sends is ignored. */
export interface GCalendarListEntry {
  id: string;
  summary?: string;
  summaryOverride?: string;
  backgroundColor?: string;
  accessRole?: "freeBusyReader" | "reader" | "writer" | "owner";
  primary?: boolean;
  hidden?: boolean;
  deleted?: boolean;
  timeZone?: string;
}

export interface GEvent {
  id: string;
  status?: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType?: string; uri?: string }[] };
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  recurringEventId?: string;
  attendees?: { email?: string; self?: boolean; responseStatus?: string }[];
  created?: string;
  updated?: string;
}

export interface GTaskList {
  id: string;
  title?: string;
}

export interface GTask {
  id: string;
  title?: string;
  notes?: string;
  status?: "needsAction" | "completed";
  due?: string;
  completed?: string;
  parent?: string;
  position?: string;
  updated?: string;
  deleted?: boolean;
}

/** Event ids are only unique inside one calendar, so the app's id carries the calendar too. */
export const eventId = (calendarId: string, id: string) => `${calendarId}|${id}`;
export const splitEventId = (id: string): { calendarId: string; eventId: string } => {
  const i = id.indexOf("|");
  return { calendarId: id.slice(0, i), eventId: id.slice(i + 1) };
};

const ms = (iso: string | undefined, fallback = 0) => {
  const n = iso ? Date.parse(iso) : NaN;
  return Number.isNaN(n) ? fallback : n;
};

/** "2026-11-21" plus n days, without time zones getting involved. */
function addDay(key: DateKey, n: number): DateKey {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function mapCalendar(c: GCalendarListEntry): CalendarInfo {
  return {
    id: c.id,
    name: c.summaryOverride || c.summary || c.id,
    color: c.backgroundColor ?? "#8c7b6b",
    readOnly: c.accessRole === "reader" || c.accessRole === "freeBusyReader",
    ...(c.primary ? { primary: true } : {}),
  };
}

/** Calendars the user has hidden or deleted in Google are not loaded. */
export const wantCalendar = (c: GCalendarListEntry) => !c.deleted && !c.hidden;

/** One event, or one occurrence of a repeating event (Google expands repeats for us). Cancelled or declined events are skipped. */
export function mapEvent(e: GEvent, calendar: { id: string; timeZone?: string }): CalendarEvent | null {
  if (e.status === "cancelled" || !e.start || !e.end) return null;
  if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) return null;

  const meet = e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri;
  const guests = (e.attendees ?? []).filter((a) => !a.self && a.email).map((a) => a.email!);
  const common = {
    id: eventId(calendar.id, e.id),
    calendarId: calendar.id,
    title: e.summary?.trim() || "(No title)",
    ...(e.description ? { description: e.description } : {}),
    ...(e.location ? { location: e.location } : {}),
    ...(guests.length ? { guests } : {}),
    ...(meet ? { meetLink: meet } : {}),
    ...(e.recurringEventId ? { recurringEventId: e.recurringEventId } : {}),
    created: ms(e.created),
    updated: ms(e.updated),
  };

  if (e.start.date) {
    // All-day: Google's end date is the day AFTER the last day; the app keeps the last day itself.
    const startDate = e.start.date;
    const last = e.end.date ? addDay(e.end.date, -1) : startDate;
    return { ...common, allDay: true, start: 0, end: 0, tz: calendar.timeZone ?? "UTC", startDate, endDate: last < startDate ? startDate : last };
  }
  const start = ms(e.start.dateTime, NaN);
  const end = ms(e.end.dateTime, NaN);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { ...common, allDay: false, start, end, tz: e.start.timeZone ?? calendar.timeZone ?? "UTC" };
}

/** The colour chip for a task list. Google lists have none, so the palette is dealt out in order. */
export function mapTaskList(l: GTaskList, index: number): TaskList {
  return { id: l.id, title: l.title || "Tasks", color: PALETTE_KEYS[index % PALETTE_KEYS.length] };
}

export function mapTask(t: GTask, listId: string): Task | null {
  if (t.deleted) return null;
  const updated = ms(t.updated);
  const completed = t.status === "completed";
  return {
    id: t.id,
    listId,
    parentId: t.parent ?? null,
    title: t.title?.trim() || "(No title)",
    notes: t.notes ?? "",
    status: completed ? "completed" : "needsAction",
    // Google sends midnight UTC for a date-only due. The date is the first ten characters, never converted.
    due: t.due ? t.due.slice(0, 10) : null,
    completedAt: completed ? ms(t.completed, updated) : null,
    updated,
    created: updated, // Google Tasks keeps no creation time
    position: Number(t.position ?? 0) || 0,
    meta: {},
  };
}
