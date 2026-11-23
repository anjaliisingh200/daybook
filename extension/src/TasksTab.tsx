import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronsUp, Equal, Plus } from "lucide-react";
import type { Priority } from "@/lib/types";
import type { TaskRow } from "./today";

/** The website's priority marks. */
const PRIORITY = {
  high: { label: "High", Icon: ChevronsUp, color: "var(--prio-high)" },
  medium: { label: "Medium", Icon: Equal, color: "var(--prio-medium)" },
  low: { label: "Low", Icon: ChevronDown, color: "var(--prio-low)" },
} satisfies Record<Priority, { label: string; Icon: typeof Check; color: string }>;

/** The website's square task checkbox. */
function TaskCheck({ checked, label, onChange, small }: { checked: boolean; label: string; onChange: (done: boolean) => void; small?: boolean }) {
  return (
    <span className="tickwrap">
      <button type="button" role="checkbox" aria-checked={checked} aria-label={label} className={small ? "check small" : "check"} onClick={() => onChange(!checked)}>
        <Check strokeWidth={3} />
      </button>
    </span>
  );
}

/**
 * Today's tasks, the way the website's Tasks day view shows them: one white panel of task cards on the grey canvas,
 * with the soft "Add task" button at the bottom. The button opens a field for the new task's name.
 */
export function TasksTab({ rows, onToggle, onAdd }: { rows: TaskRow[]; onToggle: (id: string, done: boolean) => void; onAdd: (title: string) => Promise<boolean> }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) input.current?.focus();
  }, [adding]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text || busy) return;
    setBusy(true);
    if (await onAdd(text)) {
      setTitle("");
      setAdding(false);
    }
    setBusy(false);
  };

  return (
    <div className="scroll">
      <div className="col">
        {rows.length === 0 ? (
          <p className="empty">Nothing planned for today.</p>
        ) : (
          <ul className="cards" aria-label="Tasks for today">
            {rows.map(({ task, subtasks }) => {
              const done = task.status === "completed";
              const p = task.meta.priority ? PRIORITY[task.meta.priority] : null;
              return (
                <li key={task.id} className={done ? "task done" : "task"}>
                  <div className="row">
                    <TaskCheck checked={done} label={done ? `Reopen ${task.title}` : `Complete ${task.title}`} onChange={(d) => onToggle(task.id, d)} />
                    <h2>{task.title}</h2>
                  </div>
                  {subtasks.length > 0 && (
                    <ul className="subs" aria-label={`Subtasks of ${task.title}`}>
                      {subtasks.map((s) => {
                        const subDone = s.status === "completed";
                        return (
                          <li key={s.id} className={subDone ? "sub done" : "sub"}>
                            <TaskCheck small checked={subDone} label={subDone ? `Reopen subtask ${s.title}` : `Complete subtask ${s.title}`} onChange={(d) => onToggle(s.id, d)} />
                            <span>{s.title}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {p && (
                    <div className="meta">
                      <span className="prio" style={{ color: p.color }} title={`${p.label} priority`}>
                        <p.Icon strokeWidth={2.5} />
                        {p.label}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="addrow">
          {adding ? (
            <form className="addform" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && setAdding(false)}>
              <label className="sr-only" htmlFor="new-task">
                New task for today
              </label>
              <input id="new-task" ref={input} className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing today?" autoComplete="off" />
              <button type="submit" className="btn primary wide" disabled={busy || !title.trim()}>
                Add task
              </button>
            </form>
          ) : (
            <button type="button" className="btn soft wide" onClick={() => setAdding(true)} aria-label="Add task for today">
              <Plus />
              Add task
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
