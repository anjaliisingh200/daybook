"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { usePrefs } from "./store/prefs";
import { useData } from "./store/data";
import { makeFmt, type Fmt } from "./format";
import { systemTimeZone, todayKey } from "./dates";
import type { CalendarInfo, DateKey } from "./types";
import { hexOf } from "./colors";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}

/** < 768 px: phones. */
export const useIsMobile = () => useMediaQuery("(max-width: 767px)");

export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useTz(): string {
  const tz = usePrefs((p) => p.timeZone);
  return useMemo(() => (tz === "auto" ? systemTimeZone() : tz), [tz]);
}

export function useToday(): DateKey {
  const tz = useTz();
  const now = useNow(30_000);
  return todayKey(tz, now);
}

export function useFmt(): Fmt {
  const tz = useTz();
  const language = usePrefs((p) => p.language);
  const timeFormat = usePrefs((p) => p.timeFormat);
  const dateFormat = usePrefs((p) => p.dateFormat);
  return useMemo(() => makeFmt({ locale: language, timeZone: tz, hour12: timeFormat === "12", dateFormat }), [tz, language, timeFormat, dateFormat]);
}

/** Calendars with the user's app-only colour/visibility overrides applied. */
export interface CalendarView extends CalendarInfo {
  visible: boolean;
  colorKey: string;
  hex: string;
}

export function useCalendarViews(): CalendarView[] {
  const calendars = useData((s) => s.calendars);
  const visible = usePrefs((p) => p.calendarVisible);
  const colors = usePrefs((p) => p.calendarColors);
  return useMemo(
    () =>
      calendars.map((c) => {
        const colorKey = colors[c.id] ?? c.color;
        return { ...c, visible: visible[c.id] ?? true, colorKey, hex: hexOf(colorKey) };
      }),
    [calendars, visible, colors]
  );
}

type Handler = (e: KeyboardEvent) => void;

/** Global single-key shortcuts that stay out of the way of text fields. */
export function useHotkeys(map: Record<string, Handler>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      const fn = map[e.key];
      if (fn) fn(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
}
