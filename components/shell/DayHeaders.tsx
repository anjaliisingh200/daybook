"use client";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useFmt, useToday } from "@/lib/hooks";
import type { DateKey } from "@/lib/types";

/**
 * The day / date row used by BOTH tabs: small weekday label over a large date
 * number, today in the accent colour, hairline dividers between days.
 * The Calendar's time grid and the Tasks columns render this same component,
 * so the two can never drift apart.
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
  /** The line under the day row. Tasks turns it off. */
  divider?: boolean;
}) {
  const fmt = useFmt();
  const today = useToday();
  return (
    <div className={cn("flex shrink-0", divider && "border-b border-border")}>
      {gutter !== undefined && <div className="flex w-12 shrink-0 items-end justify-center pb-2 text-[0.625rem] font-medium text-text-3 md:w-16">{gutter}</div>}
      <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${minColumnWidth ?? 0}px, 1fr))` }}>
        {days.map((d) => {
          const isToday = d === today;
          const isSel = d === selected;
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              aria-label={fmt.dayLong(d)}
              aria-pressed={selected === undefined ? undefined : isSel}
              className="group flex flex-col items-center gap-0.5 border-l border-border py-2 first:border-l-0 hover:bg-surface-2/60"
            >
              <span className={cn("text-[0.6875rem] font-medium uppercase tracking-wider", isToday ? "text-semantic-primary" : "text-text-2")}>{fmt.weekday(d, "short")}</span>
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-[1.4rem] leading-none transition-colors md:size-10",
                  isToday ? "bg-semantic-primary font-semibold text-semantic-on-primary" : "group-hover:bg-surface-3",
                  isSel && !isToday && "ring-2 ring-semantic-primary"
                )}
              >
                {fmt.dayNum(d)}
              </span>
              {badge && <span className="flex h-4 items-center text-[0.6875rem] font-medium text-text-2">{badge(d)}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
