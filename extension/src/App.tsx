import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Cloud, ExternalLink, LogOut } from "lucide-react";
import type { Task } from "@/lib/types";
import { todayKey } from "@/lib/dates";
import { backend } from "./backend";
import { CalendarTab } from "./CalendarTab";
import { Brand, SITE, TZ, fmt, useNow } from "./common";
import { EventSheet } from "./EventSheet";
import type { Account, DayData, NewEvent, TaskEdit } from "./data";
import { SignedOutError } from "./errors";
import { Login } from "./Login";
import { TaskSheet } from "./TaskSheet";
import { TasksTab } from "./TasksTab";
import { todaysEvents, todaysTasks } from "./today";

type Tab = "tasks" | "calendar";
type Sheet = { kind: "task"; id: string } | { kind: "event"; startMin: number } | null;

/** The website refuses to change Google events for now, so the panel says the same. */
const GOOGLE_READ_ONLY = "Google is connected read-only for now. Editing arrives in the next update.";

const savedTab = (): Tab => {
  try {
    return localStorage.getItem("daybook.tab") === "calendar" ? "calendar" : "tasks";
  } catch {
    return "tasks";
  }
};

/** The account button and its menu, like the website's. */
function AccountMenu({ account, onSignOut }: { account: Account; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="who" ref={ref}>
      <button className="avatar" aria-label="Account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {(account.email[0] ?? "A").toUpperCase()}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-label">Account</div>
          <div className="menu-item" role="menuitem" style={{ cursor: "default" }}>
            <Cloud />
            <span>{account.email}</span>
          </div>
          <div className="menu-sep" />
          <a className="menu-item" role="menuitem" href={SITE} target="_blank" rel="noreferrer">
            <ExternalLink />
            <span>Open Daybook</span>
          </a>
          <button className="menu-item" role="menuitem" onClick={onSignOut}>
            <LogOut />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [data, setData] = useState<DayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(savedTab);
  const [sheet, setSheet] = useState<Sheet>(null);
  const now = useNow(30_000);
  const today = todayKey(TZ, now);

  useEffect(() => {
    void backend.currentAccount().then(setAccount);
  }, []);

  const signedOut = useCallback(() => {
    setAccount(null);
    setData(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setData(await backend.loadAll());
      setError(null);
    } catch (e) {
      if (e instanceof SignedOutError) return signedOut();
      setError(e instanceof Error ? e.message : "Couldn't load your data.");
    }
  }, [signedOut]);

  // load when signed in, then keep fresh: every two minutes, and whenever the panel comes back into view
  useEffect(() => {
    if (!account) return;
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => document.visibilityState === "visible" && void refresh(), 120_000);
    const wake = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, [account, refresh]);

  const pick = (t: Tab) => {
    setTab(t);
    try {
      localStorage.setItem("daybook.tab", t);
    } catch {
      /* the choice just isn't remembered */
    }
  };

  const rows = useMemo(() => (data ? todaysTasks(data.tasks, today) : []), [data, today]);
  const instances = useMemo(() => (data ? todaysEvents(data.events, today, TZ) : []), [data, today]);

  /** Optimistic: the tick shows at once, and is undone with a message if saving fails. */
  const toggle = async (id: string, done: boolean) => {
    setProblem(null);
    const patch = (fn: (t: Task) => Task) => setData((d) => (d ? { ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) } : d));
    patch((t) => ({ ...t, status: done ? "completed" : "needsAction", completedAt: done ? Date.now() : null }));
    try {
      const saved = await backend.setDone(id, done);
      patch(() => saved);
    } catch (e) {
      if (e instanceof SignedOutError) return signedOut();
      patch((t) => ({ ...t, status: done ? "needsAction" : "completed" }));
      setProblem("Couldn't save that change. It was undone.");
    }
  };

  const add = async (title: string): Promise<boolean> => {
    if (!data) return false;
    setProblem(null);
    try {
      const { task, list } = await backend.addTask(title, today, data.lists, data.tasks);
      setData((d) => (d ? { ...d, tasks: [...d.tasks, task], lists: list ? [...d.lists, list] : d.lists } : d));
      return true;
    } catch (e) {
      if (e instanceof SignedOutError) {
        signedOut();
        return false;
      }
      setProblem("Couldn't create the task. Nothing was saved.");
      return false;
    }
  };

  /** Optimistic edit of a task's title, description or priority: shown at once, undone with a message if saving fails. */
  const edit = async (id: string, patch: TaskEdit) => {
    const before = data?.tasks.find((t) => t.id === id);
    if (!before) return;
    setProblem(null);
    const apply = (fn: (t: Task) => Task) => setData((d) => (d ? { ...d, tasks: d.tasks.map((t) => (t.id === id ? fn(t) : t)) } : d));
    apply((t) => {
      const meta = { ...t.meta };
      if (patch.priority !== undefined) {
        if (patch.priority === null) delete meta.priority;
        else meta.priority = patch.priority;
      }
      return { ...t, ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.notes !== undefined ? { notes: patch.notes } : {}), meta };
    });
    try {
      const saved = await backend.updateTask(id, patch);
      apply(() => saved);
    } catch (e) {
      if (e instanceof SignedOutError) return signedOut();
      apply(() => before);
      setProblem("Couldn't save that change. It was undone.");
    }
  };

  const addSub = async (parentId: string, title: string): Promise<boolean> => {
    const parent = data?.tasks.find((t) => t.id === parentId);
    if (!data || !parent) return false;
    setProblem(null);
    try {
      const sub = await backend.addSubtask(parent, title, data.tasks);
      setData((d) => (d ? { ...d, tasks: [...d.tasks, sub] } : d));
      return true;
    } catch (e) {
      if (e instanceof SignedOutError) {
        signedOut();
        return false;
      }
      setProblem("Couldn't add the subtask. Nothing was saved.");
      return false;
    }
  };

  const remove = async (id: string): Promise<void> => {
    const task = data?.tasks.find((t) => t.id === id);
    if (!data || !task) return;
    const subs = data.tasks.filter((t) => t.parentId === id);
    setProblem(null);
    try {
      await backend.deleteTask(task, subs);
      const gone = new Set([id, ...subs.map((s) => s.id)]);
      setData((d) => (d ? { ...d, tasks: d.tasks.filter((t) => !gone.has(t.id)), events: task.meta.eventId ? d.events.filter((e) => e.id !== task.meta.eventId) : d.events } : d));
      setSheet(null);
    } catch (e) {
      if (e instanceof SignedOutError) return signedOut();
      setProblem("Couldn't delete the task.");
    }
  };

  const createEvent = async (input: NewEvent): Promise<boolean> => {
    if (!data) return false;
    setProblem(null);
    try {
      const { event, task, list } = await backend.addEvent(input, data.lists, data.tasks);
      setData((d) => (d ? { ...d, events: [...d.events, event], tasks: [...d.tasks, task], lists: list ? [...d.lists, list] : d.lists } : d));
      setSheet(null);
      return true;
    } catch (e) {
      if (e instanceof SignedOutError) {
        signedOut();
        return false;
      }
      setProblem("Couldn't create the event. Nothing was saved.");
      return false;
    }
  };

  const logOut = async () => {
    await backend.signOut();
    signedOut();
  };

  if (account === undefined) return <div className="app"><div className="boot">Loading…</div></div>;
  if (account === null) return <Login onSignedIn={setAccount} />;

  const calendarNotice = data?.needsReconnect ? (
    <p className="notice">
      Google needs to be connected again. <a href={SITE} target="_blank" rel="noreferrer">Open Daybook to reconnect</a>.
    </p>
  ) : null;

  return (
    <div className="app">
      <header className="header">
        <Brand />
        <AccountMenu account={account} onSignOut={logOut} />
      </header>

      <nav className="tabs" aria-label="Primary">
        <ul role="tablist">
          {(
            [
              { id: "tasks", label: "Tasks", Icon: CheckCircle2 },
              { id: "calendar", label: "Calendar", Icon: CalendarDays },
            ] as const
          ).map(({ id, label, Icon }) => (
            <li key={id} role="presentation">
              <button role="tab" className="tab" aria-selected={tab === id} onClick={() => pick(id)}>
                <Icon />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="dateRow">
        <h1>{fmt.dayLong(today)}</h1>
      </div>

      <div className="canvas">
        {error && <p className="notice error" role="alert">{error} <button className="btn soft" onClick={() => void refresh()}>Try again</button></p>}
        {problem && <p className="notice error" role="alert">{problem}</p>}
        {!data && !error ? (
          <div className="boot">Loading…</div>
        ) : data ? (
          tab === "tasks" ? (
            <TasksTab rows={rows} onToggle={toggle} onAdd={add} onOpen={(id) => setSheet({ kind: "task", id })} />
          ) : (
            <>
              {calendarNotice}
              <CalendarTab day={today} instances={instances} calendars={data.calendars} now={now} onCreate={(startMin) => setSheet({ kind: "event", startMin })} />
            </>
          )
        ) : null}
      </div>

      {data && sheet?.kind === "task" && (() => {
        const task = data.tasks.find((t) => t.id === sheet.id);
        if (!task) return null;
        return (
          <TaskSheet
            key={task.id}
            task={task}
            subtasks={data.tasks.filter((t) => t.parentId === task.id).sort((a, b) => a.position - b.position)}
            onClose={() => setSheet(null)}
            onEdit={(patch) => void edit(task.id, patch)}
            onToggle={(id, done) => void toggle(id, done)}
            onAddSub={(title) => addSub(task.id, title)}
            onDelete={() => remove(task.id)}
          />
        );
      })()}
      {data && sheet?.kind === "event" && (
        <EventSheet day={today} startMin={sheet.startMin} calendars={data.calendars} blocked={data.source === "google" ? GOOGLE_READ_ONLY : null} onClose={() => setSheet(null)} onSave={createEvent} />
      )}
    </div>
  );
}
