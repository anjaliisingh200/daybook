import { useEffect, useRef, useState } from "react";
import { AlignLeft, Check, ChevronDown, ChevronsUp, Equal, Plus, Tag, Trash2 } from "lucide-react";
import type { Priority, Task } from "@/lib/types";
import { todayKey } from "@/lib/dates";
import { describeRepeat } from "@/lib/recurrence";
import { Field, Segmented, Sheet } from "./controls";
import { SITE, TZ, fmt } from "./common";
import type { TaskEdit } from "./data";

const PRIORITY = {
  high: { label: "High", Icon: ChevronsUp, color: "var(--prio-high)" },
  medium: { label: "Medium", Icon: Equal, color: "var(--prio-medium)" },
  low: { label: "Low", Icon: ChevronDown, color: "var(--prio-low)" },
} satisfies Record<Priority, { label: string; Icon: typeof Check; color: string }>;

export interface TaskSheetProps {
  task: Task;
  subtasks: Task[];
  onClose: () => void;
  onEdit: (patch: TaskEdit) => void;
  onToggle: (id: string, done: boolean) => void;
  onAddSub: (title: string) => Promise<boolean>;
  onDelete: () => Promise<void>;
}

/** The website's task details sheet. Title, description, priority, subtasks, delete and "mark as complete" are edited here. */
export function TaskSheet({ task, subtasks, onClose, onEdit, onToggle, onAddSub, onDelete }: TaskSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [saved, setSaved] = useState(false);
  const [subText, setSubText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, notes, task, onEdit });
  useEffect(() => {
    latest.current = { title, notes, task, onEdit };
  });

  const flash = () => {
    setSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1400);
  };
  const commit = () => {
    const { title: t, notes: n, task: k, onEdit: edit } = latest.current;
    const patch: TaskEdit = {};
    if (t.trim() && t.trim() !== k.title) patch.title = t.trim();
    if (n !== k.notes) patch.notes = n;
    if (Object.keys(patch).length) {
      edit(patch);
      flash();
    }
  };

  // save a moment after typing stops, and always when the sheet closes
  useEffect(() => {
    const t = setTimeout(commit, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, notes]);
  useEffect(
    () => () => {
      const { title: t, notes: n, task: k, onEdit: edit } = latest.current;
      const patch: TaskEdit = {};
      if (t.trim() && t.trim() !== k.title) patch.title = t.trim();
      if (n !== k.notes) patch.notes = n;
      if (Object.keys(patch).length) edit(patch);
    },
    []
  );

  const done = task.status === "completed";
  const when = task.due ? fmt.relative(task.due, todayKey(TZ)) : "";
  const time = task.meta.startMin !== undefined ? `${fmt.minutes(task.meta.startMin)}${task.meta.endMin !== undefined ? ` – ${fmt.minutes(task.meta.endMin)}` : ""}` : null;
  const repeats = task.meta.repeat && task.meta.repeat !== "none" && task.due ? describeRepeat(task.meta.repeat, task.due, fmt) : null;

  const addSub = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = subText.trim();
    if (!text) return;
    if (await onAddSub(text)) setSubText("");
  };

  return (
    <Sheet
      label="Task details"
      title="Task"
      onClose={onClose}
      status={<span className={saved ? "saved on" : "saved"} aria-live="polite">Saved</span>}
      footer={
        confirming ? (
          <>
            <span className="confirm">Delete this task{subtasks.length ? " and its subtasks" : ""}?</span>
            <span className="foot-actions">
              <button type="button" className="btn secondary" onClick={() => setConfirming(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await onDelete();
                  setBusy(false);
                }}
              >
                Delete
              </button>
            </span>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost danger" onClick={() => setConfirming(true)}>
              <Trash2 />
              Delete
            </button>
            <button type="button" className="btn primary" onClick={() => onToggle(task.id, !done)}>
              {done && <Check />}
              {done ? "Task completed" : "Mark the task as complete"}
            </button>
          </>
        )
      }
    >
      <Field label="Title">
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
              (e.target as HTMLElement).blur();
            }
          }}
          aria-label="Title"
        />
      </Field>

      <div>
        <div className="mini-label">
          <AlignLeft /> Description
        </div>
        <textarea className="input textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={commit} placeholder="Add details (optional)" aria-label="Description" rows={3} />
      </div>

      <div>
        <div className="mini-label">
          <Tag /> Priority
        </div>
        <Segmented<string>
          label="Priority"
          value={task.meta.priority ?? "none"}
          onChange={(v) => onEdit({ priority: v === "none" ? null : (v as Priority) })}
          options={[
            { value: "none", label: "None" },
            ...(["low", "medium", "high"] as const).map((p) => {
              const { Icon, color, label } = PRIORITY[p];
              return {
                value: p as string,
                label: (
                  <>
                    <Icon style={{ color }} strokeWidth={2.5} />
                    {label}
                  </>
                ),
              };
            }),
          ]}
        />
      </div>

      <div className="facts">
        {task.due && (
          <div>
            <span>Date</span>
            <b>{when}</b>
          </div>
        )}
        {time && (
          <div>
            <span>Time</span>
            <b className="tnum">{time}</b>
          </div>
        )}
        {repeats && (
          <div>
            <span>Repeat</span>
            <b>{repeats}</b>
          </div>
        )}
        <p>
          To change the date, time or repeat, <a href={SITE} target="_blank" rel="noreferrer">open Daybook</a>.
        </p>
      </div>

      <div>
        <div className="mini-label">Subtasks</div>
        {subtasks.length > 0 && (
          <ul className="sublist" aria-label={`Subtasks of ${task.title}`}>
            {subtasks.map((s) => {
              const subDone = s.status === "completed";
              return (
                <li key={s.id} className={subDone ? "done" : ""}>
                  <span className="tickwrap">
                    <button type="button" role="checkbox" aria-checked={subDone} aria-label={subDone ? `Reopen subtask ${s.title}` : `Complete subtask ${s.title}`} className="check small" onClick={() => onToggle(s.id, !subDone)}>
                      <Check strokeWidth={3} />
                    </button>
                  </span>
                  <span className="sub-title">{s.title}</span>
                </li>
              );
            })}
          </ul>
        )}
        <form className="subadd" onSubmit={addSub}>
          <input className="input" value={subText} onChange={(e) => setSubText(e.target.value)} placeholder="Add a subtask" aria-label="Add a subtask" autoComplete="off" />
          <button type="submit" className="btn secondary icon-only" aria-label="Add subtask" disabled={!subText.trim()}>
            <Plus />
          </button>
        </form>
      </div>
    </Sheet>
  );
}

