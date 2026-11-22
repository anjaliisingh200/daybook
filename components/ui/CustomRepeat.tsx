"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/Controls";
import { DateField } from "@/components/ui/DatePicker";
import { Select } from "@/components/ui/Menu";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { addMonths, dowOf } from "@/lib/dates";
import { useFmt } from "@/lib/hooks";
import { describeRecurrence } from "@/lib/recurrence";
import type { DateKey, Freq, Recurrence } from "@/lib/types";

const DAYS = [
  { dow: 0, letter: "S", name: "Sunday" },
  { dow: 1, letter: "M", name: "Monday" },
  { dow: 2, letter: "T", name: "Tuesday" },
  { dow: 3, letter: "W", name: "Wednesday" },
  { dow: 4, letter: "T", name: "Thursday" },
  { dow: 5, letter: "F", name: "Friday" },
  { dow: 6, letter: "S", name: "Saturday" },
];

/**
 * "Custom repeat", like Google Tasks: repeat every N days, weeks, months or years;
 * for weeks, on which days (every Sunday, Wednesday and Friday); and when it ends.
 * It produces an ordinary recurrence rule, used by tasks and events alike.
 */
export function CustomRepeatDialog({ open, onClose, startKey, initial, onDone }: { open: boolean; onClose: () => void; startKey: DateKey; initial?: Recurrence; onDone: (rec: Recurrence) => void }) {
  // Remounting on open starts every field from the current rule.
  return (
    <Modal open={open} onClose={onClose} title="Custom repeat" size="sm">
      {open && <Body startKey={startKey} initial={initial} onClose={onClose} onDone={onDone} />}
    </Modal>
  );
}

function Body({ startKey, initial, onClose, onDone }: { startKey: DateKey; initial?: Recurrence; onClose: () => void; onDone: (rec: Recurrence) => void }) {
  const fmt = useFmt();
  const [every, setEvery] = useState(String(initial?.interval ?? 1));
  const [freq, setFreq] = useState<Freq>(initial?.freq ?? "weekly");
  const [days, setDays] = useState<number[]>(initial?.byDay?.length ? initial.byDay : [dowOf(startKey)]);
  const [ends, setEnds] = useState<"never" | "on">(initial?.until ? "on" : "never");
  const [until, setUntil] = useState<DateKey>(initial?.until ?? addMonths(startKey, 3));

  const n = Math.min(99, Math.max(1, Math.floor(Number(every)) || 1));
  const plural = n !== 1;
  const rec: Recurrence = { freq, interval: n, ...(freq === "weekly" ? { byDay: [...days].sort((a, b) => a - b) } : {}), ...(ends === "on" ? { until } : {}) };
  const problem = freq === "weekly" && days.length === 0 ? "Pick at least one day." : ends === "on" && until < startKey ? "The end date is before the first day." : "";

  const toggle = (dow: number) => setDays((d) => (d.includes(dow) ? d.filter((x) => x !== dow) : [...d, dow]));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // This dialog sits inside the task or event form; without this, Done would also submit that form.
        e.stopPropagation();
        if (!problem) {
          onDone(rec);
          onClose();
        }
      }}
    >
      <div className="space-y-5 p-5">
        <div>
          <div className="mb-1.5 text-xs font-medium text-text-2">Repeat every</div>
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0">
              <Input data-autofocus type="number" inputMode="numeric" min={1} max={99} value={every} onChange={(e) => setEvery(e.target.value)} onBlur={() => setEvery(String(n))} aria-label="Repeat every" />
            </div>
            <div className="min-w-0 flex-1">
              <Select<Freq>
                aria-label="Repeat unit"
                value={freq}
                onChange={setFreq}
                options={[
                  { value: "daily", label: plural ? "days" : "day" },
                  { value: "weekly", label: plural ? "weeks" : "week" },
                  { value: "monthly", label: plural ? "months" : "month" },
                  { value: "yearly", label: plural ? "years" : "year" },
                ]}
              />
            </div>
          </div>
        </div>

        {freq === "weekly" && (
          <div>
            <div className="mb-1.5 text-xs font-medium text-text-2">Repeat on</div>
            <div className="flex justify-between gap-1" role="group" aria-label="Repeat on">
              {DAYS.map((d) => {
                const on = days.includes(d.dow);
                return (
                  <button
                    key={d.dow}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.name}
                    onClick={() => toggle(d.dow)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      on ? "bg-semantic-primary text-semantic-on-primary" : "bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text"
                    )}
                  >
                    {d.letter}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="mb-1.5 text-xs font-medium text-text-2">Ends</div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<"never" | "on"> label="Ends" value={ends} onChange={setEnds} options={[{ value: "never", label: "Never" }, { value: "on", label: "On a date" }]} />
            {ends === "on" && <DateField value={until} onChange={(k) => k && setUntil(k)} aria-label="Repeat until" />}
          </div>
        </div>

        <p className="text-sm text-text-2" aria-live="polite">
          {problem ? <span className="text-danger">{problem}</span> : describeRecurrence(rec, startKey, fmt)}
        </p>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!!problem}>
          Done
        </Button>
      </div>
    </form>
  );
}
