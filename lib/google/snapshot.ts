import type { CalendarEvent, CalendarInfo, Snapshot, Task } from "../types";
import { FEATURES } from "./config";
import type { GoogleFeatures } from "./features";
import { gget } from "./api";
import { mapCalendar, mapEvent, mapTask, mapTaskList, wantCalendar, type GCalendarListEntry, type GEvent, type GTask, type GTaskList } from "./map";

/** How far around today events are loaded. Anything outside is not on screen until the window moves (a later phase). */
export const PAST_DAYS = 90;
export const FUTURE_DAYS = 365;

/** Google's name for the signed-in user's main calendar. It works without asking for the calendar list. */
export const PRIMARY = "primary";

interface Page<T> {
  items?: T[];
  nextPageToken?: string;
}

/** Follows nextPageToken until Google has no more, up to `maxPages`. */
async function all<T>(token: string, path: string, params: Record<string, string | number | boolean | undefined>, maxPages: number): Promise<T[]> {
  const out: T[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const page = await gget<Page<T>>(token, path, { ...params, pageToken });
    out.push(...(page.items ?? []));
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  return out;
}

/** Runs `fn` over `items`, a few at a time, so a long calendar list does not hit Google's per-minute limit. */
async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

interface EventsPage {
  items?: GEvent[];
  nextPageToken?: string;
  /** The calendar's own title, which for the primary calendar is the user's address. */
  summary?: string;
  timeZone?: string;
  accessRole?: string;
}

/** One calendar's events in the window, across pages. Also returns what Google says about the calendar itself. */
async function eventsOf(token: string, calendarId: string, timeMin: string, timeMax: string): Promise<{ items: GEvent[]; summary?: string; timeZone?: string; accessRole?: string }> {
  const items: GEvent[] = [];
  let meta: { summary?: string; timeZone?: string; accessRole?: string } = {};
  let pageToken: string | undefined;
  for (let i = 0; i < 3; i++) {
    const page = await gget<EventsPage>(token, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, { timeMin, timeMax, singleEvents: true, maxResults: 2500, pageToken });
    if (i === 0) meta = { summary: page.summary, timeZone: page.timeZone, accessRole: page.accessRole };
    items.push(...(page.items ?? []));
    if (!page.nextPageToken) break;
    pageToken = page.nextPageToken;
  }
  return { items, ...meta };
}

/**
 * What the app shows, read from the user's Google account.
 * With the default switches (Phase 1) that is the events of the primary calendar and nothing else:
 * no calendar list, no tasks. Turning a switch on brings that part back, unchanged.
 */
export async function googleSnapshot(token: string, now = Date.now(), features: GoogleFeatures = FEATURES): Promise<Snapshot & { features: GoogleFeatures }> {
  const timeMin = new Date(now - PAST_DAYS * 864e5).toISOString();
  const timeMax = new Date(now + FUTURE_DAYS * 864e5).toISOString();

  // Tasks (later): Google's own task lists and tasks.
  const tasksPart = features.tasks
    ? (async () => {
        const taskLists = await all<GTaskList>(token, "/tasks/v1/users/@me/lists", { maxResults: 100 }, 3);
        const perList = await pool(taskLists, 4, async (l) => {
          const items = await all<GTask>(token, `/tasks/v1/lists/${encodeURIComponent(l.id)}/tasks`, { showCompleted: true, showHidden: true, maxResults: 100 }, 10);
          return items.map((t) => mapTask(t, l.id)).filter((t): t is Task => t !== null);
        });
        return { lists: taskLists.map(mapTaskList), tasks: perList.flat() };
      })()
    : Promise.resolve({ lists: [], tasks: [] });

  // Calendars: the whole list (later), or just the primary calendar, which Google knows as "primary".
  let calendars: CalendarInfo[];
  let events: CalendarEvent[];
  if (features.calendarList) {
    const cals = (await all<GCalendarListEntry>(token, "/calendar/v3/users/me/calendarList", { maxResults: 250 }, 4)).filter(wantCalendar);
    const perCalendar = await pool(cals, 5, async (c) => (await eventsOf(token, c.id, timeMin, timeMax)).items.map((e) => mapEvent(e, c)).filter((e) => e !== null));
    calendars = cals.map(mapCalendar);
    events = perCalendar.flat();
  } else {
    const got = await eventsOf(token, PRIMARY, timeMin, timeMax);
    const primary: GCalendarListEntry = { id: PRIMARY, summary: got.summary || "Google Calendar", timeZone: got.timeZone, primary: true, accessRole: got.accessRole === "reader" ? "reader" : "owner" };
    calendars = [mapCalendar(primary)];
    events = got.items.map((e) => mapEvent(e, primary)).filter((e) => e !== null);
  }

  const { lists, tasks } = await tasksPart;
  return { lists, tasks, calendars, events, syncedAt: now, features };
}
