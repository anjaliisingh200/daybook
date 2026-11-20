"use client";
import { usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/lib/hooks";
import { useUI } from "@/lib/store/ui";
import { useCalView } from "@/components/calendar/useCalendar";

/**
 * Day / Week / Month, in the top header for both tabs. The two tabs share one choice:
 * pick Day on the Calendar and the Tasks tab opens in Day too (and the other way round).
 * Schedule only exists on the Calendar.
 */
export function ViewSwitch() {
  const path = usePathname();
  const mobile = useIsMobile();
  const calView = useCalView().view;
  const tasksView = useUI((s) => s.tasksView);
  const setCalView = useUI((s) => s.setCalView);
  const setTasksView = useUI((s) => s.setTasksView);

  const onTasks = path.startsWith("/tasks");
  if (!onTasks && !path.startsWith("/calendar")) return null;

  const options = onTasks
    ? [
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]
    : [
        { value: "day", label: "Day" },
        { value: "week", label: mobile ? "3 days" : "Week" },
        { value: "month", label: "Month" },
        { value: "schedule", label: "Schedule" },
      ];

  return (
    <div className="w-[6.75rem] shrink-0 md:w-32">
      <Select
        value={onTasks ? tasksView : calView}
        onValueChange={(v) => (onTasks ? setTasksView(v as "day" | "week" | "month") : setCalView(v as "day" | "week" | "month" | "schedule"))}
      >
        <SelectTrigger aria-label="View" className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
