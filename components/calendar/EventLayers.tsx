"use client";
import { useEffect, useMemo, useState } from "react";
import { AlignLeft, CalendarDays, Clock, MapPin, Pencil, Trash2, Users, Video, X, Lock } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Drawer, Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { Select } from "@/components/ui/Menu";
import { Field, Input, Segmented, Textarea } from "@/components/ui/Controls";
import { DateTimeRow } from "@/components/ui/DateTimeRow";
import { cn } from "@/lib/cn";
import { useCalendarViews, useFmt, useIsMobile, useTz } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { useUI, type EventDraft } from "@/lib/store/ui";
import { deleteInstance, draftFromInstance, saveDraft, type Scope } from "@/lib/store/eventActions";
import { diffDays, dowOf, parseKey } from "@/lib/dates";
import { describeRecurrence, recurrenceFromPreset, type RepeatPreset } from "@/lib/recurrence";
import { CustomRepeatDialog } from "@/components/ui/CustomRepeat";
import type { EventInstance } from "@/lib/types";

/** Stands in for "Custom…" in the Repeat menu. It is never saved. */
const NEW_CUSTOM = "__custom" as RepeatPreset;

export function EventLayers() {
  const mobile = useIsMobile();
  const popover = useUI((s) => s.eventPopover);
  const closePopover = useUI((s) => s.closeEventPopover);
  const quick = useUI((s) => s.quickCreate);
  const editor = useUI((s) => s.eventEditor);
  const openEditor = useUI((s) => s.openEventEditor);
  const closeQuick = useUI((s) => s.closeQuickCreate);
  const tz = useTz();
  const [ask, setAsk] = useState<null | { kind: "delete"; inst: EventInstance } | { kind: "save"; draft: EventDraft }>(null);

  // On phones a tap-to-create goes straight to the full editor.
  useEffect(() => {
    if (mobile && quick) {
      openEditor(quick.draft);
      closeQuick();
    }
  }, [mobile, quick, openEditor, closeQuick]);

  return (
    <>
      {popover &&
        (mobile ? (
          <Modal open onClose={closePopover} size="sm" hideClose>
            <EventDetails inst={popover.instance} onClose={closePopover} onDelete={(i) => handleDelete(i, setAsk)} />
          </Modal>
        ) : (
          <Popover open onClose={closePopover} anchor={popover.rect} placement="right-start" className="w-[22rem]" label={popover.instance.title}>
            <EventDetails inst={popover.instance} onClose={closePopover} onDelete={(i) => handleDelete(i, setAsk)} />
          </Popover>
        ))}

      {quick && !mobile && (
        <Popover open onClose={closeQuick} anchor={quick.rect} placement="right-start" className="w-[22rem]" label="New event">
          <QuickCreate key={`${quick.draft.startDate}-${quick.draft.startMin}`} draft={quick.draft} />
        </Popover>
      )}

      <EventEditor
        draft={editor}
        onSave={(d) => {
          if (d.id && d.isRecurring) setAsk({ kind: "save", draft: d });
          else {
            void saveDraft(d, tz);
            useUI.getState().closeEventEditor();
          }
        }}
        onDelete={(inst) => handleDelete(inst, setAsk)}
      />

      <ScopeDialog
        ask={ask}
        onCancel={() => setAsk(null)}
        onConfirm={(scope) => {
          if (!ask) return;
          if (ask.kind === "delete") {
            void deleteInstance(ask.inst, scope);
            useUI.getState().closeEventEditor();
          } else {
            void saveDraft(ask.draft, tz, scope);
            useUI.getState().closeEventEditor();
          }
          setAsk(null);
        }}
      />
    </>
  );
}

function handleDelete(inst: EventInstance, setAsk: (a: { kind: "delete"; inst: EventInstance }) => void) {
  // Every event has a task: deleting the event asks first and then deletes the task (and so the event).
  if (inst.event.taskId) {
    useUI.getState().closeEventPopover();
    useUI.getState().closeEventEditor();
    useUI.getState().setTaskToDelete(inst.event.taskId);
    return;
  }
  useUI.getState().closeEventPopover();
  if (inst.isRecurring && inst.event.recurrence) setAsk({ kind: "delete", inst });
  else {
    void deleteInstance(inst, "all");
    useUI.getState().closeEventEditor();
  }
}

