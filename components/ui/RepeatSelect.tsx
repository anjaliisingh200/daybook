"use client";
import { useState } from "react";
import { CustomRepeatDialog } from "@/components/ui/CustomRepeat";
import { Select } from "@/components/ui/Menu";
import { parseKey } from "@/lib/dates";
import { useFmt, useToday } from "@/lib/hooks";
import { decodeRepeat, describeRepeat, encodeRepeat, isCustomRepeat, recurrenceOfRepeat } from "@/lib/recurrence";
import type { DateKey } from "@/lib/types";

const CUSTOM = "__custom";

/**
 * Repeat choices, worded from the date they repeat on. "Custom…" opens the custom repeat dialog
 * (every N days / weeks / months / years, on chosen weekdays, with an optional end date).
 * A custom repeat is kept as one string, see lib/recurrence.ts.
 */
export function RepeatSelect({ value, onChange, due }: { value: string; onChange: (v: string) => void; due: DateKey | null }) {
  const fmt = useFmt();
  const today = useToday();
  const [dialog, setDialog] = useState(false);
  const start = due ?? today;
  const day = due ? parseKey(due).d : null;
  const options = [
    { value: "none", label: "Does not repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: due ? `Weekly on ${fmt.weekday(due, "long")}` : "Weekly" },
    { value: "weekdays", label: "Every weekday (Mon–Fri)" },
    { value: "monthly", label: day ? `Monthly on day ${day}` : "Monthly" },
    { value: "yearly", label: due ? `Annually on ${fmt.month(due, "long")} ${day}` : "Annually" },
    // the rule being used right now, when it is a custom one
    ...(isCustomRepeat(value) ? [{ value, label: describeRepeat(value, start, fmt) }] : []),
    { value: CUSTOM, label: "Custom…" },
  ];
  return (
    <>
      <Select<string> aria-label="Repeat" value={value} onChange={(v) => (v === CUSTOM ? setDialog(true) : onChange(v))} options={options} />
      <CustomRepeatDialog
        open={dialog}
        onClose={() => setDialog(false)}
        startKey={start}
        initial={(isCustomRepeat(value) ? decodeRepeat(value) : recurrenceOfRepeat(value, start)) ?? undefined}
        onDone={(rec) => onChange(encodeRepeat(rec))}
      />
    </>
  );
}
