"use client";
import { Field } from "@/components/ui/Controls";
import { DateField, TimeSelect } from "@/components/ui/DatePicker";
import { X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { useFmt } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";
import type { DateKey } from "@/lib/types";

/**
 * Date and time, laid out like the calendar's event editor: a Date field, then a Time field.
 * There is no All day switch. Time is optional: with no time set the field is empty and the item still saves.
 * Picking a start time fills the end time with the default duration; the end can be changed.
 */
export function DateTimeRow({
  due,
  onDue,
  startMin,
  endMin,
  onTime,
  relativeLabel = false,
  clearable = false,
}: {
  due: DateKey | null;
  onDue: (k: DateKey | null) => void;
  startMin?: number;
  endMin?: number;
  /** Sets the start and end minutes; (null, null) clears the time. */
  onTime: (start: number | null, end: number | null) => void;
  /** Relative words ("Today") before the date: tasks only. */
  relativeLabel?: boolean;
  /** Tasks can clear their date; events always keep one. */
  clearable?: boolean;
}) {
  const fmt = useFmt();
  const defaultDuration = usePrefs((p) => p.defaultDuration);
  const end = startMin === undefined ? undefined : endMin ?? Math.min(startMin + defaultDuration, 1425);
  return (
    <div className="space-y-4">
      <Field label="Date">
        <DateField value={due} onChange={onDue} clearable={clearable} quick={clearable} relativeLabel={relativeLabel} placeholder="No date" aria-label="Date" className="min-w-[8.5rem]" />
      </Field>
      {due && (
        <Field label="Time">
          <div className="flex flex-wrap items-center gap-2">
            <TimeSelect
              value={startMin}
              onChange={(m) => onTime(m, Math.min(m + defaultDuration, 1425))}
              aria-label="Start time"
            />
            {startMin !== undefined && end !== undefined && (
              <>
                <span className="text-text-3">to</span>
                <TimeSelect value={end} from={startMin} onChange={(m) => onTime(startMin, m)} aria-label="End time" />
                {end > startMin && <span className="text-xs text-text-3">{fmt.duration(end - startMin)}</span>}
                <IconButton label="Remove time" size="sm" noTooltip onClick={() => onTime(null, null)}>
                  <X className="size-3.5" />
                </IconButton>
              </>
            )}
          </div>
        </Field>
      )}
    </div>
  );
}
