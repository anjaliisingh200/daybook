"use client";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ViewOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/**
 * The one header both tabs share: Today, previous/next, the date being shown,
 * and the Day / Week / Month switch. Nothing else lives here.
 */
export function DateHeader<T extends string>({
  title,
  view,
  views,
  onView,
  onToday,
  onStep,
  stepLabel,
}: {
  title: string;
  view: T;
  views: ViewOption<T>[];
  onView: (v: T) => void;
  onToday: () => void;
  onStep: (dir: 1 | -1) => void;
  stepLabel: string;
}) {
  return (
    <div className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border px-2 md:gap-2 md:px-4">
      <Button size="sm" variant="secondary" className="max-md:hidden" onClick={onToday}>
        Today
      </Button>
      <div className="flex items-center">
        <IconButton label={`Previous ${stepLabel}`} shortcut="K" onClick={() => onStep(-1)}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <IconButton label={`Next ${stepLabel}`} shortcut="J" onClick={() => onStep(1)}>
          <ChevronRight className="size-5" />
        </IconButton>
      </div>

      <h1 className="font-display min-w-0 flex-1 truncate pl-1 text-[1.5rem] leading-none md:text-[1.7rem]">{title}</h1>

      <IconButton label="Today" onClick={onToday} className="md:hidden">
        <CalendarClock className="size-5" />
      </IconButton>

      <div className="w-[6.75rem] shrink-0 md:w-32">
        <Select value={view} onValueChange={(v) => onView(v as T)}>
          <SelectTrigger aria-label="View" className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {views.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
