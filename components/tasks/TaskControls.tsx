"use client";
import { LayoutGrid, List, ListFilter, Search, X } from "lucide-react";
import { useRef, useEffect } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Controls";
import { Dropdown } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { usePrefs } from "@/lib/store/prefs";
import { NO_FILTERS, useUI, type TaskFilters } from "@/lib/store/ui";
import type { Priority } from "@/lib/types";
import { PRIORITY_META } from "./TaskCard";

export function activeFilterCount(f: TaskFilters): number {
  return f.lists.length + f.priorities.length + (f.due !== "any" ? 1 : 0);
}

export function FilterMenu({ compact }: { compact?: boolean }) {
  const filters = useUI((s) => s.taskFilters);
  const setFilters = useUI((s) => s.setTaskFilters);
  const n = activeFilterCount(filters);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const trigger = compact ? (
    <IconButton label="Filter" active={n > 0}>
      <span className="relative">
        <ListFilter className="size-[1.1rem]" />
        {n > 0 && <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-[0.5625rem] font-bold text-on-accent">{n}</span>}
      </span>
    </IconButton>
  ) : (
    <Button size="sm" variant="secondary" icon={<ListFilter className="size-4 text-text-3" />} className={cn(n > 0 && "border-accent-line bg-accent-soft")}>
      Filter
      {n > 0 && <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[0.625rem] font-bold text-on-accent">{n}</span>}
    </Button>
  );

  return (
    <Dropdown placement="bottom-end" trigger={trigger}>
      {() => (
        <div className="w-72 p-3">
          <Section title="Priority">
            <div className="flex flex-wrap gap-1.5">
              {(["high", "medium", "low", "none"] as const).map((p) => {
                const on = filters.priorities.includes(p as Priority);
                const m = p === "none" ? null : PRIORITY_META[p];
                const Icon = m?.icon;
                return (
                  <Chip key={p} on={on} onClick={() => setFilters({ ...filters, priorities: toggle(filters.priorities, p as Priority) })}>
                    {Icon && <Icon className="size-3.5" style={{ color: m!.color }} strokeWidth={2.5} />}
                    {m ? m.label : "None"}
                  </Chip>
                );
              })}
            </div>
          </Section>
          <Section title="Due">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["any", "Any time"],
                  ["overdue", "Overdue"],
                  ["today", "Today"],
                  ["week", "Next 7 days"],
                  ["none", "No date"],
                ] as const
              ).map(([v, l]) => (
                <Chip key={v} on={filters.due === v} onClick={() => setFilters({ ...filters, due: v })}>
                  {l}
                </Chip>
              ))}
            </div>
          </Section>
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="ghost" disabled={n === 0} onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-3">{title}</div>
      {children}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
        on ? "border-accent bg-accent-soft text-text" : "border-border text-text-2 hover:bg-surface-2"
      )}
    >
      {children}
    </button>
  );
}

export function LayoutToggle() {
  const layout = usePrefs((p) => p.taskLayout);
  const set = usePrefs((p) => p.set);
  return (
    <Segmented
      size="sm"
      label="Layout"
      value={layout}
      onChange={(v) => set({ taskLayout: v })}
      options={[
        { value: "grid", label: <LayoutGrid className="size-4" />, title: "Card grid" },
        { value: "list", label: <List className="size-4" />, title: "Single column" },
      ]}
    />
  );
}

export function TaskSearch({ className, inputRef }: { className?: string; inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const q = useUI((s) => s.taskQuery);
  const setQ = useUI((s) => s.setTaskQuery);
  const local = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? local;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref]);
  return (
    <div className={cn("flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 transition-[border,box-shadow] focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20", className)}>
      <Search className="size-4 shrink-0 text-text-3" />
      <input
        ref={ref}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && (setQ(""), (e.target as HTMLInputElement).blur())}
        placeholder="Search tasks"
        aria-label="Search tasks"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
      />
      {q && (
        <button onClick={() => setQ("")} aria-label="Clear search" className="text-text-3 hover:text-text">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
