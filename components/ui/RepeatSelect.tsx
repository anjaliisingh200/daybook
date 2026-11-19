"use client";
import { Select } from "@/components/ui/Menu";
import { parseKey } from "@/lib/dates";
import { useFmt } from "@/lib/hooks";
import type { DateKey } from "@/lib/types";

/** Repeat choices, worded from the date they repeat on. Same options as the event editor. */
export function RepeatSelect({ value, onChange, due }: { value: string; onChange: (v: string) => void; due: DateKey | null }) {
  const fmt = useFmt();
  const day = due ? parseKey(due).d : null;
  const options = [
    { value: "none", label: "Does not repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: due ? `Weekly on ${fmt.weekday(due, "long")}` : "Weekly" },
    { value: "weekdays", label: "Every weekday (Mon–Fri)" },
    { value: "monthly", label: day ? `Monthly on day ${day}` : "Monthly" },
    { value: "yearly", label: due ? `Annually on ${fmt.month(due, "long")} ${day}` : "Annually" },
  ];
  return <Select<string> aria-label="Repeat" value={value} onChange={onChange} options={options} />;
}
