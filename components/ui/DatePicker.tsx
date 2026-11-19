"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { addDays, addMonths, dowOf, monthGrid, sameMonth, startOfMonth } from "@/lib/dates";
import type { DateKey } from "@/lib/types";
import { useFmt, useToday } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";
import { IconButton } from "./Button";
import { Dropdown } from "./Popover";
import type { Placement } from "@floating-ui/react-dom";

/** Month grid. `value` highlighted; `marked` days get a small dot. */
export function MonthPanel({
  value,
  onChange,
  month: monthProp,
  onMonthChange,
  marked,
  highlightWeek,
  compact,
}: {
  value: DateKey | null;
  onChange: (k: DateKey) => void;
  month?: DateKey;
  onMonthChange?: (k: DateKey) => void;
  marked?: Set<DateKey>;
  highlightWeek?: DateKey[];
  compact?: boolean;
}) {
  const weekStart = usePrefs((p) => p.weekStart);
  const fmt = useFmt();
  const today = useToday();
  const [inner, setInner] = useState<DateKey>(startOfMonth(value ?? today));
  const month = monthProp ?? inner;
  const setMonth = (k: DateKey) => (onMonthChange ? onMonthChange(k) : setInner(k));
  const grid = useMemo(() => monthGrid(month, weekStart), [month, weekStart]);
  const dows = grid[0];

  return (
    <div className={cn("select-none", compact ? "w-full" : "w-[17.5rem] p-3")}>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">{fmt.monthYear(month)}</span>
        <div className="flex">
          <IconButton label="Previous month" size="sm" onClick={() => setMonth(addMonths(month, -1))} noTooltip>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label="Next month" size="sm" onClick={() => setMonth(addMonths(month, 1))} noTooltip>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[0.6875rem] font-medium text-text-3">
        {dows.map((d) => (
          <div key={d} className="py-1.5">
            {fmt.weekday(d, "narrow")}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {grid.flat().map((k) => {
          const isToday = k === today;
          const sel = k === value;
          const inWeek = highlightWeek?.includes(k);
          const inMonth = sameMonth(k, month);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              aria-label={fmt.dayLong(k)}
              aria-pressed={sel}
              className={cn(
                "relative mx-auto flex size-8 items-center justify-center rounded-full text-[0.8125rem] transition-colors",
                inWeek && !sel && "bg-surface-2",
                sel ? "bg-semantic-date-highlight font-semibold text-semantic-date-highlight-text" : isToday ? "font-semibold text-semantic-date-highlight ring-1 ring-semantic-date-highlight" : inMonth ? "text-text hover:bg-surface-2" : "text-text-3 hover:bg-surface-2"
              )}
            >
              {fmt.dayNum(k)}
              {marked?.has(k) && !sel && <span className="absolute bottom-0.5 size-1 rounded-full bg-semantic-date-highlight" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function nextMonday(from: DateKey): DateKey {
  const d = dowOf(from);
  return addDays(from, ((8 - d) % 7) || 7);
}

/** A button showing a date; opens a picker with quick options. */
export function DateField({
  value,
  onChange,
  clearable,
  quick,
  placeholder = "No date",
  className,
  placement = "bottom-start",
  variant = "field",
  relativeLabel = false,
  "aria-label": ariaLabel,
}: {
  value: DateKey | null;
  onChange: (k: DateKey | null) => void;
  clearable?: boolean;
  /** Show "Today" / "Tomorrow" before the date (tasks). Off by default, so the date reads like the calendar. */
  relativeLabel?: boolean;
  quick?: boolean;
  placeholder?: string;
  className?: string;
  placement?: Placement;
  variant?: "field" | "ghost";
  "aria-label"?: string;
}) {
  const fmt = useFmt();
  const today = useToday();
  const [month, setMonth] = useState<DateKey>(startOfMonth(value ?? today));
  const yearSuffix = value && value.slice(0, 4) !== today.slice(0, 4) ? `, ${value.slice(0, 4)}` : "";
  const label = !value
    ? placeholder
    : relativeLabel && value === today
      ? `Today · ${fmt.dayShort(value)}`
      : relativeLabel && value === addDays(today, 1)
        ? `Tomorrow · ${fmt.dayShort(value)}`
        : `${fmt.dayShort(value)}${yearSuffix}`;

  return (
    <Dropdown
      placement={placement}
      trigger={
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={() => setMonth(startOfMonth(value ?? today))}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors",
            variant === "field" ? "border border-border bg-surface hover:border-border-strong" : "hover:bg-surface-2",
            className
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-text-3" />
          <span className={cn("truncate", !value && "text-text-3")}>{label}</span>
        </button>
      }
    >
      {(close) => (
        <div>
          {quick && (
            <div className="flex flex-wrap gap-1.5 border-b border-border p-3 pb-2.5">
              {[
                ["Today", today],
                ["Tomorrow", addDays(today, 1)],
                ["Next week", nextMonday(today)],
              ].map(([l, k]) => (
                <button
                  key={l}
                  onClick={() => {
                    onChange(k);
                    close();
                  }}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-surface-2",
                    value === k ? "border-accent bg-accent-soft text-text" : "border-border text-text-2"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
          <MonthPanel
            value={value}
            month={month}
            onMonthChange={setMonth}
            onChange={(k) => {
              onChange(k);
              close();
            }}
          />
          {clearable && value && (
            <div className="border-t border-border p-2">
              <button
                onClick={() => {
                  onChange(null);
                  close();
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-sm text-text-2 hover:bg-surface-2"
              >
                <X className="size-3.5" /> Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </Dropdown>
  );
}

/** Time-of-day picker in 15-minute steps, with optional duration hints (for end times). */
export function TimeSelect({
  value,
  onChange,
  from,
  className,
  "aria-label": ariaLabel,
}: {
  /** Undefined shows an empty "Time" field. */
  value?: number;
  onChange: (min: number) => void;
  /** When set, shows "(1 hr)" style durations measured from this minute. */
  from?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const fmt = useFmt();
  const options = useMemo(() => Array.from({ length: 96 }, (_, i) => i * 15), []);
  return (
    <Dropdown
      placement="bottom-start"
      trigger={
        <button type="button" aria-label={ariaLabel} className={cn("flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm hover:border-border-strong", className)}>
          <Clock className="size-4 shrink-0 text-text-3" />
          <span className={cn("tnum", value === undefined && "text-text-3")}>{value === undefined ? "Time" : fmt.minutes(value)}</span>
        </button>
      }
    >
      {(close) => (
        <TimeList
          options={options}
          value={value ?? -1}
          onPick={(m) => {
            onChange(m);
            close();
          }}
          label={(m) => {
            const base = fmt.minutes(m);
            if (from === undefined) return base;
            const d = m - from;
            return d > 0 ? `${base}  ·  ${fmt.duration(d)}` : base;
          }}
          disabled={(m) => from !== undefined && m <= from - 24 * 60}
        />
      )}
    </Dropdown>
  );
}

function TimeList({ options, value, onPick, label, disabled }: { options: number[]; value: number; onPick: (m: number) => void; label: (m: number) => string; disabled: (m: number) => boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <div ref={ref} role="listbox" className="max-h-64 w-52 overflow-auto p-1.5">
      {options.map((m) => (
        <button
          key={m}
          role="option"
          aria-selected={m === value}
          disabled={disabled(m)}
          onClick={() => onPick(m)}
          className={cn("tnum flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-2", m === value && "bg-accent-soft font-medium")}
        >
          {label(m)}
        </button>
      ))}
    </div>
  );
}
