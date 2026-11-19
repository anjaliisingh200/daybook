"use client";
import { cn } from "@/lib/cn";
import { monthGrid, sameMonth } from "@/lib/dates";
import { useFmt, useToday } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";
import type { DateKey } from "@/lib/types";

/** Month view of the Tasks tab: every day of the month with its task count. Navigation only, never a filter. */
export function MonthNav({ month, selected, counts, onPick }: { month: DateKey; selected: DateKey | null; counts: Map<DateKey, number>; onPick: (d: DateKey) => void }) {
  const fmt = useFmt();
  const today = useToday();
  const weekStart = usePrefs((p) => p.weekStart);
  const grid = monthGrid(month, weekStart);
  return (
    <div role="grid" aria-label={fmt.monthYear(month)}>
      <div className="grid grid-cols-7 pb-1 text-center text-[0.6875rem] font-medium uppercase tracking-wider text-text-2">
        {grid[0].map((d) => (
          <div key={d}>{fmt.weekday(d, "short")}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 md:gap-1">
        {grid.flat().map((d) => {
          const n = counts.get(d) ?? 0;
          const sel = d === selected;
          const isToday = d === today;
          const inMonth = sameMonth(d, month);
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              aria-label={`${fmt.dayLong(d)}, ${n} ${n === 1 ? "task" : "tasks"}`}
              aria-pressed={sel}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[0.8125rem] transition-colors md:h-10",
                sel ? "border-accent bg-accent text-on-accent" : isToday ? "border-accent-line bg-accent-soft font-semibold text-accent" : "border-transparent hover:border-border hover:bg-surface",
                !sel && !isToday && (inMonth ? "text-text" : "text-text-3")
              )}
            >
              {fmt.dayNum(d)}
              {n > 0 && <span className={cn("size-1.5 rounded-full", sel ? "bg-on-accent/80" : "bg-accent")} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
