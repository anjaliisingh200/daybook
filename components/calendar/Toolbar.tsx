"use client";
import { useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DateHeader } from "@/components/shell/DateHeader";
import { weekRangeTitle } from "@/lib/weekTitle";
import { MyCalendarsMenu } from "./MyCalendars";
import { useFmt, useIsMobile, useToday } from "@/lib/hooks";
import { newDraft } from "@/lib/store/eventActions";
import { useUI } from "@/lib/store/ui";
import { parseKey } from "@/lib/dates";
import type { CalView, DateKey } from "@/lib/types";
import type { Visible } from "./useCalendar";

export function CalendarToolbar({ view, anchor, visible, go }: { view: CalView; anchor: DateKey; visible: Visible; go: (d: 1 | -1) => void }) {
  const fmt = useFmt();
  const today = useToday();
  const mobile = useIsMobile();
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openEditor = useUI((s) => s.openEventEditor);

  const title = useMemo(() => {
    if (view === "day") return mobile ? fmt.dayShort(anchor) : `${fmt.dayLong(anchor)}, ${parseKey(anchor).y}`;
    if (view === "month" || view === "schedule") return mobile ? `${fmt.month(anchor, "short")} ${parseKey(anchor).y}` : fmt.monthYear(anchor);
    const a = visible.days[0] ?? anchor;
    const b = visible.days[visible.days.length - 1] ?? anchor;
    if (!mobile) return weekRangeTitle(a, b, (d) => fmt.month(d, "short"));
    const A = parseKey(a);
    const B = parseKey(b);
    if (A.m === B.m && A.y === B.y) return `${fmt.month(a, "short")} ${A.y}`;
    if (A.y === B.y) return `${fmt.month(a, "short")} – ${fmt.month(b, "short")} ${A.y}`;
    return `${fmt.month(a, "short")} ${A.y} – ${fmt.month(b, "short")} ${B.y}`;
  }, [view, anchor, visible, fmt, mobile]);

  const viewOptions = [
    { value: "day" as const, label: "Day", hint: "D" },
    { value: "week" as const, label: "Week", hint: "W" },
    { value: "month" as const, label: "Month", hint: "M" },
    { value: "schedule" as const, label: "Schedule", hint: "A" },
  ];

  const stepLabel = view === "month" ? "month" : view === "day" ? "day" : "week";

  return (
    <DateHeader
      title={title}
      view={view}
      views={viewOptions}
      onView={setView}
      onToday={() => setAnchor(today)}
      onStep={go}
      stepLabel={stepLabel}
      right={
        <>
          <MyCalendarsMenu />
          <Button size="sm" variant="primary" icon={<Plus className="size-4" />} className="max-md:hidden" onClick={() => openEditor(newDraft({ day: anchor }))}>
            Create
          </Button>
        </>
      }
    />
  );
}
