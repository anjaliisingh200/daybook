"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFmt, useToday } from "@/lib/hooks";
import type { DateKey } from "@/lib/types";

/**
 * One day's heading: small weekday label over a large date number, today in the primary colour.
 * The Calendar's header row and the Tasks day columns both use it, so the two can never drift apart.
 */
export function DayCell({ day, onPick, selected, badge, className }: { day: DateKey; onPick: (d: DateKey) => void; selected?: DateKey | null; badge?: (d: DateKey) => ReactNode; className?: string }) {
  const fmt = useFmt();
  const today = useToday();
  const isToday = day === today;
  const isSel = day === selected;
  return (
    <button
      onClick={() => onPick(day)}
      aria-label={fmt.dayLong(day)}
      aria-pressed={selected === undefined ? undefined : isSel}
      className={cn("group flex flex-col items-center gap-0.5 py-2 hover:bg-surface-2/60", className)}
    >
      <span className={cn("text-[0.6875rem] font-medium uppercase tracking-wider", isToday ? "text-semantic-primary" : "text-text-2")}>{fmt.weekday(day, "short")}</span>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-full text-[1.4rem] leading-none transition-colors md:size-10",
          isToday ? "bg-semantic-primary font-semibold text-semantic-on-primary" : "group-hover:bg-surface-3",
          isSel && !isToday && "ring-2 ring-semantic-primary"
        )}
      >
        {fmt.dayNum(day)}
      </span>
      {badge && <span className="flex h-4 items-center text-[0.6875rem] font-medium text-text-2">{badge(day)}</span>}
    </button>
  );
}

/**
 * The day / date row used by the Calendar: a DayCell per day with hairline dividers between days.
 */
export function DayHeaders({
  days,
  onPick,
  selected,
  badge,
  gutter,
  minColumnWidth,
  divider = true,
}: {
  days: DateKey[];
  onPick: (d: DateKey) => void;
  selected?: DateKey | null;
  /** Optional line under the date number (e.g. a task count). */
  badge?: (d: DateKey) => ReactNode;
  /** Optional left gutter (the calendar uses it for the time zone). */
  gutter?: ReactNode;
  /** Smallest width of one day in px. Below that the row scrolls sideways instead of squeezing. */
  minColumnWidth?: number;
  /** The line under the day row. */
  divider?: boolean;
}) {
  return (
    <div className={cn("flex shrink-0", divider && "border-b border-border")}>
      {gutter !== undefined && <div className="flex w-12 shrink-0 items-end justify-center pb-2 text-[0.625rem] font-medium text-text-3 md:w-16">{gutter}</div>}
      <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${minColumnWidth ?? 0}px, 1fr))` }}>
        {days.map((d) => (
          <DayCell key={d} day={d} onPick={onPick} selected={selected} badge={badge} className="border-l border-border first:border-l-0" />
        ))}
      </div>
    </div>
  );
}
