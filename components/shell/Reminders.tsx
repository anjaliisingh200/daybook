"use client";
import { useEffect } from "react";
import { useData } from "@/lib/store/data";
import { usePrefs } from "@/lib/store/prefs";
import { useUI } from "@/lib/store/ui";
import { useFmt, useTz } from "@/lib/hooks";
import { expandEvent } from "@/lib/recurrence";
import { addDays, todayKey } from "@/lib/dates";

const FIRED_KEY = "daybook.fired.v1";

function loadFired(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * In-app event reminders. Runs while the app is open (a free-hosted web app
 * can't wake up in the background). Each occurrence fires at most once, which
 * is how we avoid duplicate notifications.
 */
export function Reminders() {
  const remind = usePrefs((p) => p.remindEvents);
  const lead = usePrefs((p) => p.remindLead);
  const browser = usePrefs((p) => p.browserNotifications);
  const tz = useTz();
  const fmt = useFmt();

  useEffect(() => {
    if (!remind) return;
    const tick = () => {
      const { events, calendars, status } = useData.getState();
      if (status !== "ready") return;
      const visible = usePrefs.getState().calendarVisible;
      const now = Date.now();
      const today = todayKey(tz, now);
      const fired = loadFired();
      let changed = false;
      for (const ev of events) {
        if (ev.allDay) continue;
        const cal = calendars.find((c) => c.id === ev.calendarId);
        if (!cal || visible[cal.id] === false) continue;
        for (const inst of expandEvent(ev, today, addDays(today, 1), tz)) {
          const startsIn = inst.start - now;
          if (startsIn > 0 && startsIn <= lead * 60_000 && !fired[inst.key]) {
            fired[inst.key] = now;
            changed = true;
            const mins = Math.max(1, Math.round(startsIn / 60_000));
            const msg = `${inst.title} starts in ${mins} min (${fmt.time(inst.start)})`;
            useUI.getState().toast(msg, { duration: 8000 });
            if (browser && typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(inst.title, { body: `Starts at ${fmt.time(inst.start)}`, tag: inst.key });
              } catch {
                /* some mobile browsers only allow service-worker notifications */
              }
            }
          }
        }
      }
      if (changed) {
        // keep the ledger small
        const cutoff = now - 3 * 86_400_000;
        for (const k of Object.keys(fired)) if (fired[k] < cutoff) delete fired[k];
        try {
          localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
        } catch {
          /* ignore */
        }
      }
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [remind, lead, browser, tz, fmt]);

  return null;
}
