import { useState } from "react";
import { AlignLeft, Check, MapPin } from "lucide-react";
import type { CalendarInfo, DateKey } from "@/lib/types";
import { zonedToMs } from "@/lib/dates";
import { Field, Sheet } from "./controls";
import { TZ, fmt } from "./common";
import type { NewEvent } from "./data";

/** Quarter-hour choices, like the website's time picker. */
const TIMES = Array.from({ length: 96 }, (_, i) => i * 15);
const DEFAULT_DURATION = 30; // the website's default event length, in minutes

/**
 * The website's "New event" sheet, for today: a title, a time (or all day), a calendar, a description and a place.
 * The panel only ever shows today, so the date is fixed to today.
 */
export function EventSheet({
  day,
  startMin,
  calendars,
  blocked,
  onClose,
  onSave,
}: {
  day: DateKey;
  startMin: number;
  calendars: CalendarInfo[];
  /** A reason events can't be added right now (Google is connected and is read-only for now). */
  blocked: string | null;
  onClose: () => void;
  onSave: (e: NewEvent) => Promise<boolean>;
}) {
  const writable = calendars.filter((c) => !c.readOnly);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(Math.min(startMin, 1425));
  const [end, setEnd] = useState(Math.min(startMin + DEFAULT_DURATION, 1439));
  const [calendarId, setCalendarId] = useState((writable.find((c) => c.primary) ?? writable[0])?.id ?? "");
  const [busy, setBusy] = useState(false);

  const endChoices = TIMES.filter((m) => m > start);
  const length = end - start;

  const save = async () => {
    if (blocked || busy) return;
    setBusy(true);
    const input: NewEvent = {
      calendarId,
      title: title.trim() || "(No title)",
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      allDay,
      start: allDay ? 0 : zonedToMs(day, start, TZ),
      end: allDay ? 0 : Math.max(zonedToMs(day, end, TZ), zonedToMs(day, start, TZ) + 15 * 60_000),
      tz: TZ,
      startDate: allDay ? day : undefined,
      endDate: allDay ? day : undefined,
    };
    const ok = await onSave(input);
    if (!ok) setBusy(false);
  };

  return (
    <Sheet
      label="New event"
      title="New event"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={busy || !!blocked || !calendarId} onClick={() => void save()}>
            Save event
          </button>
        </>
      }
    >
      {blocked && <p className="notice flat">{blocked}</p>}
      <form
        className="sheet-form"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Field label="Title">
          <input className="input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add title" aria-label="Event title" />
        </Field>

        <div>
          <div className="mini-label">Date</div>
          <div className="static-value">{fmt.dayLong(day)}</div>
        </div>

        <div className="allday-row">
          <button type="button" role="checkbox" aria-checked={allDay} aria-label="All day" className="check" onClick={() => setAllDay(!allDay)}>
            <Check strokeWidth={3} />
          </button>
          <span>All day</span>
        </div>

        {!allDay && (
          <Field label="Time">
            <div className="times">
              <select
                className="input select"
                aria-label="Start time"
                value={start}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setStart(m);
                  setEnd(Math.min(m + DEFAULT_DURATION, 1439));
                }}
              >
                {TIMES.map((m) => (
                  <option key={m} value={m}>
                    {fmt.minutes(m)}
                  </option>
                ))}
              </select>
              <span className="to">to</span>
              <select className="input select" aria-label="End time" value={end} onChange={(e) => setEnd(Number(e.target.value))}>
                {endChoices.length === 0 && <option value={1439}>{fmt.minutes(1439)}</option>}
                {endChoices.map((m) => (
                  <option key={m} value={m}>
                    {fmt.minutes(m)}
                  </option>
                ))}
                {!endChoices.includes(end) && endChoices.length > 0 && <option value={end}>{fmt.minutes(end)}</option>}
              </select>
              {length > 0 && <span className="dur">{fmt.duration(length)}</span>}
            </div>
          </Field>
        )}

        <div>
          <div className="mini-label">
            <AlignLeft /> Description
          </div>
          <textarea className="input textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add description" aria-label="Description" rows={3} />
        </div>

        <div>
          <div className="mini-label">
            <MapPin /> Location
          </div>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" aria-label="Location" />
        </div>

        <Field label="Calendar">
          <select className="input select" aria-label="Calendar" value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
            {writable.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
