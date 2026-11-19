"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { LogoMark } from "@/components/shell/Logo";
import { Button } from "@/components/ui/Button";
import { RoundCheck } from "@/components/ui/Controls";
import { cn } from "@/lib/cn";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AuthDialog } from "./AuthDialog";

/** The home page: one hero. "Log in" opens the sign-in popup; signing in opens the app. */
export function Hero() {
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up" | null>(null);
  const start = (m: "in" | "up") => (isSupabaseConfigured ? setMode(m) : router.push("/calendar"));

  return (
    <main className="relative min-h-dvh overflow-hidden bg-bg">
      {/* soft warm glow behind the preview */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -top-40 size-[44rem] rounded-full opacity-70"
        style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 14%, transparent), transparent)" }}
      />

      <div className="relative mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6 md:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="font-display text-2xl leading-none">Daybook</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => start("in")}>
            {isSupabaseConfigured ? "Log in" : "Open app"}
          </Button>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-text-2">Calendar and tasks, together</span>
            <h1 className="mt-5 font-display text-5xl leading-[1.04] text-text md:text-6xl lg:text-7xl">
              Plan the day.
              <br />
              Finish the work.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-text-2 md:text-lg">
              One calm place for your week. Events and tasks stay in step, so what you plan is what you do.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="lg" onClick={() => start("in")}>
                {isSupabaseConfigured ? "Log in" : "Open Daybook"}
              </Button>
              {isSupabaseConfigured && (
                <Button variant="ghost" size="lg" onClick={() => start("up")}>
                  Create an account
                </Button>
              )}
            </div>
            <ul className="mt-8 space-y-2 text-sm text-text-2">
              {["Drag tasks between days, or move them with the keyboard", "Every event has a task, and they stay linked", "Works on your phone and your desktop"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-success" strokeWidth={2.5} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <Preview />
        </div>
      </div>

      {isSupabaseConfigured && mode && <AuthDialog open onClose={() => setMode(null)} initial={mode} />}
    </main>
  );
}

const DAYS: { name: string; num: number; events: { t: string; top: number; h: number; c: string; done?: boolean }[] }[] = [
  { name: "Mon", num: 16, events: [{ t: "Sprint planning", top: 18, h: 58, c: "#3F51B5" }] },
  { name: "Tue", num: 17, events: [{ t: "Portfolio review", top: 70, h: 46, c: "#0B8043" }] },
  {
    name: "Wed",
    num: 18,
    events: [
      { t: "Design critique", top: 6, h: 48, c: "#8E24AA" },
      { t: "Haircut", top: 98, h: 30, c: "#f4511E" },
    ],
  },
  {
    name: "Thu",
    num: 19,
    events: [
      { t: "Stand-up", top: 4, h: 28, c: "#0B8043", done: true },
      { t: "Client call", top: 46, h: 66, c: "#3F51B5" },
    ],
  },
  { name: "Fri", num: 20, events: [{ t: "Pairing", top: 30, h: 72, c: "#8E24AA" }] },
];

const TASKS = [
  { t: "Send the proposal", done: false },
  { t: "Design stand-up", done: true },
  { t: "Book flights for March", done: false },
];

/** A small, non-interactive picture of the real app: a week and a few task cards. */
function Preview() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-xl select-none lg:max-w-none">
      <div className="rounded-2xl border border-border bg-surface shadow-lg">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="ml-3 font-display text-lg leading-none">November 2026</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5">
          {DAYS.map((d, i) => {
            const today = d.num === 19;
            return (
              <div key={d.name} className={cn("border-l border-border first:border-l-0", i < 2 && "hidden sm:block")}>
                <div className="py-2.5 text-center">
                  <div className={cn("text-[0.625rem] font-medium uppercase tracking-wider", today ? "text-accent" : "text-text-3")}>{d.name}</div>
                  <div className={cn("mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full font-display text-lg leading-none", today ? "bg-accent text-on-accent" : "text-text")}>{d.num}</div>
                </div>
                <div className={cn("relative h-36 border-t border-border", today && "bg-accent-soft/50")}>
                  {d.events.map((e) => (
                    <div
                      key={e.t}
                      className="absolute inset-x-1 overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--ev)_17%,var(--surface))] px-1.5 py-1 text-[0.6875rem] font-medium leading-tight"
                      style={{ ["--ev" as string]: e.c, top: e.top, height: e.h }}
                    >
                      <span className={cn("line-clamp-2", e.done && "line-through decoration-text")}>{e.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-1 border-t border-border p-3">
          <div className="px-1 pb-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-3">Today&apos;s tasks</div>
          {TASKS.map((k) => (
            <div key={k.t} className="flex items-center gap-3 rounded-md px-1 py-1.5">
              <span className="pointer-events-none">
                <RoundCheck checked={k.done} onChange={() => {}} label={k.t} size={20} />
              </span>
              <span className={cn("text-[0.9375rem] font-medium", k.done && "line-through decoration-text")}>{k.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
