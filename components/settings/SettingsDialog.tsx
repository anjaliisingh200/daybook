"use client";
import { useMemo, useState, type ReactNode } from "react";
import { signOut } from "@/lib/supabase/signOut";
import { Bell, CalendarDays, CheckCircle2, Globe, Keyboard, Palette, RefreshCw, UserRound, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge, ColorCheck, Input, Segmented, Switch } from "@/components/ui/Controls";
import { Dropdown } from "@/components/ui/Popover";
import { Select } from "@/components/ui/Menu";
import { ACCENTS, PALETTE, PALETTE_KEYS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { allTimeZones, systemTimeZone, tzOffsetLabel } from "@/lib/dates";
import { useCalendarViews, useFmt } from "@/lib/hooks";
import { useData } from "@/lib/store/data";
import { connectGoogle, disconnectGoogle, useGoogle } from "@/lib/store/google";
import { REGION_PRESETS, usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import { hexOf } from "@/lib/colors";

const SECTIONS = [
  { id: "general", label: "General", icon: Globe },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "account", label: "Account & sync", icon: UserRound },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
] as const;

export function SettingsDialog() {
  const settings = useUI((s) => s.settings);
  const close = useUI((s) => s.closeSettings);
  const openSettings = useUI((s) => s.openSettings);
  const section = settings?.section ?? "general";

  return (
    <Modal open={!!settings} onClose={close} size="xl" fullOnMobile hideClose className="sm:h-[40rem]">
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav aria-label="Settings sections" className="shrink-0 border-b border-border bg-surface-2/40 md:w-56 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-4 pb-1 pt-3 md:pt-4">
            <h2 className="font-display text-2xl">Settings</h2>
            <IconButton label="Close settings" size="sm" onClick={close} className="md:hidden" noTooltip>
              <X className="size-4" />
            </IconButton>
          </div>
          <ul className="hide-scrollbar flex gap-1 overflow-x-auto px-3 py-2 md:flex-col md:overflow-visible md:p-3">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <li key={id} className="shrink-0">
                <button
                  onClick={() => openSettings(id)}
                  aria-current={section === id}
                  className={cn(
                    "flex h-9 w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors",
                    section === id ? "bg-raised text-text shadow-sm" : "text-text-2 hover:bg-surface-2 hover:text-text"
                  )}
                >
                  <Icon className={cn("size-4", section === id && "text-accent")} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <IconButton label="Close settings" onClick={close} className="absolute right-3 top-3 z-10 max-md:hidden" noTooltip>
            <X className="size-[1.15rem]" />
          </IconButton>
          <div className="mx-auto max-w-2xl px-5 pb-10 pt-5 md:px-8 md:pt-7">
            {section === "general" && <General />}
            {section === "calendar" && <CalendarSettings />}
            {section === "tasks" && <TaskSettings />}
            {section === "notifications" && <Notifications />}
            {section === "appearance" && <Appearance />}
            {section === "account" && <Account />}
            {section === "shortcuts" && <Shortcuts />}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ───────────────────────────── building blocks ─────────────────────────────

type Source = "unsupported";

function Source({ kind }: { kind: Source }) {
  void kind;
  return <Badge tone="muted">Not supported by Google</Badge>;
}

function Title({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h3 className="font-display text-[1.9rem] leading-tight">{children}</h3>
      {sub && <p className="mt-1.5 text-sm leading-relaxed text-text-2">{sub}</p>}
    </header>
  );
}

function Row({ label, desc, source, children, stack }: { label: string; desc?: ReactNode; source?: Source; children?: ReactNode; stack?: boolean }) {
  return (
    <div className={cn("flex gap-4 border-b border-border py-4 last:border-b-0", stack ? "flex-col" : "items-start justify-between")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {source && <Source kind={source} />}
        </div>
        {desc && <p className="mt-1 text-[0.8125rem] leading-relaxed text-text-2">{desc}</p>}
      </div>
      {children && <div className={cn("shrink-0", stack ? "" : "w-[13rem] max-w-[48%] sm:w-[15rem]")}>{children}</div>}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mt-6 rounded-lg bg-surface-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-text-2">{children}</p>;
}

// ───────────────────────────── sections ─────────────────────────────

function General() {
  const p = usePrefs();
  const fmt = useFmt();
  const sample = "2026-11-18";
  const dateOptions = (["long", "dmy", "mdy", "ymd"] as const).map((v) => {
    // preview each format against a fixed date
    const f = fmtWith(v);
    return { value: v, label: f, hint: undefined as string | undefined };
  });
  function fmtWith(v: "long" | "dmy" | "mdy" | "ymd") {
    const [y, m, d] = sample.split("-");
    if (v === "dmy") return `${d}/${m}/${y}`;
    if (v === "mdy") return `${m}/${d}/${y}`;
    if (v === "ymd") return `${y}-${m}-${d}`;
    return fmt.date(sample).replace(/\d{4}$/, y);
  }
  return (
    <>
      <Title sub="How dates, times and language are shown. These are preferences for Daybook; they never change your Google account.">General</Title>
      <Row label="Language" desc="Used for month and weekday names. More languages can be added later.">
        <Select
          value={p.language}
          onChange={(v) => p.set({ language: v, region: "custom" })}
          options={[
            { value: "en-IN", label: "English (India)" },
            { value: "en-GB", label: "English (UK)" },
            { value: "en-US", label: "English (US)" },
          ]}
        />
      </Row>
      <Row label="Regional preset" desc="Sets language, week start, date format and time format together. You can still adjust each one.">
        <Select
          value={p.region}
          onChange={(v) => v !== "custom" && p.applyRegion(v)}
          options={[
            { value: "IN", label: "India" },
            { value: "US", label: "United States" },
            { value: "UK", label: "United Kingdom" },
            { value: "custom", label: "Custom" },
          ]}
        />
      </Row>
      <Row label="Date format" desc="Google Calendar has a date-order setting we can read, but not change.">
        <Select value={p.dateFormat} onChange={(v) => p.set({ dateFormat: v, region: "custom" })} options={dateOptions} />
      </Row>
      <Row label="Time format">
        <Segmented
          value={p.timeFormat}
          onChange={(v) => p.set({ timeFormat: v, region: "custom" })}
          options={[
            { value: "12", label: "12-hour" },
            { value: "24", label: "24-hour" },
          ]}
        />
      </Row>
      <Row label="Time zone" desc="Events are shown in this zone. Recurring events keep their own zone, so they stay correct across daylight saving.">
        <TimeZonePicker />
      </Row>
      <Note>Google Calendar&apos;s own language, time zone and format settings can be read through the API but not changed. Changing them here affects only how Daybook looks.</Note>
    </>
  );
}

function TimeZonePicker() {
  const tz = usePrefs((p) => p.timeZone);
  const set = usePrefs((p) => p.set);
  const device = systemTimeZone();
  const [q, setQ] = useState("");
  const all = useMemo(() => allTimeZones(), []);
  const list = useMemo(() => {
    const n = q.trim().toLowerCase().replace(/ /g, "_");
    return (n ? all.filter((z) => z.toLowerCase().includes(n)) : all).slice(0, 60);
  }, [q, all]);
  const label = tz === "auto" ? `Device · ${device}` : tz;
  return (
    <Dropdown
      matchWidth
      trigger={
        <button type="button" className="flex h-9 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm hover:border-border-strong" aria-label="Time zone">
          <span className="flex-1 truncate">{label}</span>
          <span className="text-xs text-text-3">{tzOffsetLabel(tz === "auto" ? device : tz)}</span>
        </button>
      }
    >
      {(close) => (
        <div className="w-[19rem]">
          <div className="border-b border-border p-2">
            <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search time zones" aria-label="Search time zones" />
          </div>
          <div className="max-h-64 overflow-auto p-1.5">
            <button
              className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2", tz === "auto" && "bg-accent-soft font-medium")}
              onClick={() => {
                set({ timeZone: "auto" });
                close();
              }}
            >
              <span>Device ({device})</span>
              <span className="text-xs text-text-3">{tzOffsetLabel(device)}</span>
            </button>
            {list.map((z) => (
              <button
                key={z}
                className={cn("flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-surface-2", tz === z && "bg-accent-soft font-medium")}
                onClick={() => {
                  set({ timeZone: z });
                  close();
                }}
              >
                <span className="truncate">{z.replace(/_/g, " ")}</span>
                <span className="ml-2 shrink-0 text-xs text-text-3">{tzOffsetLabel(z)}</span>
              </button>
            ))}
            {list.length === 0 && <p className="px-2.5 py-3 text-sm text-text-3">No matches</p>}
          </div>
        </div>
      )}
    </Dropdown>
  );
}

function CalendarSettings() {
  const p = usePrefs();
  const cals = useCalendarViews();
  return (
    <>
      <Title sub="How the calendar looks and behaves in Daybook.">Calendar</Title>
      <Row label="Default view">
        <Select
          value={p.defaultView}
          onChange={(v) => {
            p.set({ defaultView: v });
            useUI.getState().setCalView(v);
          }}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "schedule", label: "Schedule" },
          ]}
        />
      </Row>
      <Row label="Week starts on">
        <Select
          value={p.weekStart}
          onChange={(v) => p.set({ weekStart: v as 0 | 1 | 6, region: "custom" })}
          options={[
            { value: 0, label: "Sunday" },
            { value: 1, label: "Monday" },
            { value: 6, label: "Saturday" },
          ]}
        />
      </Row>
      <Row label="Show weekends" desc="Hides Saturday and Sunday from the week view.">
        <Switch label="Show weekends" checked={!p.hideWeekends} onChange={(v) => p.set({ hideWeekends: !v })} />
      </Row>
      <Row label="Default event length" desc="Used when you click a time slot or create an event.">
        <Select
          value={p.defaultDuration}
          onChange={(v) => p.set({ defaultDuration: v })}
          options={[15, 30, 45, 60, 90, 120].map((m) => ({ value: m, label: m < 60 ? `${m} minutes` : m === 60 ? "1 hour" : `${m / 60} hours` }))}
        />
      </Row>
      <div className="pt-6">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="text-sm font-semibold">Calendars</h4>
        </div>
        <p className="mb-2 text-[0.8125rem] text-text-2">Hiding or recolouring a calendar here does not change it in Google Calendar.</p>
        <ul>
          {cals.map((c) => (
            <li key={c.id} className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
              <ColorCheck checked={c.visible} color={c.hex} label={`Show ${c.name}`} onChange={(v) => p.setCalendarVisible(c.id, v)} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {c.name}
                {c.readOnly && <span className="ml-2 text-xs text-text-3">read-only</span>}
              </span>
              <div className="w-36">
                <Select
                  size="sm"
                  aria-label={`${c.name} colour`}
                  value={c.colorKey}
                  onChange={(k) => p.setCalendarColor(c.id, k === c.color ? null : k)}
                  options={PALETTE_KEYS.map((k) => ({ value: k, label: PALETTE[k].name, swatch: PALETTE[k].hex }))}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function TaskSettings() {
  const p = usePrefs();
  const lists = useData((s) => s.lists);
  return (
    <>
      <Title sub="How your Google Tasks are organised here.">Tasks</Title>
      <Row label="Default list" desc="Where new tasks go unless you choose another list.">
        <Select
          value={p.defaultListId ?? lists[0]?.id ?? ""}
          onChange={(v) => p.set({ defaultListId: v })}
          options={lists.map((l) => ({ value: l.id, label: l.title, swatch: hexOf(l.color) }))}
        />
      </Row>
      <Row label="Default sorting" desc="Applies inside each date group; the groups themselves stay the same.">
        <Select
          value={p.taskSort}
          onChange={(v) => p.set({ taskSort: v })}
          options={[
            { value: "due", label: "Due date" },
            { value: "priority", label: "Priority" },
            { value: "title", label: "Title (A–Z)" },
            { value: "updated", label: "Recently updated" },
          ]}
        />
      </Row>
      <Row label="Default layout">
        <Segmented
          value={p.taskLayout}
          onChange={(v) => p.set({ taskLayout: v })}
          options={[
            { value: "grid", label: "Card grid" },
            { value: "list", label: "Single column" },
          ]}
        />
      </Row>
      <Row label="Manual order in day columns" desc="Off: each day lists tasks by priority, then newest. On: a task stays where you drop it. Dragging a task up or down inside a day turns this on.">
        <Switch label="Manual order in day columns" checked={p.manualOrder} onChange={(v) => p.set({ manualOrder: v })} />
      </Row>
      <Row label="Show completed tasks" desc="Shows the collapsible Completed section at the bottom.">
        <Switch label="Show completed tasks" checked={p.showCompleted} onChange={(v) => p.set({ showCompleted: v })} />
      </Row>
      <Row label="Show tasks without a due date">
        <Switch label="Show undated tasks" checked={p.showUndated} onChange={(v) => p.set({ showUndated: v })} />
      </Row>
      <Row label="Overdue tasks" desc="How a missed due date looks on a card.">
        <Segmented
          value={p.overdueStyle}
          onChange={(v) => p.set({ overdueStyle: v })}
          options={[
            { value: "highlight", label: "Highlighted" },
            { value: "subtle", label: "Subtle" },
          ]}
        />
      </Row>
    </>
  );
}

function Notifications() {
  const p = usePrefs();
  const toast = useUI((s) => s.toast);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(typeof Notification === "undefined" ? "unsupported" : Notification.permission);

  const enableBrowser = async (v: boolean) => {
    if (!v) return p.set({ browserNotifications: false });
    if (typeof Notification === "undefined") return toast("This browser can't show notifications.", { tone: "error" });
    const res = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPerm(res);
    if (res === "granted") p.set({ browserNotifications: true });
    else toast("Notifications are blocked. Allow them in your browser's site settings.", { tone: "error" });
  };

  return (
    <>
      <Title sub="Reminders from Daybook while it is open. Your phone's Google Calendar app keeps sending its own.">Notifications</Title>
      <Row label="Event reminders" desc="A heads-up shortly before an event starts. Each event reminds you once, even across tabs and refreshes.">
        <Switch label="Event reminders" checked={p.remindEvents} onChange={(v) => p.set({ remindEvents: v })} />
      </Row>
      <Row label="Remind me">
        <Select
          value={p.remindLead}
          onChange={(v) => p.set({ remindLead: v })}
          options={[5, 10, 15, 30, 60].map((m) => ({ value: m, label: `${m} minutes before` }))}
        />
      </Row>
      <Row label="Browser notifications" desc={perm === "denied" ? "Blocked in your browser settings." : perm === "unsupported" ? "Not supported in this browser." : "Also show a system notification while the app is open."}>
        <Switch label="Browser notifications" checked={p.browserNotifications && perm === "granted"} disabled={perm === "unsupported"} onChange={(v) => void enableBrowser(v)} />
      </Row>
      <Row label="Task reminders" source="unsupported" desc="Google Tasks has no reminders or times, so there is nothing to sync. Daybook can't invent one without adding data that Google doesn't hold." />
      <Row label="Overdue summary on open" desc="One quiet message per session when tasks are overdue.">
        <Switch label="Overdue summary" checked={p.overdueSummary} onChange={(v) => p.set({ overdueSummary: v })} />
      </Row>
      <div className="pt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            toast("This is what a reminder looks like.", { duration: 4000 });
            if (p.browserNotifications && perm === "granted") new Notification("Daybook", { body: "This is what a reminder looks like." });
          }}
        >
          Send a test reminder
        </Button>
      </div>
      <Note>Reminders only fire while Daybook is open. A free-hosted web app can&apos;t wake up in the background, and Daybook won&apos;t notify you about events Google Calendar already reminds you about unless you turn this on.</Note>
    </>
  );
}

function Appearance() {
  const p = usePrefs();
  return (
    <>
      <Title sub="Colour, density and type size. All of it is private to this device and app.">Appearance</Title>
      <Row label="Interface density" desc="Changes spacing in the calendar grid and task cards.">
        <Segmented
          value={p.density}
          onChange={(v) => p.set({ density: v })}
          options={[
            { value: "compact", label: "Compact" },
            { value: "comfortable", label: "Cozy" },
            { value: "spacious", label: "Roomy" },
          ]}
        />
      </Row>
      <Row label="Font size">
        <Segmented
          value={p.fontSize}
          onChange={(v) => p.set({ fontSize: v })}
          options={[
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" },
          ]}
        />
      </Row>
      <Row label="Accent colour" desc="Used for buttons, today, selections and focus." stack>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent colour">
          {Object.entries(ACCENTS).map(([k, a]) => (
            <button
              key={k}
              role="radio"
              aria-checked={p.accent === k}
              aria-label={a.name}
              title={a.name}
              onClick={() => p.set({ accent: k })}
              className={cn("flex size-9 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110", p.accent === k && "ring-2 ring-text")}
              style={{ background: a.light }}
            >
              {p.accent === k && <span className="size-2 rounded-full bg-surface/90" />}
            </button>
          ))}
        </div>
      </Row>
      <div className="pt-5">
        <Button variant="ghost" size="sm" onClick={() => { p.resetAll(); useUI.getState().toast("Preferences reset"); }}>
          Reset all preferences
        </Button>
      </div>
    </>
  );
}

function Account() {
  const syncedAt = useData((s) => s.syncedAt);
  const syncState = useData((s) => s.syncState);
  const sync = useData((s) => s.sync);
  const reset = useData((s) => s.resetSample);
  const kind = useData((s) => s.repoKind);
  const cals = useData((s) => s.calendars);
  const lists = useData((s) => s.lists);
  const google = useGoogle();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const toast = useUI((s) => s.toast);
  const fmt = useFmt();
  const when = syncedAt ? `${fmt.date(new Date(syncedAt).toISOString().slice(0, 10))}, ${fmt.time(syncedAt)}` : "Never";
  const onGoogle = kind === "google";

  return (
    <>
      <Title sub="Where your data comes from and whether it is in step.">Account &amp; sync</Title>

      <div className="rounded-xl border border-border bg-surface-2/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-base font-semibold text-on-accent">A</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">{onGoogle ? (google.email ?? "Google account") : "Anjali"}</div>
            <div className="text-[0.8125rem] text-text-2">
              {kind === "mock"
                ? "Sample data. No Google account connected yet."
                : onGoogle
                  ? "Your calendars and tasks come from Google. For now they are read-only here; editing arrives next."
                  : google.needsReconnect
                    ? "Google stopped accepting the saved permission. Connect again to bring your Google data back."
                    : "Signed in. Your data is saved to your account."}
            </div>
          </div>
          <Badge tone={kind === "mock" || google.needsReconnect ? "muted" : "accent"}>{kind === "mock" ? "Demo mode" : onGoogle ? "Google connected" : google.needsReconnect ? "Needs reconnect" : "Connected"}</Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {!onGoogle && (
            <Button variant="primary" size="sm" onClick={connectGoogle}>
              {google.needsReconnect ? "Reconnect Google" : "Connect Google account"}
            </Button>
          )}
          {(onGoogle || google.needsReconnect) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (!confirmDisconnect) {
                  setConfirmDisconnect(true);
                  window.setTimeout(() => setConfirmDisconnect(false), 5000);
                  return;
                }
                if (!(await disconnectGoogle())) toast("Couldn't disconnect Google. Try again.", { tone: "error" });
              }}
            >
              {confirmDisconnect ? "Click again to disconnect" : "Disconnect Google"}
            </Button>
          )}
          {kind === "supabase" && (
            <Button size="sm" variant="secondary" onClick={() => void signOut()}>
              Log out
            </Button>
          )}
          <Button size="sm" variant="secondary" icon={<RefreshCw className={cn("size-3.5", syncState === "syncing" && "animate-spin")} />} onClick={() => void sync()} disabled={syncState === "syncing"}>
            Sync now
          </Button>
        </div>
      </div>

      <Row label="Connection status">
        <span className="text-sm text-text-2">{syncState === "syncing" ? "Syncing…" : syncState === "offline" ? "Offline" : syncState === "error" ? "Needs attention" : "Up to date"}</span>
      </Row>
      <Row label="Last successful sync">
        <span className="text-sm text-text-2">{when}</span>
      </Row>
      <Row label="Connected calendars" desc={cals.map((c) => c.name).join(", ")}>
        <span className="text-sm text-text-2">{cals.length}</span>
      </Row>
      <Row label="Connected task lists" desc={lists.map((l) => l.title).join(", ")}>
        <span className="text-sm text-text-2">{lists.length}</span>
      </Row>
      {kind === "mock" && (
        <Row label="Sample data" desc="Restores the original sample tasks and events. Only affects this browser.">
          <Button size="sm" variant="secondary" onClick={() => void reset()}>
            Reset sample data
          </Button>
        </Row>
      )}

      <div className="pt-6">
        <h4 className="mb-2 text-sm font-semibold">What syncs with Google</h4>
        <div className="overflow-hidden rounded-xl border border-border text-[0.8125rem]">
          {[
            ["Tasks: title, notes, due date, list, completion", "Read from Google Tasks (saving changes arrives next)"],
            ["Events: title, time, place, guests, repeats", "Read from Google Calendar (saving changes arrives next)"],
            ["Task priority", "Daybook only"],
            ["Calendar visibility and colours", "Daybook only"],
            ["Task times and reminders", "Not available in Google Tasks"],
          ].map(([a, b], i) => (
            <div key={a} className={cn("flex items-start justify-between gap-4 px-4 py-2.5", i > 0 && "border-t border-border")}>
              <span>{a}</span>
              <span className="shrink-0 text-text-2">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Shortcuts() {
  const groups: [string, [string, string][]][] = [
    [
      "Calendar",
      [
        ["T", "Go to today"],
        ["D / W / M / A", "Day, week, month, schedule"],
        ["J or →", "Next period"],
        ["K or ←", "Previous period"],
        ["C", "Create event"],
        ["/", "Search events"],
      ],
    ],
    [
      "Tasks",
      [
        ["A or C", "Add task"],
        ["T", "Jump to today"],
        ["J / K", "Next / previous week"],
        ["/", "Search tasks"],
      ],
    ],
    [
      "Everywhere",
      [
        ["Esc", "Close dialog, menu or search"],
        ["⌘/Ctrl + Enter", "Save in quick add"],
      ],
    ],
  ];
  return (
    <>
      <Title sub="Single-key shortcuts work when you aren't typing in a field.">Keyboard shortcuts</Title>
      {groups.map(([g, rows]) => (
        <div key={g} className="mb-6">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-3">{g}</h4>
          {rows.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between border-b border-border py-2.5 text-sm last:border-b-0">
              <span className="text-text-2">{d}</span>
              <kbd className="rounded-md border border-border-strong bg-surface-2 px-2 py-0.5 font-sans text-xs font-medium">{k}</kbd>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

// re-export for the table of regions used elsewhere
export { REGION_PRESETS };
