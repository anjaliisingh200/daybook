import type { Snapshot, Task } from "../types";
import { gget } from "./api";
import { mapCalendar, mapEvent, mapTask, mapTaskList, wantCalendar, type GCalendarListEntry, type GEvent, type GTask, type GTaskList } from "./map";

/** How far around today events are loaded. Anything outside is not on screen until the window moves (a later phase). */
export const PAST_DAYS = 90;
export const FUTURE_DAYS = 365;

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

/** Everything the app shows, read from the user's Google account. */
export async function googleSnapshot(token: string, now = Date.now()): Promise<Snapshot> {
  const timeMin = new Date(now - PAST_DAYS * 864e5).toISOString();
  const timeMax = new Date(now + FUTURE_DAYS * 864e5).toISOString();

  const [calList, taskLists] = await Promise.all([
    all<GCalendarListEntry>(token, "/calendar/v3/users/me/calendarList", { maxResults: 250 }, 4),
    all<GTaskList>(token, "/tasks/v1/users/@me/lists", { maxResults: 100 }, 3),
  ]);
  const cals = calList.filter(wantCalendar);

  const [perCalendar, perList] = await Promise.all([
    pool(cals, 5, async (c) => {
      const items = await all<GEvent>(token, `/calendar/v3/calendars/${encodeURIComponent(c.id)}/events`, { timeMin, timeMax, singleEvents: true, maxResults: 2500 }, 3);
      return items.map((e) => mapEvent(e, c)).filter((e) => e !== null);
    }),
    pool(taskLists, 4, async (l) => {
      const items = await all<GTask>(token, `/tasks/v1/lists/${encodeURIComponent(l.id)}/tasks`, { showCompleted: true, showHidden: true, maxResults: 100 }, 10);
      return items.map((t) => mapTask(t, l.id)).filter((t): t is Task => t !== null);
    }),
  ]);

  return {
    lists: taskLists.map(mapTaskList),
    tasks: perList.flat(),
    calendars: cals.map(mapCalendar),
    events: perCalendar.flat(),
    syncedAt: now,
  };
}
