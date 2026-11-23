import { useEffect, useMemo, useRef } from "react";
import { Clock, MapPin, Repeat } from "lucide-react";
import type { CalendarInfo, DateKey, EventInstance } from "@/lib/types";
import { hexOf } from "@/lib/colors";
import { zoned } from "@/lib/dates";
import { layoutDay } from "@/lib/layout";
import { HOUR12, TZ, fmt } from "./common";
import { isBanner } from "./today";

/** Every hour is exactly this tall, as on the website's Day view. */
const HOUR = "8rem";
const at = (minutes: number) => `calc(${HOUR} * ${minutes / 60})`;

type Tier = "line" | "title" | "full";
/** What a card shows depends on how tall it is, exactly as on the website. */
const tierOf = (heightPx: number): Tier => (heightPx < 64 ? "line" : heightPx < 104 ? "title" : "full");

const hourLabel = (h: number) => (HOUR12 ? { big: `${String(h % 12 || 12).padStart(2, "0")}:00`, small: h < 12 ? "AM" : "PM" } : { big: `${String(h).padStart(2, "0")}:00`, small: "" });

function Card({ inst, mins, color, calName, style, absolute }: { inst: EventInstance; mins: number; color: string; calName: string; style?: React.CSSProperties; absolute?: boolean }) {
  const heightPx = mins * 2 - 6; // an hour is 8rem, about 120px
  const tier = tierOf(heightPx);
  const duration = inst.allDay ? 0 : Math.round((inst.end - inst.start) / 60000);
  const range = inst.allDay ? "All day" : fmt.timeRange(inst.start, inst.end);
  const repeats = inst.isRecurring ? <Repeat aria-label="Repeats" /> : null;
  return (
    <div className={`ev ${tier}${absolute ? " abs" : ""}`} style={{ ...style, ["--ev" as string]: color }} role="group" aria-label={`${inst.title}, ${range}`}>
      {tier === "line" ? (
        <>
          <b>{inst.title}</b>
          {repeats}
          <span className="time tnum">{inst.allDay ? "All day" : fmt.time(inst.start, { compact: true })}</span>
        </>
      ) : tier === "title" ? (
        <>
          <span className="t">
            <b>{inst.title}</b>
            {repeats}
          </span>
          <span className="range tnum">{range}</span>
        </>
      ) : (
        <>
          <span className="t">
            <b>{inst.title}</b>
            {repeats}
          </span>
          {heightPx >= 150 && inst.event.description && <span className="desc">{inst.event.description}</span>}
          <span className="chips">
            <span className="chip">
              <Clock />
              <span>{range}</span>
            </span>
            {duration > 0 && (
              <span className="chip">
                <span>{duration >= 60 && duration % 60 === 0 ? `${duration / 60} hr` : `${duration} mins`}</span>
              </span>
            )}
            {calName && (
              <span className="chip">
                <i />
                <span>{calName}</span>
              </span>
            )}
            {inst.event.location && heightPx >= 130 && (
              <span className="chip">
                <MapPin />
                <span>{inst.event.location}</span>
              </span>
            )}
          </span>
        </>
      )}
    </div>
  );
}

/** Today as a timeline: a rail with a big label for every hour, and cards placed at the time they start. The website's Day view. */
export function CalendarTab({ day, instances, calendars, now }: { day: DateKey; instances: EventInstance[]; calendars: CalendarInfo[]; now: number }) {
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const cal = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);
  const colorOf = (i: EventInstance) => hexOf(cal.get(i.calendarId)?.color);
  const nameOf = (i: EventInstance) => cal.get(i.calendarId)?.name ?? "";

  const banners = instances.filter(isBanner);
  const placed = useMemo(() => layoutDay(instances.filter((i) => !isBanner(i)), day, TZ), [instances, day]);
  const nowMin = zoned(now, TZ).minutes;
  const hours = Array.from({ length: 24 }, (_, h) => h);

  // open a little before now, as the website does
  useEffect(() => {
    const sc = scroller.current;
    const el = body.current;
    if (!sc || !el) return;
    const target = Math.max(0, Math.floor(zoned(Date.now(), TZ).minutes / 60) - 2);
    const hourPx = el.offsetHeight / 24;
    sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop + target * hourPx - 8;
  }, [day]);

  return (
    <div ref={scroller} className="scroll">
      <div className="dayview">
        {banners.length > 0 && (
          <div className="allday">
            <div className="gutter">
              <div className="tnum">All day</div>
            </div>
            <div className="vline" />
            <div className="stack">
              {banners.map((i) => (
                <Card key={i.key} inst={i} mins={30} color={colorOf(i)} calName={nameOf(i)} />
              ))}
            </div>
          </div>
        )}

        <div ref={body} className="hours">
          <div className="gutter">
            <div aria-hidden>
              {hours.map((h) => (
                <div key={h} className="hlabel" style={{ top: at(h * 60) }}>
                  <div className="big tnum">{hourLabel(h).big}</div>
                  {hourLabel(h).small && <div className="small">{hourLabel(h).small}</div>}
                </div>
              ))}
            </div>
            <div className="now" style={{ top: at(nowMin) }} aria-label={`Now, ${fmt.time(now)}`}>
              <div className="ln" />
              <div className="dot" />
              <div className="tag">
                <small>Now</small>
                <b className="tnum">{fmt.time(now)}</b>
              </div>
            </div>
          </div>

          <div className="rail" aria-hidden>
            {hours.map((h) => (
              <i key={h} style={{ top: `calc(${at(h * 60)} + 0.5px)` }} />
            ))}
          </div>

          <div className="lane">
            {hours.map((h) => (
              <div key={h} aria-hidden className="hline" style={{ top: at(h * 60) }} />
            ))}
            {placed.map((p) => (
              <Card
                key={p.inst.key}
                inst={p.inst}
                mins={p.bottom - p.top}
                color={colorOf(p.inst)}
                calName={nameOf(p.inst)}
                absolute
                style={{ top: at(p.top), height: `calc(${at(p.bottom - p.top)} - 6px)`, left: `${(p.col / p.cols) * 100}%`, width: `calc(${100 / p.cols}% - 8px)`, zIndex: 2 + p.col }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
