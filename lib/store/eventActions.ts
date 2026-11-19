"use client";
import type { CalendarEvent, DateKey, EventInstance } from "@/lib/types";
import { addDays, diffDays, zoned, zonedToMs } from "@/lib/dates";
import { presetOf, recurrenceFromPreset } from "@/lib/recurrence";
import { useData } from "./data";
import { useUI, type EventDraft } from "./ui";
import { usePrefs } from "./prefs";

export type Scope = "this" | "all";

export function newDraft(opts: {
  day: DateKey;
  startMin?: number;
  durationMin?: number;
  allDay?: boolean;
  calendarId?: string;
}): EventDraft {
  const prefs = usePrefs.getState();
  const calendars = useData.getState().calendars;
  const cal = calendars.find((c) => c.id === opts.calendarId && !c.readOnly) ?? calendars.find((c) => c.primary) ?? calendars.find((c) => !c.readOnly);
  const startMin = opts.startMin ?? 9 * 60;
  const dur = opts.durationMin ?? prefs.defaultDuration;
  const endTotal = startMin + dur;
  return {
    calendarId: cal?.id ?? "",
    title: "",
    description: "",
    location: "",
    allDay: opts.allDay ?? false,
    startDate: opts.day,
    startMin,
    endDate: endTotal >= 1440 ? addDays(opts.day, 1) : opts.day,
    endMin: endTotal % 1440,
    repeat: "none",
  };
}

export function draftFromInstance(inst: EventInstance, tz: string): EventDraft {
  const ev = inst.event;
  const base: EventDraft = {
    id: ev.id,
    seriesDate: inst.seriesDate,
    isRecurring: inst.isRecurring,
    calendarId: ev.calendarId,
    title: ev.title,
    description: ev.description ?? "",
    location: ev.location ?? "",
    allDay: ev.allDay,
    startDate: inst.startDate,
    startMin: 0,
    endDate: inst.endDate,
    endMin: 0,
    repeat: presetOf(ev.recurrence),
    recurrence: ev.recurrence,
    guests: ev.guests,
    meetLink: ev.meetLink,
  };
  if (!ev.allDay) {
    const s = zoned(inst.start, tz);
    const e = zoned(inst.end, tz);
    base.startDate = s.key;
    base.startMin = s.minutes;
    base.endDate = e.key;
    base.endMin = e.minutes;
  }
  return base;
}

function eventFields(d: EventDraft, tz: string): Omit<CalendarEvent, "id" | "created" | "updated"> {
  let start = 0;
  let end = 0;
  if (!d.allDay) {
    start = zonedToMs(d.startDate, d.startMin, tz);
    end = zonedToMs(d.endDate, d.endMin, tz);
    if (end <= start) end = start + 15 * 60_000;
  }
  const rec = d.repeat === "custom" ? d.recurrence : recurrenceFromPreset(d.repeat, d.startDate);
  return {
    calendarId: d.calendarId,
    title: d.title.trim() || "(No title)",
    description: d.description.trim() || undefined,
    location: d.location.trim() || undefined,
    allDay: d.allDay,
    start,
    end,
    tz,
    startDate: d.allDay ? d.startDate : undefined,
    endDate: d.allDay ? (d.endDate < d.startDate ? d.startDate : d.endDate) : undefined,
    recurrence: rec,
    guests: d.guests,
    meetLink: d.meetLink,
  };
}

/** Create or update from an editor draft. `scope` only matters for recurring events. */
export async function saveDraft(d: EventDraft, tz: string, scope: Scope = "all"): Promise<void> {
  const { addEvent, updateEvent, events } = useData.getState();
  const fields = eventFields(d, tz);
  if (!d.id) {
    await addEvent(fields);
    useUI.getState().toast("Event created");
    return;
  }
  const master = events.find((e) => e.id === d.id);
  if (!master) return;

  const recurring = !!master.recurrence;
  if (!recurring) {
    await updateEvent(d.id, { ...fields, recurrence: fields.recurrence });
    useUI.getState().toast("Event saved");
    return;
  }

  if (scope === "this") {
    // Detach this occurrence into a single event and hide it from the series.
    await updateEvent(master.id, { exdates: [...(master.exdates ?? []), d.seriesDate!] });
    await addEvent({ ...fields, recurrence: undefined, recurringEventId: master.id, exdates: undefined });
  } else {
    // Apply to the whole series. If the user moved the day, shift the series by the same amount.
    const origKey = d.seriesDate!;
    const shift = diffDays(origKey, d.startDate);
    const base = zoned(master.start, master.tz);
    let nextStart = master.start;
    let nextEnd = master.end;
    if (!d.allDay) {
      const newBaseKey = addDays(base.key, shift);
      nextStart = zonedToMs(newBaseKey, d.startMin, tz);
      nextEnd = nextStart + (zonedToMs(d.endDate, d.endMin, tz) - zonedToMs(d.startDate, d.startMin, tz));
    }
    const patch: Partial<CalendarEvent> = {
      ...fields,
      start: nextStart,
      end: Math.max(nextEnd, nextStart + 15 * 60_000),
      startDate: d.allDay ? addDays(master.startDate ?? d.startDate, shift) : undefined,
      endDate: d.allDay ? addDays(master.endDate ?? d.endDate, shift) : undefined,
      exdates: master.exdates,
      recurrence: fields.recurrence,
    };
    await updateEvent(master.id, patch);
  }
  useUI.getState().toast("Event saved");
}

export async function deleteInstance(inst: EventInstance, scope: Scope): Promise<void> {
  const { events, deleteEvent, updateEvent } = useData.getState();
  const master = events.find((e) => e.id === inst.event.id);
  if (!master) return;
  const toast = useUI.getState().toast;

  if (!master.recurrence || scope === "all") {
    await deleteEvent(master.id);
    toast(master.recurrence ? "Series deleted" : "Event deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, created, updated, taskId, ...rest } = master;
          void useData.getState().addEvent(rest);
        },
      },
    });
    return;
  }
  const prev = master.exdates ?? [];
  await updateEvent(master.id, { exdates: [...prev, inst.seriesDate] });
  toast("Event deleted", {
    action: { label: "Undo", onClick: () => void useData.getState().updateEvent(master.id, { exdates: prev }) },
  });
}

/** Move an instance by dragging (same-calendar, same duration). Non-recurring events only. */
export async function moveEvent(inst: EventInstance, newStartDate: DateKey, newStartMin: number, tz: string): Promise<void> {
  const ev = inst.event;
  if (ev.recurrence) return;
  const dur = ev.end - ev.start;
  const start = zonedToMs(newStartDate, newStartMin, tz);
  await useData.getState().updateEvent(ev.id, { start, end: start + dur });
}
