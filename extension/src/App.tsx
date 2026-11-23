import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Cloud, ExternalLink, LogOut } from "lucide-react";
import type { Task } from "@/lib/types";
import { todayKey } from "@/lib/dates";
import { backend } from "./backend";
import { CalendarTab } from "./CalendarTab";
import { Brand, SITE, TZ, fmt, useNow } from "./common";
import type { Account, DayData } from "./data";
import { SignedOutError } from "./errors";
import { Login } from "./Login";
import { TasksTab } from "./TasksTab";
import { todaysEvents, todaysTasks } from "./today";

type Tab = "tasks" | "calendar";

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
  ) : data?.eventsUnavailable ? (
    <p className="notice">Couldn&apos;t reach your Google events just now. They will appear when the connection is back.</p>
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
            <TasksTab rows={rows} onToggle={toggle} onAdd={add} />
          ) : (
            <>
              {calendarNotice}
              <CalendarTab day={today} instances={instances} calendars={data.calendars} now={now} />
            </>
          )
        ) : null}
      </div>
    </div>
  );
}
