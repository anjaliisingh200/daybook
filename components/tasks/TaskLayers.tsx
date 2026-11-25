"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlignLeft, Tag, Trash2, X, Check, Plus } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Drawer, Modal } from "@/components/ui/Modal";
import { Field, Input, TaskCheck, Segmented, Textarea } from "@/components/ui/Controls";
import { Select } from "@/components/ui/Menu";
import { hexOf } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { useFmt, useToday } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import type { DateKey, Priority, Task } from "@/lib/types";
import { PRIORITY_META } from "./TaskCard";
import { DateTimeRow } from "@/components/ui/DateTimeRow";
import { RepeatSelect } from "@/components/ui/RepeatSelect";

export function TaskLayers() {
  return (
    <>
      <QuickAdd />
      <TaskDetails />
      <DeleteTaskConfirm />
    </>
  );
}

// ─────────────────────────────── quick add ───────────────────────────────

function QuickAdd() {
  const qa = useUI((s) => s.quickAdd);
  const close = useUI((s) => s.closeQuickAdd);
  return (
    <Drawer open={!!qa} onClose={close} label="New task">
      {qa && <QuickAddForm key={String(qa.due)} initialDue={qa.due ?? null} initialList={qa.listId} onDone={close} />}
    </Drawer>
  );
}

function QuickAddForm({ initialDue, initialList, onDone }: { initialDue: DateKey | null; initialList?: string; onDone: () => void }) {
  const lists = useData((s) => s.lists);
  const calendars = useData((s) => s.calendars);
  const add = useData((s) => s.addTask);
  const defaultList = usePrefs((p) => p.defaultListId);
  const toast = useUI((s) => s.toast);
  const fmt = useFmt();
  const today = useToday();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  // A new task is due today unless it was opened from a specific day.
  const [due, setDue] = useState<DateKey | null>(initialDue ?? today);
  // The Google Tasks list is chosen automatically (the default list); the user picks a calendar instead.
  const listId = initialList ?? (lists.find((l) => l.id === defaultList)?.id ?? lists[0]?.id ?? "");
  const [calendarId, setCalendarId] = useState(calendars.find((c) => c.primary)?.id ?? calendars[0]?.id ?? "");
  const [completed, setCompleted] = useState(false);
  const [repeat, setRepeat] = useState("none");
  // Time is optional: a new task starts with no time and still saves.
  const [startMin, setStartMin] = useState<number | undefined>(undefined);
  const [endMin, setEndMin] = useState<number | undefined>(undefined);
  const [subs, setSubs] = useState<{ title: string; done: boolean }[]>([]);
  const [subText, setSubText] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const subInputWrap = useRef<HTMLDivElement>(null);
  const [priority, setPriority] = useState<Priority | undefined>();
  const ref = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const t = title.trim();
    if (!t) {
      ref.current?.focus();
      return;
    }
    onDone();
    const created = await add({ title: t, notes: notes.trim(), due, listId, priority, calendarId });
    // The subtasks are saved before the task is made to repeat, so every repeat that is created is copied with them from the start.
    if (created) {
      for (const sub of subs) {
        const made = await add({ title: sub.title, listId, parentId: created.id, due: null, calendarId });
        if (made && sub.done) await useData.getState().updateTask(made.id, { status: "completed" });
      }
    }
    if (created && completed) await useData.getState().updateTask(created.id, { status: "completed" });
    if (created && repeat !== "none") await useData.getState().updateTask(created.id, { repeat });
    if (created && due && startMin !== undefined) await useData.getState().updateTask(created.id, { startMin, endMin: endMin ?? null });
    const cal = calendars.find((c) => c.id === calendarId);
    if (created) toast(`Added to ${cal?.name ?? "tasks"}${due ? ` · ${fmt.dayShort(due)}` : ""}${completed ? " · done" : ""}`);
  };

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-sm font-semibold">New task</span>
        <IconButton label="Close" onClick={onDone}>
          <X className="size-[1.15rem]" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <Field label="Title">
          <Input ref={ref} data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" aria-label="Title" />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-2">
            <AlignLeft className="size-3.5" /> Description
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details…" aria-label="Description" rows={4} className="bg-transparent" />
        </div>

        <DateTimeRow
          due={due}
          relativeLabel
          onDue={setDue}
          startMin={startMin}
          endMin={endMin}
          onTime={(s, e) => {
            setStartMin(s ?? undefined);
            setEndMin(e ?? undefined);
          }}
        />

        <Field label="Repeat">
          <RepeatSelect value={repeat} onChange={setRepeat} due={due} />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-2">
            <Tag className="size-3.5" /> Priority
          </div>
          <Segmented<string>
            label="Priority"
            value={priority ?? "none"}
            onChange={(v) => setPriority(v === "none" ? undefined : (v as Priority))}
            options={[
              { value: "none", label: "None" },
              ...(["low", "medium", "high"] as const).map((p) => {
                const Icon = PRIORITY_META[p].icon;
                return {
                  value: p,
                  label: (
                    <span className="flex items-center gap-1">
                      <Icon className="size-3.5" style={{ color: PRIORITY_META[p].color }} strokeWidth={2.5} />
                      {PRIORITY_META[p].label}
                    </span>
                  ),
                };
              }),
            ]}
          />
        </div>

        <Field label="Calendar">
          <Select aria-label="Calendar" value={calendarId} onChange={setCalendarId} options={calendars.map((c) => ({ value: c.id, label: c.name, swatch: hexOf(c.color) }))} />
        </Field>

        <div>
          <div className="mb-1.5 text-xs font-medium text-text-2">Subtasks</div>
          {!addingSub && (
            <Button type="button" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAddingSub(true)}>
              Add subtask
            </Button>
          )}
          {subs.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {subs.map((sub, idx) => (
                <li key={idx}>
                  <SubtaskRow
                    title={sub.title}
                    done={sub.done}
                    onToggle={() => setSubs(subs.map((x, k) => (k === idx ? { ...x, done: !x.done } : x)))}
                    onSave={(next) => setSubs(subs.map((x, k) => (k === idx ? { ...x, title: next } : x)))}
                    onDelete={() => setSubs(subs.filter((_, k) => k !== idx))}
                  />
                </li>
              ))}
            </ul>
          )}
          {addingSub && (
            <div className="mt-2" ref={subInputWrap}>
              <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-semantic-primary">
              <span aria-hidden className="size-[18px] shrink-0 rounded-[5px] border-2 border-text" />
              <input
                              autoFocus
                              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
                              value={subText}
                              onChange={(e) => setSubText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const t = subText.trim();
                                  if (!t) return setAddingSub(false);
                                  setSubs([...subs, { title: t, done: false }]);
                                  setSubText("");
                                  setTimeout(() => subInputWrap.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);
                                }
                              }}
                              placeholder="Subtask title"
                              aria-label="Subtask title"
                            />
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-border pt-4">
        <div className="flex items-center gap-3">
          <TaskCheck checked={completed} onChange={setCompleted} label="Mark the task as complete" />
          <span className="cursor-pointer text-sm text-text-2" onClick={() => setCompleted((v) => !v)}>
            {completed ? "Task completed" : "Mark the task as complete"}
          </span>
        </div>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || !due}>
          Save
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────── details ───────────────────────────────

