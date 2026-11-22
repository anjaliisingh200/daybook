"use client";
import { CalendarDays, ChevronDown, ChevronUp, ChevronsUp, Equal } from "lucide-react";
import { TaskCheck } from "@/components/ui/Controls";
import { cn } from "@/lib/cn";
import { Tooltip } from "@/components/ui/Tooltip";
import { useFmt, useToday } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { useUI } from "@/lib/store/ui";
import type { Priority, Task, TaskList } from "@/lib/types";

export const PRIORITY_META: Record<Priority, { label: string; icon: typeof ChevronUp; color: string }> = {
  high: { label: "High", icon: ChevronsUp, color: "var(--prio-high)" },
  medium: { label: "Medium", icon: Equal, color: "var(--prio-medium)" },
  low: { label: "Low", icon: ChevronDown, color: "var(--prio-low)" },
};

export function PriorityMark({ priority, showLabel = true }: { priority?: Priority; showLabel?: boolean }) {
  if (!priority) return null;
  const m = PRIORITY_META[priority];
  const Icon = m.icon;
  return (
    <span className="flex items-center gap-1 text-xs font-normal" style={{ color: m.color }} title={`${m.label} priority`}>
      <Icon className="size-3.5" strokeWidth={2.5} />
      {showLabel && m.label}
    </span>
  );
}

export function TaskCard({ task, compact, hideDue }: { task: Task; list?: TaskList; selectedDay?: string | null; compact?: boolean; hideDue?: boolean }) {
  const fmt = useFmt();
  const today = useToday();
  const toggle = useData((s) => s.toggleTask);
  const open = useUI((s) => s.openTask);

  const done = task.status === "completed";

  const dueLabel = task.due ? fmt.relative(task.due, today) : null;
  /** The date chip, unless the screen already shows the date (a single day on a phone). */
  const showDue = !!dueLabel && !compact && !hideDue;
  const showMeta = showDue || !!task.meta.priority;

  return (
    <article
      data-task={task.id}
      data-due={task.due ?? ""}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}${dueLabel ? `, due ${dueLabel}` : ""}`}
      onClick={() => open(task.id)}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(task.id);
        }
      }}
      className={cn(
        compact ? "group relative flex scroll-mt-24 cursor-pointer flex-col" : "group relative flex scroll-mt-24 cursor-pointer flex-col transition-[background,transform] duration-150",
        // done and not done share one look (no border, no highlight ring): a done task is told apart by its tick and strike-through
        "rounded-md bg-task-card hover:bg-task-card-hover focus-visible:outline-2"
      )}
      style={{ padding: 4 }}
    >
      <div className="flex items-start gap-3">
        <Tooltip label={done ? "Reopen task" : "Mark as complete"} delay={0}>
          <div className="pt-px" onClick={(e) => e.stopPropagation()}>
            <TaskCheck checked={done} onChange={() => void toggle(task.id)} label={done ? `Reopen ${task.title}` : `Complete ${task.title}`} />
          </div>
        </Tooltip>
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[0.9375rem] font-medium leading-snug", done && "text-text line-through decoration-text")}>{task.title}</h3>
        </div>
      </div>

      {showMeta && <div className={cn("mt-auto flex items-center gap-2 text-xs", compact ? "pt-2" : "pt-3")}>
        {showDue && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-normal text-text-2"
            )}
            title={task.due ? fmt.date(task.due) : undefined}
          >
            <CalendarDays className="size-3.5" />
            {dueLabel}
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <PriorityMark priority={task.meta.priority} showLabel={!compact} />
        </span>
      </div>}
    </article>
  );
}