// ───────────────────────────── details ─────────────────────────────

function EventDetails({ inst, onClose, onDelete }: { inst: EventInstance; onClose: () => void; onDelete: (i: EventInstance) => void }) {
  const fmt = useFmt();
  const tz = useTz();
  const cals = useCalendarViews();
  const openEditor = useUI((s) => s.openEventEditor);
  const cal = cals.find((c) => c.id === inst.calendarId);
  const ev = inst.event;
  const readOnly = !!cal?.readOnly;
  const when = (() => {
    if (inst.allDay) return inst.startDate === inst.endDate ? fmt.dayLong(inst.startDate) : `${fmt.dayShort(inst.startDate)} – ${fmt.dayShort(inst.endDate)}`;
    if (inst.startDate === inst.endDate) return fmt.dayLong(inst.startDate);
    return `${fmt.dayShort(inst.startDate)}, ${fmt.time(inst.start)} – ${fmt.dayShort(inst.endDate)}, ${fmt.time(inst.end)}`;
  })();

  return (
    <div className="p-4 pt-3">
      <div className="mb-2 flex items-center justify-end gap-0.5">
        {readOnly ? (
          <span className="mr-auto flex items-center gap-1.5 text-xs text-text-3">
            <Lock className="size-3" /> Read-only calendar
          </span>
        ) : (
          <>
            <IconButton label="Edit event" onClick={() => openEditor(draftFromInstance(inst, tz))}>
              <Pencil className="size-4" />
            </IconButton>
            <IconButton label="Delete event" onClick={() => onDelete(inst)}>
              <Trash2 className="size-4" />
            </IconButton>
          </>
        )}
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[1.2rem] font-semibold leading-snug">{inst.title}</h3>
          <p className="tnum mt-1 text-sm text-text-2">
            {when}
            {!inst.allDay && inst.startDate === inst.endDate && (
              <>
                <span className="mx-1.5 text-text-3">·</span>
                {fmt.timeRange(inst.start, inst.end)}
              </>
            )}
          </p>
          {ev.recurrence && <p className="mt-0.5 text-xs text-text-3">{describeRecurrence(ev.recurrence, inst.seriesDate, fmt)}</p>}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {ev.meetLink && (
          <Row icon={<Video className="size-4" />}>
            <a href={ev.meetLink} target="_blank" rel="noreferrer" className="font-medium text-accent underline underline-offset-2">
              Join video call
            </a>
          </Row>
        )}
        {ev.location && <Row icon={<MapPin className="size-4" />}>{ev.location}</Row>}
        {ev.guests && ev.guests.length > 0 && <Row icon={<Users className="size-4" />}>{ev.guests.join(", ")}</Row>}
        {ev.description && (
          <Row icon={<AlignLeft className="size-4" />}>
            <span className="whitespace-pre-wrap text-text-2">{ev.description}</span>
          </Row>
        )}
        <Row icon={<CalendarDays className="size-4" />}>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: cal?.hex }} />
            {cal?.name}
          </span>
        </Row>
      </div>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-text-3">{icon}</span>
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}

// ───────────────────────────── quick create ─────────────────────────────