function TaskDetails() {
  const id = useUI((s) => s.taskPanelId);
  const open = useUI((s) => s.openTask);
  const task = useData((s) => s.tasks.find((t) => t.id === id));
  // Close if the task disappears (deleted here or remotely)
  useEffect(() => {
    if (id && !task && useData.getState().status === "ready") open(null);
  }, [id, task, open]);
  return (
    <Drawer open={!!id && !!task} onClose={() => open(null)} label="Task details">
      {task && <DetailsBody key={task.id} taskId={task.id} />}
    </Drawer>
  );
}

function DetailsBody({ taskId }: { taskId: string }) {
  const task = useData((s) => s.tasks.find((t) => t.id === taskId))!;
  const calendars = useData((s) => s.calendars);
  const update = useData((s) => s.updateTask);
  const toggle = useData((s) => s.toggleTask);
  const open = useUI((s) => s.openTask);

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, notes, task });
  useEffect(() => {
    latest.current = { title, notes, task };
  });

  const flash = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  };

  const commitTitle = () => {
    const t = latest.current.title.trim();
    if (!t) return setTitle(latest.current.task.title);
    if (t !== latest.current.task.title) {
      void update(taskId, { title: t });
      flash();
    }
  };
  const commitNotes = () => {
    if (latest.current.notes !== latest.current.task.notes) {
      void update(taskId, { notes: latest.current.notes });
      flash();
    }
  };

  // debounce while typing so nothing is lost if the panel is closed quickly
  useEffect(() => {
    const t = setTimeout(() => {
      if (notes !== latest.current.task.notes) commitNotes();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (title.trim() && title.trim() !== latest.current.task.title) commitTitle();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);
  // flush on close
  useEffect(
    () => () => {
      const { title: t, notes: n, task: k } = latest.current;
      const patch: { title?: string; notes?: string } = {};
      if (t.trim() && t.trim() !== k.title) patch.title = t.trim();
      if (n !== k.notes) patch.notes = n;
      if (Object.keys(patch).length) void useData.getState().updateTask(k.id, patch);
    },
    []
  );

  const done = task.status === "completed";

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          Task
          <span className={cn("text-xs font-normal text-text-3 transition-opacity", saved ? "opacity-100" : "opacity-0")} aria-live="polite">
            Saved
          </span>
        </span>
        <div className="flex items-center">
          <IconButton label="Close" onClick={() => open(null)}>
            <X className="size-[1.15rem]" />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5">
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
                (e.target as HTMLElement).blur();
              }
            }}
            aria-label="Title"
          />
        </Field>

        <Field label="Description">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={commitNotes} placeholder="Add details (optional)" aria-label="Description" rows={3} />
        </Field>

        <DateTimeRow
          due={task.due}
          relativeLabel
          onDue={(k) => void update(task.id, { due: k })}
          startMin={task.meta.startMin}
          endMin={task.meta.endMin}
          onTime={(s, e) => void update(task.id, { startMin: s, endMin: e })}
        />

        <Field label="Repeat">
          <RepeatSelect value={task.meta.repeat ?? "none"} onChange={(v) => void update(task.id, { repeat: v })} due={task.due} />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-text-2">
            <Tag className="size-3.5" /> Priority
          </div>
          <Segmented<string>
            label="Priority"
            value={task.meta.priority ?? "none"}
            onChange={(v) => void update(task.id, { priority: v === "none" ? null : (v as Priority) })}
            options={[
              { value: "none", label: "None" },
              ...(["low", "medium", "high"] as const).map((p) => ({
                value: p,
                label: (
                  <span className="flex items-center gap-1">
                    {(() => {
                      const Icon = PRIORITY_META[p].icon;
                      return <Icon className="size-3.5" style={{ color: PRIORITY_META[p].color }} strokeWidth={2.5} />;
                    })()}
                    {PRIORITY_META[p].label}
                  </span>
                ),
              })),
            ]}
          />
        </div>

        <Field label="Calendar">
          <Select
            aria-label="Calendar"
            value={task.meta.calendarId ?? calendars.find((c) => c.primary)?.id ?? calendars[0]?.id ?? ""}
            onChange={(v) => void update(task.id, { calendarId: v })}
            options={calendars.map((c) => ({ value: c.id, label: c.name, swatch: hexOf(c.color) }))}
          />
        </Field>

        <Subtasks parent={task} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border bg-surface-2/40 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button type="button" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 className="size-4" />} onClick={() => useUI.getState().setTaskToDelete(task.id)}>
          Delete
        </Button>
        <Button type="button" variant="primary" icon={done ? <Check className="size-4" /> : undefined} onClick={() => void toggle(task.id)}>
          {done ? "Task completed" : "Mark the task as complete"}
        </Button>
      </div>
    </>
  );
}

