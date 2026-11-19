/**
 * MOCK DATA — sample content only.
 *
 * This file is the only place that invents data. The UI never imports it;
 * it is reached solely through lib/data/mock/mockRepository.ts. When the
 * Google repository exists, this whole folder can be deleted.
 *
 * Everything is generated relative to "today" so the app always looks alive.
 */
import type { CalendarEvent, CalendarInfo, DateKey, Snapshot, Task, TaskList, Priority } from "@/lib/types";
import { addDays, dowOf, todayKey, zonedToMs } from "@/lib/dates";

export const SEED_LISTS: TaskList[] = [
  { id: "l_my", title: "My Tasks", color: "taupe" },
  { id: "l_work", title: "Work", color: "terracotta" },
  { id: "l_learn", title: "Learning", color: "plum" },
  { id: "l_home", title: "Home", color: "olive" },
  { id: "l_errands", title: "Errands", color: "ochre" },
];

export const SEED_CALENDARS: CalendarInfo[] = [
  { id: "c_me", name: "Anjali", color: "#3F51B5", readOnly: false, primary: true },
  { id: "c_work", name: "Design Studio", color: "#0B8043", readOnly: false },
  { id: "c_learn", name: "Learning", color: "#8E24AA", readOnly: false },
  { id: "c_family", name: "Family", color: "#f4511E", readOnly: false },
];