function QuickCreate({ draft }: { draft: EventDraft }) {
  const fmt = useFmt();
  const tz = useTz();
  const cals = useCalendarViews().filter((c) => !c.readOnly);
  const [d, setD] = useState(draft);
  const closeQuick = useUI((s) => s.closeQuickCreate);
  const openEditor = useUI((s) => s.openEventEditor);

  const save = () => {
    closeQuick();
    void saveDraft(d, tz);
  };
  const summary = d.allDay ? fmt.dayLong(d.startDate) : `${fmt.dayShort(d.startDate)} · ${fmt.minutes(d.startMin)} – ${fmt.minutes(d.endMin)}`;

  return (
    <div className="p-4">
      <div className="mb-3 flex justify-end">
        <IconButton label="Close" size="sm" onClick={closeQuick}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="mb-3">
        <Input
          autoFocus
          value={d.title}
          onChange={(e) => {
            const title = e.target.value;
            setD({ ...d, title });
            // mirror the title onto the placeholder block in the grid
            useUI.setState((s) => (s.quickCreate ? { quickCreate: { ...s.quickCreate, draft: { ...s.quickCreate.draft, title } } } : s));
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Add title"
          aria-label="Event title"
        />
      </div>
      <div className="mb-3 flex items-center gap-2.5 text-sm text-text-2">
        <Clock className="size-4 shrink-0 text-text-3" />
        <span className="tnum">{summary}</span>
      </div>
      {!d.allDay && (
        <div className="mb-4">
          <Segmented<number>
            size="sm"
            label="Duration"
            value={d.endMin - d.startMin}
            onChange={(dur) => setD({ ...d, endMin: Math.min(d.startMin + dur, 1439) })}
            options={[
              { value: 15, label: "15 min" },
              { value: 30, label: "30 min" },
              { value: 45, label: "45 min" },
              { value: 60, label: "1 hr" },
            ]}
          />
        </div>
      )}
      <div className="mb-4">
        <Select
          aria-label="Calendar"
          value={d.calendarId}
          onChange={(v) => setD({ ...d, calendarId: v })}
          options={cals.map((c) => ({ value: c.id, label: c.name, swatch: c.hex }))}
        />
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => openEditor(d)}>
          More options
        </Button>
        <Button variant="primary" size="sm" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────────── full editor ─────────────────────────────

function abs(date: string, min: number) {
  return diffDays("2000-01-01", date) * 1440 + min;
}

function EventEditor({ draft, onSave, onDelete }: { draft: EventDraft | null; onSave: (d: EventDraft) => void; onDelete: (i: EventInstance) => void }) {
  const close = useUI((s) => s.closeEventEditor);
  return (
    <Drawer open={!!draft} onClose={close} label={draft?.id ? "Edit event" : "New event"}>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">{draft?.id ? "Edit event" : "New event"}</span>
        <IconButton label="Close" onClick={close}>
          <X className="size-[1.15rem]" />
        </IconButton>
      </div>
      {draft && <EditorForm key={`${draft.id ?? "new"}-${draft.seriesDate ?? ""}`} initial={draft} onSave={onSave} onDelete={onDelete} onCancel={close} />}
    </Drawer>
  );
}

function EditorForm({ initial, onSave, onDelete, onCancel }: { initial: EventDraft; onSave: (d: EventDraft) => void; onDelete: (i: EventInstance) => void; onCancel: () => void }) {
  const [d, setD] = useState<EventDraft>(initial);
  const [customRepeat, setCustomRepeat] = useState(false);
  const fmt = useFmt();
  const cals = useCalendarViews().filter((c) => !c.readOnly);
  const events = useInstancesFor(initial);
  const patch = (p: Partial<EventDraft>) => setD((x) => ({ ...x, ...p }));

  // Events live on one day: the end is always the same day as the start.
  const moveStart = (date: string, min: number) => {
    const dur = Math.max(abs(d.endDate, d.endMin) - abs(d.startDate, d.startMin), 15);
    patch({ startDate: date, startMin: min, endDate: date, endMin: Math.min(min + dur, 1439) });
  };

  const startDow = dowOf(d.startDate);
  const longDow = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][startDow];
  const repeatOptions: { value: RepeatPreset; label: string }[] = [
    { value: "none", label: "Does not repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: `Weekly on ${longDow}` },
    { value: "weekdays", label: "Every weekday (Mon–Fri)" },
    { value: "monthly", label: `Monthly on day ${parseKey(d.startDate).d}` },
    { value: "yearly", label: `Annually on ${fmt.month(d.startDate, "long")} ${parseKey(d.startDate).d}` },
  ];
  if (d.repeat === "custom") repeatOptions.push({ value: "custom", label: describeRecurrence(d.recurrence, d.startDate, fmt) });
  // not a real preset: picking it opens the custom repeat dialog (every N days / weeks / months / years, on chosen days)
  repeatOptions.push({ value: NEW_CUSTOM, label: "Custom…" });

  const canSave = d.title.trim().length > 0 || true;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) onSave({ ...d, recurrence: d.repeat === "custom" ? d.recurrence : recurrenceFromPreset(d.repeat, d.startDate) });
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <Field label="Title">
          <Input data-autofocus value={d.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Add title" aria-label="Event title" />
        </Field>

        <Field label="Description">
          <Textarea value={d.description} onChange={(e) => patch({ description: e.target.value })} placeholder="Add description" aria-label="Description" rows={3} />
        </Field>

        <DateTimeRow
          due={d.startDate}
          onDue={(k) => k && moveStart(k, d.startMin)}
          startMin={d.allDay ? undefined : d.startMin}
          endMin={d.allDay ? undefined : d.endMin}
          onTime={(st, en) => {
            if (st !== null && en !== null) patch({ startMin: st, endMin: en, endDate: d.startDate });
          }}
        />

        <Field label="Repeat">
          <Select<RepeatPreset> aria-label="Repeat" value={d.repeat} onChange={(v) => (v === NEW_CUSTOM ? setCustomRepeat(true) : patch({ repeat: v }))} options={repeatOptions} />
          <CustomRepeatDialog
            open={customRepeat}
            onClose={() => setCustomRepeat(false)}
            startKey={d.startDate}
            initial={d.repeat === "custom" ? d.recurrence : recurrenceFromPreset(d.repeat, d.startDate)}
            onDone={(rec) => patch({ repeat: "custom", recurrence: rec })}
          />
        </Field>

        <Field label="Calendar">
          <Select aria-label="Calendar" value={d.calendarId} onChange={(v) => patch({ calendarId: v })} options={cals.map((c) => ({ value: c.id, label: c.name, swatch: c.hex }))} />
        </Field>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {d.id && events ? (
          <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="size-4" />} onClick={() => onDelete(events)}>
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Rebuild an instance reference for deleting from inside the editor. */
function useInstancesFor(d: EventDraft): EventInstance | null {
  const all = useData((s) => s.events);
  return useMemo(() => {
    if (!d.id) return null;
    const ev = all.find((e) => e.id === d.id);
    if (!ev) return null;
    return {
      key: `${ev.id}@${d.seriesDate}`,
      event: ev,
      calendarId: ev.calendarId,
      title: ev.title,
      allDay: ev.allDay,
      start: ev.start,
      end: ev.end,
      startDate: d.startDate,
      endDate: d.endDate,
      seriesDate: d.seriesDate ?? d.startDate,
      isRecurring: !!ev.recurrence,
    } as EventInstance;
  }, [all, d.id, d.seriesDate, d.startDate, d.endDate]);
}

// ───────────────────────────── recurring scope ─────────────────────────────

function ScopeDialog({ ask, onCancel, onConfirm }: { ask: null | { kind: "delete" | "save" }; onCancel: () => void; onConfirm: (s: Scope) => void }) {
  const del = ask?.kind === "delete";
  return (
    <Modal open={!!ask} onClose={onCancel} title={del ? "Delete repeating event" : "Edit repeating event"} size="sm">
      <ScopeForm del={!!del} onCancel={onCancel} onConfirm={onConfirm} />
    </Modal>
  );
}

function ScopeForm({ del, onCancel, onConfirm }: { del: boolean; onCancel: () => void; onConfirm: (s: Scope) => void }) {
  const [scope, setScope] = useState<Scope>("this");
  return (
    <>
      <div className="space-y-1 p-5" role="radiogroup">
        {(
          [
            ["this", "This event"],
            ["all", "All events"],
          ] as [Scope, string][]
        ).map(([v, l]) => (
          <button
            key={v}
            role="radio"
            aria-checked={scope === v}
            type="button"
            onClick={() => setScope(v)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-surface-2"
          >
            <span className={cn("flex size-[18px] items-center justify-center rounded-full border-2", scope === v ? "border-accent" : "border-border-strong")}>
              {scope === v && <span className="size-2 rounded-full bg-accent" />}
            </span>
            {l}
          </button>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={del ? "danger" : "primary"} onClick={() => onConfirm(scope)}>
          {del ? "Delete" : "OK"}
        </Button>
      </div>
    </>
  );
}