// ─────────────────────────────── subtasks ───────────────────────────────

function Subtasks({ parent }: { parent: Task }) {
  const all = useData((s) => s.tasks);
  const subs = useMemo(() => all.filter((t) => t.parentId === parent.id).sort((a, b) => a.position - b.position), [all, parent.id]);
  const addSubtask = useData((s) => s.addSubtask);
  const toggle = useData((s) => s.toggleTask);
  const del = useData((s) => s.deleteTask);
  const update = useData((s) => s.updateTask);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const inputWrap = useRef<HTMLDivElement>(null);
  /** After a subtask is added, keep the new input visible at the bottom of the sheet. */
  const revealInput = () => setTimeout(() => inputWrap.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 60);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    // for the original of a repeating task this also adds it to the coming repeats
    void addSubtask(parent.id, t);
  };

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-text-2">Subtasks</div>
      {subs.length > 0 && (
        <ul className="mt-2 space-y-2">
          {subs.map((sub) => (
            <li key={sub.id}>
              <SubtaskRow
                title={sub.title}
                done={sub.status === "completed"}
                onToggle={() => void toggle(sub.id)}
                onSave={(next) => void update(sub.id, { title: next })}
                onDelete={() => void del(sub.id)}
              />
            </li>
          ))}
        </ul>
      )}
      {adding && (
        <div className="mt-2" ref={inputWrap}>
          <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors focus-within:border-semantic-primary">
          <span aria-hidden className="size-[18px] shrink-0 rounded-[5px] border-2 border-text" />
          <input
                      autoFocus
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!text.trim()) return setAdding(false);
                          submit();
                          revealInput();
                        }
                      }}
                      placeholder="Subtask title"
                      aria-label="Subtask title"
                    />
          </div>
        </div>
      )}
      {!adding && (
        <div className="mt-2">
          <Button type="button" variant="secondary" icon={<Plus className="size-4" />} onClick={() => setAdding(true)}>
            Add subtask
          </Button>
        </div>
      )}
    </div>
  );
}

