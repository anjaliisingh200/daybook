"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDownUp, Bell, Check, CheckCircle2, CloudOff, Download, ListFilter, Plus, RefreshCw, Search, Settings, Trash2, X, CalendarX2, Pencil } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Badge, ColorCheck, EmptyState, Field, Input, RoundCheck, Segmented, Skeleton, Switch, Textarea } from "@/components/ui/Controls";
import { DateField, MonthPanel, TimeSelect } from "@/components/ui/DatePicker";
import { Drawer, LeftSheet, Modal } from "@/components/ui/Modal";
import { Menu, Select } from "@/components/ui/Menu";
import { Dropdown } from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import { DayHeaders } from "@/components/shell/DayHeaders";
import { LogoMark } from "@/components/shell/Logo";
import { PriorityMark, TaskCard } from "@/components/tasks/TaskCard";
import { evSurface, evVars } from "@/components/calendar/TimeGrid";
import { ACCENTS, PALETTE, PALETTE_KEYS } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { addDays, startOfWeek } from "@/lib/dates";
import { useNow, useToday } from "@/lib/hooks";
import { usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import type { Task, TaskList } from "@/lib/types";

const SECTIONS = [
  ["overview", "Overview"],
  ["tokens", "Tokens"],
  ["colour", "Colour"],
  ["type", "Typography"],
  ["shape", "Shape and depth"],
  ["buttons", "Buttons"],
  ["forms", "Form controls"],
  ["pickers", "Date and time"],
  ["menus", "Menus and overlays"],
  ["cards", "Task cards"],
  ["calendar", "Calendar pieces"],
  ["feedback", "Feedback and states"],
  ["motion", "Motion"],
] as const;

export function DesignSystem() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<string>("overview");

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis) setActive(vis.target.id);
      },
      { root, rootMargin: "-10% 0px -75% 0px" }
    );
    SECTIONS.forEach(([id]) => {
      const el = root.querySelector(`#${id}`);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  const go = (id: string) => scroller.current?.querySelector(`#${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="flex h-full min-h-0">
      <nav aria-label="Design system sections" className="hidden w-56 shrink-0 overflow-y-auto border-r border-border p-4 lg:block">
        <p className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-text-3">Sections</p>
        <ul className="space-y-0.5">
          {SECTIONS.map(([id, label]) => (
            <li key={id}>
              <button onClick={() => go(id)} className={cn("flex h-8 w-full items-center rounded-lg px-2.5 text-left text-sm transition-colors", active === id ? "bg-surface-2 font-medium text-text" : "text-text-2 hover:bg-surface-2 hover:text-text")}>
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div ref={scroller} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-16 px-5 pb-28 pt-8 md:px-10 md:pt-12">
          <Overview />
          <Tokens />
          <Colour />
          <Type />
          <Shape />
          <Buttons />
          <Forms />
          <Pickers />
          <Menus />
          <Cards />
          <CalendarPieces />
          <Feedback />
          <Motion />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── layout helpers ───────────────────────────

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <header className="mb-6 border-b border-border pb-4">
        <h2 className="font-display text-[2.2rem] leading-tight">{title}</h2>
        {intro && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-text-2">{intro}</p>}
      </header>
      <div className="space-y-8">{children}</div>
    </section>
  );
}

function Block({ label, note, children, className }: { label: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <div>
      <div className="mb-2.5 flex items-baseline gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-2">{label}</h3>
        {note && <span className="text-xs text-text-3">{note}</span>}
      </div>
      <div className={cn("rounded-xl border border-border bg-surface p-5", className)}>{children}</div>
    </div>
  );
}

// ─────────────────────────── sections ───────────────────────────

function Overview() {
  return (
    <Section id="overview" title="Design system" intro="A temporary tab that gathers every component Daybook uses, so repeated pieces are designed once and reused. It is a reference, not part of the product. The real app keeps two tabs.">
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-surface p-6">
        <LogoMark className="size-14" />
        <div>
          <div className="font-display text-4xl leading-none">Daybook</div>
          <p className="mt-2 text-sm text-text-2">Warm neutrals, charcoal type, a restrained accent. Colour only when it means something. Blue appears in exactly one place: the primary button.</p>
        </div>
        <ul className="ml-auto grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-text-2">
          <li>Light, dark, system</li>
          <li>3 densities</li>
          <li>3 font sizes</li>
          <li>6 accent colours</li>
        </ul>
      </div>
    </Section>
  );
}

function useCssVar(name: string): string {
  const accent = usePrefs((p) => p.accent);
  const [v, setV] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setV(getComputedStyle(document.documentElement).getPropertyValue(name).trim()), 60);
    return () => clearTimeout(t);
  }, [name, accent]);
  return v;
}

function Swatch({ name, label, bordered = true }: { name: string; label?: string; bordered?: boolean }) {
  const v = useCssVar(name);
  return (
    <div className="min-w-0">
      <div className={cn("h-14 rounded-lg", bordered && "border border-border")} style={{ background: `var(${name})` }} />
      <div className="mt-1.5 truncate text-xs font-medium">{label ?? name}</div>
      <div className="truncate text-[0.6875rem] text-text-3">{v.startsWith("color-mix") ? "tint of accent" : v || "…"}</div>
    </div>
  );
}

// ─────────────────────────── tokens ───────────────────────────

/** Every design token, grouped. Values are read live from the page. Change them in app/globals.css. */
const TOKEN_GROUPS: { title: string; note?: string; colour?: boolean; tokens: string[] }[] = [
  { title: "Surfaces", colour: true, tokens: ["--bg", "--surface", "--surface-2", "--surface-3", "--raised", "--overlay"] },
  { title: "Lines and text", colour: true, tokens: ["--border", "--border-strong", "--text", "--text-2", "--text-3", "--text-on-accent"] },
  { title: "Accent", note: "Set by the accent switcher in Appearance.", colour: true, tokens: ["--accent", "--accent-hover", "--accent-soft", "--accent-line"] },
  {
    title: "Semantic: primary",
    note: "Change --semantic-primary and the primary button and date highlights follow.",
    colour: true,
    tokens: ["--semantic-primary", "--semantic-primary-hover", "--semantic-on-primary", "--semantic-date-highlight", "--semantic-date-highlight-text"],
  },
  { title: "Semantic: status", note: "Destructive actions, overdue and feedback.", colour: true, tokens: ["--semantic-destructive", "--danger", "--danger-soft", "--warn", "--ok"] },
  { title: "Priority", colour: true, tokens: ["--prio-high", "--prio-medium", "--prio-low"] },
  { title: "Elevation", tokens: ["--shadow-sm", "--shadow-md", "--shadow-lg"] },
  { title: "Density", note: "Switched by the density setting.", tokens: ["--hour-h", "--card-pad", "--row-pad"] },
];

const STATIC_TOKENS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Radius",
    rows: [
      ["--radius-sm", "6px"],
      ["--radius-md", "10px"],
      ["--radius-lg", "14px"],
      ["--radius-xl", "20px"],
    ],
  },
  {
    title: "Type",
    rows: [
      ["--font-sans / --font-ui", "Instrument Sans"],
      ["--font-display", "Instrument Serif"],
    ],
  },
];

function TokenRow({ name, colour }: { name: string; colour?: boolean }) {
  const v = useCssVar(name);
  return (
    <tr className="border-t border-border first:border-t-0">
      <td className="py-2 pr-4 align-top font-mono text-[0.75rem]">{name}</td>
      <td className="break-all py-2 pr-4 align-top text-[0.75rem] text-text-2">{v || "…"}</td>
      <td className="w-14 py-2 align-top">{colour && <div className="size-7 rounded-md border border-border" style={{ background: `var(${name})` }} />}</td>
    </tr>
  );
}

function Tokens() {
  return (
    <Section id="tokens" title="Tokens" intro="Every design token in one place. A token is a named value (for example --semantic-primary) that components read from, so changing it in app/globals.css changes every place that uses it. Values below are read live from the page.">
      {TOKEN_GROUPS.map((g) => (
        <Block key={g.title} label={g.title} note={g.note}>
          <table className="w-full text-sm">
            <tbody>
              {g.tokens.map((t) => (
                <TokenRow key={t} name={t} colour={g.colour} />
              ))}
            </tbody>
          </table>
        </Block>
      ))}
      {STATIC_TOKENS.map((g) => (
        <Block key={g.title} label={g.title} note="defined in app/globals.css">
          <table className="w-full text-sm">
            <tbody>
              {g.rows.map(([n, v]) => (
                <tr key={n} className="border-t border-border first:border-t-0">
                  <td className="py-2 pr-4 font-mono text-[0.75rem]">{n}</td>
                  <td className="py-2 text-[0.75rem] text-text-2">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Block>
      ))}
    </Section>
  );
}

function Colour() {
  const accent = usePrefs((p) => p.accent);
  const set = usePrefs((p) => p.set);
  return (
    <Section id="colour" title="Colour" intro="Every colour is a token (a CSS variable), so light, dark and the accent switcher all work from one place.">
      <Block label="Surfaces" note="warm neutrals">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Swatch name="--bg" label="Page" />
          <Swatch name="--surface" label="Surface" />
          <Swatch name="--surface-2" label="Sunken / hover" />
          <Swatch name="--surface-3" label="Pressed" />
          <Swatch name="--raised" label="Raised pill" />
        </div>
      </Block>
      <Block label="Text and lines">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Swatch name="--text" label="Text" />
          <Swatch name="--text-2" label="Text secondary" />
          <Swatch name="--text-3" label="Text muted" />
          <Swatch name="--border" label="Border" />
          <Swatch name="--border-strong" label="Border strong" />
        </div>
      </Block>
      <Block label="Accent and meaning" note="terracotta is for status only">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          <Swatch name="--accent" label="Accent" />
          <Swatch name="--accent-soft" label="Accent soft" />
          <Swatch name="--danger" label="Danger / overdue" />
          <Swatch name="--warn" label="Warning" />
          <Swatch name="--ok" label="Success" />
        </div>
      </Block>
      <Block label="Primary button" note="#1163ff, white text. The only blue in the product">
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-40">
            <Swatch name="--semantic-primary" label="Primary" />
          </div>
          <Button variant="primary">Primary</Button>
          <Button variant="danger">Destructive</Button>
        </div>
      </Block>
      <Block label="Accent choices" note="click to switch the whole app">
        <div className="flex flex-wrap gap-5">
          {Object.entries(ACCENTS).map(([k, a]) => (
            <button key={k} onClick={() => set({ accent: k })} className="group flex flex-col items-center gap-2" aria-pressed={accent === k}>
              <span className={cn("flex size-12 items-center justify-center rounded-full ring-offset-2 ring-offset-surface transition-transform group-hover:scale-105", accent === k && "ring-2 ring-text")} style={{ background: a.light }}>
                {accent === k && <Check className="size-5 text-white" />}
              </span>
              <span className="text-xs text-text-2">{a.name}</span>
            </button>
          ))}
        </div>
      </Block>
      <Block label="Calendar and list colours" note="a muted palette with no blue or teal">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {PALETTE_KEYS.map((k) => (
            <div key={k}>
              <div className="h-14 rounded-lg" style={{ background: PALETTE[k].hex }} />
              <div className="mt-1.5 text-xs font-medium">{PALETTE[k].name}</div>
              <div className="text-[0.6875rem] text-text-3">{PALETTE[k].hex}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Calendars" note="one colour per calendar; events take their calendar's colour">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Anjali", "#3F51B5"],
            ["Design Studio", "#0B8043"],
            ["Learning", "#8E24AA"],
            ["Family", "#f4511E"],
          ].map(([n, hex]) => (
            <div key={n}>
              <div className="h-14 rounded-lg" style={{ background: hex }} />
              <div className="mt-1.5 text-xs font-medium">{n}</div>
              <div className="font-mono text-[0.6875rem] text-text-3">{hex}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Priority" note="always an icon plus a label">
        <div className="flex flex-wrap gap-8">
          <PriorityMark priority="high" />
          <PriorityMark priority="medium" />
          <PriorityMark priority="low" />
        </div>
      </Block>
    </Section>
  );
}

function Type() {
  return (
    <Section id="type" title="Typography" intro="Instrument Serif for dates and headings, Instrument Sans for everything you read and tap.">
      <Block label="Display" note="Instrument Serif, regular">
        <div className="space-y-3">
          <div className="font-display text-[3.2rem] leading-none">November 2026</div>
          <div className="font-display text-[1.9rem] leading-none">Everything else</div>
          <div className="font-display text-[1.45rem] leading-none">Daybook</div>
        </div>
      </Block>
      <Block label="Interface" note="Instrument Sans">
        <div className="space-y-3">
          <div className="text-[1.35rem] font-semibold leading-snug">Task title in the details panel</div>
          <div className="text-[1.2rem] font-semibold leading-snug">Event title in a popover</div>
          <div className="text-[0.9375rem] font-semibold">Card title, 15 px semibold</div>
          <div className="text-sm">Body and controls, 14 px regular. The quick brown fox jumps over the lazy dog.</div>
          <div className="text-[0.8125rem] text-text-2">Secondary text, 13 px. Used for descriptions and hints.</div>
          <div className="text-xs text-text-3">Caption, 12 px muted. Metadata and helper text.</div>
          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-text-2">Overline, uppercase tracking</div>
          <div className="tnum text-sm">Tabular numbers 10:30 AM – 11:45 AM · 1,234</div>
        </div>
      </Block>
      <Block label="Weights">
        <div className="flex flex-wrap gap-x-10 gap-y-2 text-lg">
          {[400, 500, 600, 700].map((w) => (
            <span key={w} style={{ fontWeight: w }}>
              {w} Aa
            </span>
          ))}
        </div>
      </Block>
    </Section>
  );
}

function Shape() {
  return (
    <Section id="shape" title="Shape and depth" intro="Soft radii, hairline borders and very light shadows. Depth is a whisper.">
      <Block label="Radius">
        <div className="flex flex-wrap items-end gap-6">
          {[
            ["6px", "sm"],
            ["10px", "md"],
            ["14px", "lg"],
            ["20px", "xl"],
            ["999px", "full"],
          ].map(([r, n]) => (
            <div key={n} className="text-center">
              <div className="size-20 border border-border-strong bg-surface-2" style={{ borderRadius: r }} />
              <div className="mt-2 text-xs font-medium">{n}</div>
              <div className="text-[0.6875rem] text-text-3">{r}</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Elevation" className="bg-surface-2">
        <div className="flex flex-wrap gap-8">
          {[
            ["Flat", "none"],
            ["Small", "var(--shadow-sm)"],
            ["Medium", "var(--shadow-md)"],
            ["Large", "var(--shadow-lg)"],
          ].map(([n, sh]) => (
            <div key={n} className="flex h-24 w-36 items-center justify-center rounded-xl border border-border bg-surface text-sm" style={{ boxShadow: sh }}>
              {n}
            </div>
          ))}
        </div>
      </Block>
      <Block label="Spacing scale" note="4 px grid">
        <div className="flex flex-wrap items-end gap-4">
          {[4, 8, 12, 16, 24, 32, 48].map((n) => (
            <div key={n} className="text-center">
              <div className="rounded-sm bg-accent" style={{ width: n, height: n }} />
              <div className="mt-1.5 text-[0.6875rem] text-text-3">{n}</div>
            </div>
          ))}
        </div>
      </Block>
    </Section>
  );
}

function Buttons() {
  const variants = ["primary", "secondary", "soft", "ghost", "danger"] as const;
  return (
    <Section id="buttons" title="Buttons" intro="Five variants and three sizes. Primary uses the accent; danger is reserved for destructive actions.">
      <Block label="Variants">
        <div className="flex flex-wrap items-center gap-3">
          {variants.map((v) => (
            <Button key={v} variant={v}>
              {v[0].toUpperCase() + v.slice(1)}
            </Button>
          ))}
        </div>
      </Block>
      <Block label="Sizes">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="sm">
            Small
          </Button>
          <Button variant="primary" size="md">
            Medium
          </Button>
          <Button variant="primary" size="lg">
            Large
          </Button>
        </div>
      </Block>
      <Block label="With icons and states">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" icon={<Plus className="size-4" />}>
            Add task
          </Button>
          <Button variant="secondary" icon={<Download className="size-4" />}>
            Export
          </Button>
          <Button variant="danger" icon={<Trash2 className="size-4" />}>
            Delete
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </Block>
      <Block label="Icon buttons" note="hover for the tooltip">
        <div className="flex flex-wrap items-center gap-3">
          <IconButton label="Settings" size="sm">
            <Settings className="size-4" />
          </IconButton>
          <IconButton label="Notifications" shortcut="N">
            <Bell className="size-[1.15rem]" />
          </IconButton>
          <IconButton label="Search" size="lg">
            <Search className="size-5" />
          </IconButton>
          <IconButton label="Filter (active)" active>
            <ListFilter className="size-[1.1rem]" />
          </IconButton>
          <IconButton label="Sort">
            <ArrowDownUp className="size-[1.1rem]" />
          </IconButton>
          <IconButton label="Edit">
            <Pencil className="size-4" />
          </IconButton>
          <IconButton label="Disabled" disabled>
            <X className="size-4" />
          </IconButton>
        </div>
      </Block>
    </Section>
  );
}

function Forms() {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState("week");
  const [seg2, setSeg2] = useState("none");
  const [checked, setChecked] = useState(false);
  const [cc, setCc] = useState([true, true, false, true]);
  const [sel, setSel] = useState("work");
  return (
    <Section id="forms" title="Form controls" intro="Inputs, choices and toggles. Every text field shows the same focus treatment: an accent border and a soft ring.">
      <div className="grid gap-8 md:grid-cols-2">
        <Block label="Text fields">
          <div className="space-y-4">
            <Field label="Title">
              <Input placeholder="What needs doing?" />
            </Field>
            <Field label="Filled" hint="Helper text sits underneath.">
              <Input defaultValue="Finalise onboarding flow handoff" />
            </Field>
            <Field label="Disabled">
              <Input disabled defaultValue="Not editable" />
            </Field>
            <Field label="Description">
              <Textarea placeholder="Add details…" rows={3} />
            </Field>
            <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-surface px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
              <Search className="size-4 text-text-3" />
              <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3" placeholder="Search pill" aria-label="Search pill" />
            </div>
          </div>
        </Block>

        <Block label="Choices">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <RoundCheck checked={checked} onChange={setChecked} label="Complete task" />
              <span className="text-sm text-text-2">Completion circle (tap me)</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {PALETTE_KEYS.slice(0, 4).map((k, i) => (
                <ColorCheck key={k} checked={cc[i]} color={PALETTE[k].hex} label={PALETTE[k].name} onChange={(v) => setCc(cc.map((x, j) => (j === i ? v : x)))} />
              ))}
              <span className="text-sm text-text-2">Calendar visibility</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={on} onChange={setOn} label="Switch" />
              <Switch checked={false} onChange={() => {}} label="Off" />
              <Switch checked disabled onChange={() => {}} label="Disabled" />
            </div>
            <Segmented
              value={seg}
              onChange={setSeg}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <div>
              <Segmented
                size="sm"
                value={seg2}
                onChange={setSeg2}
                options={[
                  { value: "none", label: "None" },
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </div>
            <Select
              value={sel}
              onChange={setSel}
              options={[
                { value: "work", label: "Work", swatch: PALETTE.terracotta.hex },
                { value: "home", label: "Home", swatch: PALETTE.olive.hex },
                { value: "learn", label: "Learning", swatch: PALETTE.plum.hex },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Badge>Neutral</Badge>
              <Badge tone="accent">Accent</Badge>
              <Badge tone="danger">Overdue</Badge>
              <Badge tone="muted">This app only</Badge>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}

function Pickers() {
  const today = useToday();
  const [d, setD] = useState<string | null>(today);
  const [t, setT] = useState(9 * 60 + 30);
  const [t2, setT2] = useState(10 * 60 + 15);
  return (
    <Section id="pickers" title="Date and time" intro="Custom pickers, because the browser's native ones draw in blue.">
      <div className="grid gap-8 md:grid-cols-2">
        <Block label="Month panel">
          <MonthPanel value={d} onChange={setD} />
        </Block>
        <Block label="Fields">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 text-xs font-medium text-text-2">Date field with quick picks</div>
              <DateField value={d} onChange={setD} clearable quick />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-text-2">Time (15-minute steps)</div>
              <div className="flex flex-wrap items-center gap-2">
                <TimeSelect value={t} onChange={setT} />
                <span className="text-text-3">–</span>
                <TimeSelect value={t2} from={t} onChange={setT2} />
              </div>
            </div>
          </div>
        </Block>
      </div>
    </Section>
  );
}

function Menus() {
  const toast = useUI((s) => s.toast);
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [sheet, setSheet] = useState(false);
  return (
    <Section id="menus" title="Menus and overlays" intro="Anchored panels flip and shift to stay on screen. Dialogs become bottom sheets on phones.">
      <Block label="Menu" note="arrow keys, Esc to close">
        <div className="flex flex-wrap items-center gap-3">
          <Menu
            placement="bottom-start"
            trigger={<Button variant="secondary">Open menu</Button>}
            items={[
              { type: "label", label: "Due date" },
              { label: "Today", checked: true, onSelect: () => toast("Today") },
              { label: "Tomorrow", onSelect: () => toast("Tomorrow") },
              { label: "With a hint", hint: "Fri, 21 Nov", onSelect: () => toast("Hint") },
              { type: "sep" },
              { label: "Colour swatch", swatch: PALETTE.ochre.hex, onSelect: () => toast("Swatch") },
              { label: "Delete task", icon: <Trash2 className="size-4" />, danger: true, onSelect: () => toast("Deleted") },
            ]}
          />
          <Dropdown trigger={<Button variant="secondary">Custom popover</Button>}>
            {(close) => (
              <div className="w-64 p-4">
                <p className="text-sm font-semibold">Anything fits here</p>
                <p className="mt-1 text-[0.8125rem] text-text-2">Filters, pickers and forms all use this panel.</p>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="primary" onClick={close}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </Dropdown>
          <Tooltip label="Tooltip with shortcut" shortcut="T">
            <Button variant="ghost">Hover for tooltip</Button>
          </Tooltip>
        </div>
      </Block>
      <Block label="Dialogs">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>
            Modal
          </Button>
          <Button variant="secondary" onClick={() => setDrawer(true)}>
            Side drawer (right)
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Side sheet (left)
          </Button>
        </div>
        <Modal open={modal} onClose={() => setModal(false)} title="Modal title" size="sm">
          <div className="p-5 text-sm text-text-2">A centred dialog on laptops, a bottom sheet on phones. Escape or a backdrop click closes it.</div>
          <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
            <Button variant="ghost" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setModal(false)}>
              Confirm
            </Button>
          </div>
        </Modal>
        <Drawer open={drawer} onClose={() => setDrawer(false)} label="Drawer">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <span className="text-sm font-semibold">Task details</span>
            <IconButton label="Close" onClick={() => setDrawer(false)}>
              <X className="size-4" />
            </IconButton>
          </div>
          <div className="p-5 text-sm text-text-2">The details panel for a task. It is a side drawer on laptops and a bottom sheet on phones.</div>
        </Drawer>
        <LeftSheet open={sheet} onClose={() => setSheet(false)} title="Calendars">
          <div className="p-5 text-sm text-text-2">The calendar list lives in a sheet that slides over the page from the left.</div>
        </LeftSheet>
      </Block>
    </Section>
  );
}

function Cards() {
  const today = useToday();
  const now = useNow(60_000);
  const list = (id: string, title: string, color: string): TaskList => ({ id, title, color });
  const base = (o: Partial<Task>): Task => ({ id: `demo_${o.title}`, listId: "l_work", title: "", notes: "", status: "needsAction", due: null, completedAt: null, updated: 0, created: 0, position: 0, meta: {}, ...o });
  const [bump, setBump] = useState(0);
  void bump;
  const work = list("l_work", "Work", "terracotta");
  const home = list("l_home", "Home", "olive");
  const learn = list("l_learn", "Learning", "plum");
  return (
    <Section id="cards" title="Task cards" intro="Compact, consistent, scannable. Title, preview, list, due date and priority. The same card works in a grid, a single column and the week columns.">
      <Block label="Card states" note="sample data only">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TaskCard selectedDay={null} list={work} task={base({ title: "Finalise onboarding flow handoff", notes: "Annotate edge cases for empty and error states. Share the Figma link with Dev and QA.", due: today, meta: { priority: "high" } })} />
          <TaskCard selectedDay={null} list={home} task={base({ listId: "l_home", title: "Call the plumber about the kitchen tap", due: addDays(today, -3), meta: { priority: "medium" } })} />
          <TaskCard selectedDay={null} list={learn} task={base({ listId: "l_learn", title: "Learn Tailwind v4 theming", notes: "CSS variables with @theme. Try a dark mode and an accent switcher.", due: addDays(today, 8) })} />
          <TaskCard selectedDay={null} list={work} task={base({ title: "Send invoice to Studio North", status: "completed", completedAt: now - 86_400_000 })} />
          <TaskCard selectedDay={today} list={work} task={base({ title: "Selected day highlight", notes: "A ring shows which cards belong to the day picked in the date row.", due: today, meta: { priority: "low" } })} />
          <TaskCard selectedDay={null} list={home} task={base({ listId: "l_home", title: "No date, no description" })} />
        </div>
      </Block>
      <Block label="Compact (week columns)">
        <div className="grid max-w-3xl grid-cols-3 gap-2">
          <TaskCard compact selectedDay={null} list={work} task={base({ title: "Write usability test script for checkout", due: today, meta: { priority: "high" } })} />
          <TaskCard compact selectedDay={null} list={home} task={base({ listId: "l_home", title: "Pay electricity bill", due: today, meta: { priority: "medium" } })} />
          <TaskCard compact selectedDay={null} list={learn} task={base({ listId: "l_learn", title: "Practise TypeScript generics", due: addDays(today, -1) })} />
        </div>
        <button className="mt-4 text-xs text-text-3 underline-offset-2 hover:underline" onClick={() => setBump((n) => n + 1)}>
          Cards are static demos; their actions don&apos;t change real tasks.
        </button>
      </Block>
    </Section>
  );
}

function CalendarPieces() {
  const today = useToday();
  const start = startOfWeek(today, 0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [sel, setSel] = useState<string | null>(null);
  return (
    <Section id="calendar" title="Calendar pieces" intro="The day / date row is one component shared by both tabs. Events are a soft tint of their calendar colour with no edge stripe.">
      <Block label="Day / date row" note="used by Calendar and Tasks" className="overflow-hidden p-0">
        <DayHeaders days={days} selected={sel} onPick={setSel} gutter="GMT +05:30" />
      </Block>
      <Block label="Event blocks">
        <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
          {PALETTE_KEYS.map((k) => (
            <div key={k} className={cn("rounded-[7px] px-2 py-1.5 text-[0.8125rem]", evSurface)} style={evVars(PALETTE[k].hex)}>
              <div className="font-semibold">{PALETTE[k].name} event</div>
              <div className="tnum text-xs text-text-2">10:00 AM – 11:00 AM</div>
            </div>
          ))}
        </div>
      </Block>
      <Block label="Chips and markers">
        <div className="flex flex-wrap items-center gap-6">
          <div className={cn("flex h-5 items-center rounded-[5px] px-1.5 text-xs font-medium", evSurface)} style={evVars(PALETTE.rose.hex)}>
            Riya&apos;s birthday
          </div>
          <div className="flex h-5 items-center gap-1.5 rounded-[5px] px-1.5 text-xs">
            <span className="size-2 rounded-full" style={{ background: PALETTE.olive.hex }} />
            <span className="tnum text-text-2">9 AM</span>
            <span className="font-medium">Morning run</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-2">
            <span className="size-2.5 rounded-full bg-danger" />
            Now line
          </div>
          <span className="flex size-9 items-center justify-center rounded-full bg-semantic-primary text-[1.4rem] font-semibold leading-none text-semantic-on-primary">19</span>
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 py-0.5 pl-1.5 pr-2 text-xs font-medium text-text-2">
            <span className="size-2 rounded-full" style={{ background: PALETTE.terracotta.hex }} />
            Work
          </span>
          <span className="flex items-center gap-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Overdue · 3d</span>
        </div>
      </Block>
    </Section>
  );
}

function SyncStatic({ kind }: { kind: "synced" | "syncing" | "offline" | "error" }) {
  const map = {
    synced: { icon: <Check className="size-3.5 text-text" strokeWidth={3} />, label: "Synced just now" },
    syncing: { icon: <RefreshCw className="size-3.5 animate-spin text-text" />, label: "Syncing…" },
    offline: { icon: <CloudOff className="size-3.5 text-text" />, label: "Offline" },
    error: { icon: <AlertTriangle className="size-3.5" />, label: "Sync failed" },
  } as const;
  return (
    <span className={cn("flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-surface-2", kind === "error" ? "text-danger" : "text-text")}>
      {map[kind].icon}
      {map[kind].label}
    </span>
  );
}

function Feedback() {
  const toast = useUI((s) => s.toast);
  return (
    <Section id="feedback" title="Feedback and states" intro="Toasts, loading skeletons, empty states and the sync indicator.">
      <Block label="Toasts" note="bottom-left on laptops">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast("Task added to Work")}>
            Default
          </Button>
          <Button variant="secondary" onClick={() => toast("Task completed", { action: { label: "Undo", onClick: () => toast("Undone") } })}>
            With undo
          </Button>
          <Button variant="secondary" onClick={() => toast("Couldn't save that change. It was undone.", { tone: "error" })}>
            Error
          </Button>
        </div>
      </Block>
      <Block label="Sync status">
        <div className="flex flex-wrap items-center gap-2">
          <SyncStatic kind="synced" />
          <SyncStatic kind="syncing" />
          <SyncStatic kind="offline" />
          <SyncStatic kind="error" />
        </div>
      </Block>
      <div className="grid gap-8 md:grid-cols-2">
        <Block label="Loading skeletons">
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-[5.5rem] w-full rounded-xl" />
          </div>
        </Block>
        <Block label="Empty state">
          <EmptyState icon={<CalendarX2 className="size-5" />} title="A clear stretch ahead" body="No events in the next couple of months for the calendars you're showing." action={<Button variant="primary">Create event</Button>} />
        </Block>
      </div>
      <Block label="Notes and labels">
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-surface-2 px-4 py-3 text-[0.8125rem] leading-relaxed text-text-2">An inline note. Used for honest limits such as “Google Tasks stores a date only, not a time.”</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="muted">This app only</Badge>
            <Badge tone="muted">Starts from Google · app only</Badge>
            <Badge tone="muted">Not supported by Google</Badge>
            <span className="flex items-center gap-1 text-xs text-text-2">
              <CheckCircle2 className="size-3.5 text-ok" /> Saved
            </span>
          </div>
        </div>
      </Block>
    </Section>
  );
}

function Motion() {
  const [n, setN] = useState(0);
  const items = [
    ["Pop in", "anim-pop"],
    ["Fade", "anim-fade"],
    ["Sheet up", "anim-sheet"],
    ["Slide right", "anim-right"],
    ["Slide left", "anim-left"],
    ["Check pop", "anim-check"],
  ];
  return (
    <Section id="motion" title="Motion" intro="Short, ease-out, never decorative. Everything respects reduced-motion settings.">
      <Block label="Entrances" note="100–200 ms">
        <div className="mb-4">
          <Button size="sm" variant="secondary" icon={<RefreshCw className="size-3.5" />} onClick={() => setN((x) => x + 1)}>
            Replay
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map(([l, c]) => (
            <div key={`${c}-${n}`} className={cn("flex h-20 items-center justify-center rounded-lg border border-border bg-surface-2 text-sm", c)}>
              {l}
            </div>
          ))}
        </div>
      </Block>
    </Section>
  );
}