export function buildSeed(tz: string, now = Date.now()): Snapshot {
  const T = todayKey(tz, now);
  const day = (n: number): DateKey => addDays(T, n);
  const at = (off: number, h: number, m = 0) => zonedToMs(day(off), h * 60 + m, tz);
  let n = 0;
  const id = (p: string) => `${p}_${(++n).toString(36)}`;

  /** a past anchor date falling on the given weekday, ≥ ~10 weeks back */
  const anchorOn = (dow: number, back = 70): number => {
    let o = -back;
    while (dowOf(day(o)) !== dow) o--;
    return o;
  };

  const base = { tz, created: now - 86_400_000 * 30, updated: now - 86_400_000 * 2 };

  const timed = (
    calendarId: string,
    title: string,
    startMs: number,
    minutes: number,
    extra: Partial<CalendarEvent> = {}
  ): CalendarEvent => ({
    ...base,
    id: id("e"),
    calendarId,
    title,
    allDay: false,
    start: startMs,
    end: startMs + minutes * 60_000,
    ...extra,
  });

  const allDay = (calendarId: string, title: string, start: DateKey, end: DateKey, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
    ...base,
    id: id("e"),
    calendarId,
    title,
    allDay: true,
    start: 0,
    end: 0,
    startDate: start,
    endDate: end,
    ...extra,
  });

  const events: CalendarEvent[] = [
    // — Work, recurring
    timed("c_work", "Design stand-up", at(anchorOn(1), 10), 15, {
      recurrence: { freq: "weekly", interval: 1, byDay: [1, 2, 3, 4, 5] },
      meetLink: "https://meet.example.com/studio-standup",
      guests: ["team@designstudio.example"],
    }),
    timed("c_work", "Design critique", at(anchorOn(2), 11), 60, {
      recurrence: { freq: "weekly", interval: 1, byDay: [2] },
      location: "Studio, 3rd floor",
      description: "Bring one work-in-progress screen. We review in pairs, then share back.",
    }),
    timed("c_work", "Design system office hours", at(anchorOn(3), 15), 60, {
      recurrence: { freq: "weekly", interval: 1, byDay: [3] },
    }),
    timed("c_work", "1:1 with Meera", at(anchorOn(4), 16), 30, {
      recurrence: { freq: "weekly", interval: 1, byDay: [4] },
      description: "Career growth, design-engineering path, feedback.",
    }),
    timed("c_work", "Sprint planning", at(anchorOn(1, 70), 14), 60, {
      recurrence: { freq: "weekly", interval: 2, byDay: [1] },
      location: "Meeting room Aster",
    }),
    // — Work, one-offs
    timed("c_work", "Workshop: onboarding redesign", at(2, 10), 180, {
      location: "Client office, Whitefield",
      description: "Walk through the three flow options. Bring printed screens and sticky notes.",
      guests: ["priya@client.example", "dev@client.example"],
    }),
    timed("c_work", "Usability test: checkout", at(3, 14, 30), 90, {
      meetLink: "https://meet.example.com/usability-checkout",
      description: "Five sessions back to back. Notes go in the shared research doc.",
    }),
    timed("c_work", "Roadmap review", at(9, 11), 90),
    timed("c_work", "Portfolio review with Arjun", at(-2, 16), 45),
    timed("c_work", "Client call: scope check", at(0, 12, 30), 30, { meetLink: "https://meet.example.com/scope-check" }),
    timed("c_work", "Pairing: build the date picker", at(1, 15, 30), 90, {
      description: "Design-engineering session. Focus on keyboard support and focus states.",
    }),

    // — Learning
    timed("c_learn", "React patterns study block", at(anchorOn(6), 9, 30), 120, {
      recurrence: { freq: "weekly", interval: 1, byDay: [6] },
      description: "Compound components, controlled vs uncontrolled, state colocation.",
    }),
    timed("c_learn", "TypeScript book club", at(anchorOn(5, 70), 18, 30), 60, {
      recurrence: { freq: "weekly", interval: 2, byDay: [5] },
      meetLink: "https://meet.example.com/ts-club",
    }),
    timed("c_learn", "Next.js workshop (online)", at(6, 18), 120, { meetLink: "https://meet.example.com/nextjs-workshop" }),

    // — Personal
    timed("c_me", "Morning run", at(anchorOn(1), 6, 30), 45, { recurrence: { freq: "weekly", interval: 1, byDay: [1, 3, 5] } }),
    timed("c_me", "Yoga", at(anchorOn(0), 8), 60, { recurrence: { freq: "weekly", interval: 1, byDay: [0] } }),
    timed("c_me", "Dinner with Riya", at(1, 20), 120, { location: "Toit, Indiranagar" }),
    timed("c_me", "Dentist", at(4, 17), 45, { location: "Smile Dental, Indiranagar" }),
    timed("c_me", "Haircut", at(-1, 18), 45),
    timed("c_me", "Pottery class", at(5, 11), 120, { location: "Clay Studio, Jayanagar" }),
    allDay("c_me", "Car service", day(7), day(7)),
    allDay("c_me", "Goa trip", day(15), day(18), { description: "Flights booked. Hotel check-in after 2 pm." }),

    // — Family
    timed("c_family", "Family call", at(anchorOn(0), 19), 30, { recurrence: { freq: "weekly", interval: 1, byDay: [0] } }),
    timed("c_family", "Mom's birthday dinner", at(12, 19, 30), 150, { location: "Home" }),

  ];

  // ───────────────────────────── tasks ─────────────────────────────
  let pos = 0;
  const task = (
    listId: string,
    title: string,
    due: number | null,
    priority?: Priority,
    notes = ""
  ): Task => ({
    id: id("t"),
    listId,
    title,
    notes,
    status: "needsAction",
    due: due === null ? null : day(due),
    completedAt: null,
    created: now - 86_400_000 * (3 + (n % 9)),
    updated: now - 3_600_000 * (n % 40),
    position: ++pos,
    meta: priority ? { priority } : {},
  });
  const done = (listId: string, title: string, daysAgo: number, due: number | null = null): Task => ({
    ...task(listId, title, due),
    status: "completed",
    completedAt: now - 86_400_000 * daysAgo - 3_600_000 * 2,
  });

  const tasks: Task[] = [
    // Work
    task("l_work", "Finalise onboarding flow handoff", -2, "high", "Annotate edge cases for empty and error states. Share the Figma link with Dev and QA, and note what changed since the last review."),
    task("l_work", "Write usability test script for checkout", 0, "high", "Five tasks max. Include a warm-up question and a 'think aloud' reminder. Pilot with Meera first."),
    task("l_work", "Reply to Priya's feedback on the pricing page", 0, "medium", "She flagged the comparison table on mobile. Suggest a stacked layout and send a quick prototype."),
    task("l_work", "Update design system: button tokens", 1, "medium", "Move to semantic tokens (action-primary, action-danger). Check dark-mode contrast before publishing."),
    task("l_work", "Review dev build of the settings screen", 2, "low", "Compare spacing against the spec. Log anything over 2 px."),
    task("l_work", "Book five user interviews", 4, "high", "Screener is ready. Aim for two power users, three new users."),
    task("l_work", "Prepare Q1 roadmap deck", 6, "medium"),
    task("l_work", "Retro notes: sprint 23", -5, "low", "Pull highlights from the board and share in the channel."),
    task("l_work", "Accessibility audit of the calendar prototype", 20, "medium", "Keyboard paths, focus order, contrast on tinted event blocks, screen reader labels."),
    task("l_work", "Case study: fintech dashboard, draft the intro", 10, "low"),

    // Learning
    task("l_learn", "Finish Next.js App Router course, module 4", 1, "medium"),
    task("l_learn", "Read 'Refactoring UI', chapters 5 and 6", 0, "low"),
    task("l_learn", "Practise TypeScript generics (exercises 1–10)", -1, "medium"),
    task("l_learn", "Build a small app with TanStack Query", 3, "medium", "Optimistic update on a todo toggle. Handle the rollback path properly."),
    task("l_learn", "Learn Tailwind v4 theming", 8, undefined, "CSS variables with @theme. Try a dark mode and an accent switcher."),
    task("l_learn", "Set up a Claude Code workflow for the side project", 10),
    task("l_learn", "Publish my first design-engineering blog post", 45, "high", "Topic: what changed when I started shipping my own UI. Aim for 800 words."),

    // Home
    task("l_home", "Pay electricity bill", 0, "high", "Use the BESCOM portal. Keep the receipt in the Home folder."),
    task("l_home", "Call the plumber about the kitchen tap", -3, "medium"),
    task("l_home", "Repot the monstera", 3, "low"),
    task("l_home", "Renew home internet plan", 9, "medium", "Compare the two-year offer with the current plan."),
    task("l_home", "Order a new desk lamp", 10),
    task("l_home", "Declutter the bookshelf", 30, "low"),

    // Errands
    task("l_errands", "Pick up prescription", 1, "medium"),
    task("l_errands", "Collect parcel from the locker", 0),
    task("l_errands", "Buy a gift for Mom's birthday", 10, "high", "She mentioned the handwoven shawl from the Cauvery Emporium."),
    task("l_errands", "Book passport renewal appointment", 60, "medium"),
    task("l_errands", "Car insurance renewal", 75, "high", "Compare three quotes. Current policy ends in about 10 weeks."),

    // My Tasks
    task("l_my", "Plan the Goa itinerary", 12, "medium", "Two beach days, one market day, one spice-farm visit."),
    task("l_my", "Set up a monthly budget sheet", 10),
    task("l_my", "Weekly review", 2, "low", "Look back, pick three priorities for next week."),

    // Completed
    done("l_work", "Send invoice to Studio North", 1, -1),
    done("l_work", "Submit expense report", 3, -4),
    done("l_home", "Buy groceries", 2, -2),
    done("l_learn", "Watch: CSS container queries talk", 4),
    done("l_my", "Book dentist appointment", 5),
    done("l_work", "Back up the laptop", 8),
  ];

  return { lists: SEED_LISTS, tasks, calendars: SEED_CALENDARS, events, syncedAt: now };
}
