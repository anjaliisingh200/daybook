"use client";
import type { ReactNode } from "react";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";

/**
 * The one header both tabs share: Today, previous/next, the date being shown,
 * and any extra controls. The Day / Week / Month switch lives in the top app header.
 */
export function DateHeader({
  title,
  onToday,
  onStep,
  stepLabel,
  right,
}: {
  title: string;
  onToday: () => void;
  onStep: (dir: 1 | -1) => void;
  stepLabel: string;
  /** Extra controls on the right (Calendar: search, My calendars, Create). */
  right?: ReactNode;
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

      {right}
    </div>
  );
}