/** A subtask shown like an input field: click the title to edit, checkbox and × on the right. */
function SubtaskRow({ title, done, onToggle, onSave, onDelete }: { title: string; done: boolean; onToggle: () => void; onSave: (next: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const finish = (save: boolean) => {
    setEditing(false);
    const t = draft.trim();
    if (save && t && t !== title) onSave(t);
  };
  return (
    <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 transition-colors hover:border-border-strong focus-within:border-semantic-primary">
      <TaskCheck checked={done} onChange={() => onToggle()} label={`Complete ${title}`} size={18} />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => finish(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              finish(true);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              finish(false);
            }
          }}
          aria-label="Subtask title"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(title);
            setEditing(true);
          }}
          className={cn("min-w-0 flex-1 truncate text-left text-sm", done && "text-text line-through decoration-text")}
        >
          {title}
        </button>
      )}
      <IconButton label={`Delete ${title}`} size="sm" noTooltip onClick={onDelete}>
        <X className="size-3.5" />
      </IconButton>
    </div>
  );
}

// ─────────────────────────────── time ───────────────────────────────

// ─────────────────────────────── delete ───────────────────────────────

/** Asks before deleting a task. A task with a time also deletes its calendar event, so the message says so. */
function DeleteTaskConfirm() {
  const id = useUI((s) => s.taskToDelete);
  const setId = useUI((s) => s.setTaskToDelete);
  const task = useData((s) => s.tasks.find((t) => t.id === id));
  const repeating = !!task && (!!task.meta.seriesId || (!!task.meta.repeat && task.meta.repeat !== "none"));
  return (
    <Modal open={!!task} onClose={() => setId(null)} title={repeating ? "Delete repeating task" : "Delete task"} size="sm">
      {task && <DeleteBody key={task.id} task={task} repeating={repeating} onClose={() => setId(null)} />}
    </Modal>
  );
}

/**
 * The question inside the delete dialog. A repeating task asks which ones to delete (the same choice the calendar gives
 * for a repeating event), because a repeat that is simply deleted would otherwise be created again.
 */
function DeleteBody({ task, repeating, onClose }: { task: Task; repeating: boolean; onClose: () => void }) {
  const [scope, setScope] = useState<"this" | "all">("this");
  const linked = !!task.meta.eventId;
  const confirm = () => {
    onClose();
    if (useUI.getState().taskPanelId === task.id) useUI.getState().openTask(null);
    void useData.getState().deleteTask(task.id, scope);
  };
  return (
    <>
      {repeating ? (
        <div className="space-y-1 p-5" role="radiogroup" aria-label="Which tasks to delete">
          <p className="mb-2 text-sm text-text-2">
            <span className="font-medium text-text">{task.title}</span> repeats. Which ones do you want to delete?
          </p>
          {(
            [
              ["this", "Only this task"],
              ["all", "All tasks in the series"],
            ] as ["this" | "all", string][]
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
      ) : (
        <p className="p-5 text-sm text-text-2">
          {linked
            ? <>Deleting <span className="font-medium text-text">{task.title}</span> will also delete its event on the calendar.</>
            : <>Deleting <span className="font-medium text-text">{task.title}</span> removes it from your tasks.</>}
        </p>
      )}
      <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" variant="danger" onClick={confirm}>
          Delete
        </Button>
      </div>
    </>
  );
}
