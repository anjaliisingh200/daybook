"use client";
import type { ReactNode } from "react";
import { Clock, Lock, MapPin, Repeat } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCalendarViews, useFmt } from "@/lib/hooks";
import type { EventInstance } from "@/lib/types";
import { evSurface, evTitle } from "./eventStyle";

/**
 * The event card, shared by the week and day views so they always match.
 * What it shows depends on how tall it is on screen, never on which view it is in.
 */
export type EventTier = "line" | "title" | "full";

export function eventTier(heightPx: number): EventTier {
  return heightPx < 64 ? "line" : heightPx < 104 ? "title" : "full";
}

export function eventCardClass(tier: EventTier): string {
  return cn(
    "overflow-hidden rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-accent",
    evSurface,
    tier === "line" ? "flex items-center gap-2.5 px-3" : tier === "title" ? "px-3 py-2.5" : "p-3.5"
  );
}

export function EventCardBody({ inst, done, heightPx, readOnly }: { inst: EventInstance; done: boolean; heightPx: number; readOnly?: boolean }) {
  const fmt = useFmt();
  const cals = useCalendarViews();
  const tier = eventTier(heightPx);
  const calName = cals.find((c) => c.id === inst.calendarId)?.name ?? "";
  const duration = inst.allDay ? 0 : Math.round((inst.end - inst.start) / 60000);
  const range = inst.allDay ? "All day" : fmt.timeRange(inst.start, inst.end);
  const icons = (
    <>
      {inst.isRecurring && <Repeat className="size-3 shrink-0 text-on-solid/85" aria-label="Repeats" />}
      {readOnly && <Lock className="size-3 shrink-0 text-on-solid/85" aria-label="Read only" />}
    </>
  );
  const title = <span className={cn("min-w-0 flex-1 truncate", evTitle, done && "line-through")}>{inst.title}</span>;

  if (tier === "line") {
    return (
      <>
        {title}
        {icons}
        <span className="tnum shrink-0 text-xs text-on-solid/90">{inst.allDay ? "All day" : fmt.time(inst.start, { compact: true })}</span>
      </>
    );
  }
  if (tier === "title") {
    return (
      <>
        <span className="flex items-center gap-1.5">
          {title}
          {icons}
        </span>
        <span className="tnum mt-0.5 block truncate text-xs text-on-solid/90">{range}</span>
      </>
    );
  }
  return (
    <>
      <span className="flex items-center gap-1.5">
        {title}
        {icons}
      </span>
      {heightPx >= 150 && inst.event.description && <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-on-solid/90">{inst.event.description}</span>}
      <span className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-on-solid">
        <Chip icon={<Clock className="size-3" />}>{range}</Chip>
        {duration > 0 && <Chip>{duration >= 60 && duration % 60 === 0 ? `${duration / 60} hr` : `${duration} mins`}</Chip>}
        {calName && (
          <Chip dot>{calName}</Chip>
        )}
        {inst.event.location && heightPx >= 130 && <Chip icon={<MapPin className="size-3" />}>{inst.event.location}</Chip>}
      </span>
    </>
  );
}

function Chip({ children, icon, dot }: { children: ReactNode; icon?: ReactNode; dot?: boolean }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-sm bg-on-solid/20 px-2 py-1">
      {icon}
      {dot && <span className="size-2 shrink-0 rounded-full bg-on-solid" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
