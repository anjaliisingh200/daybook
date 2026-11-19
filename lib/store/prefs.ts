"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CalView, DateFormat, Density, FontSize, OverdueStyle, TaskLayout, TaskSort,  } from "@/lib/types";

/**
 * App preferences. Every field here is APP-ONLY: it never writes back to
 * Google. Where Google exposes a matching read-only setting (week start, time
 * zone, 24h time …) we only use it as the initial default.
 */
export interface Prefs {
  // appearance
  density: Density;
  fontSize: FontSize;
  accent: string;
  // general
  language: string;
  region: "IN" | "US" | "UK" | "custom";
  dateFormat: DateFormat;
  timeFormat: "12" | "24";
  timeZone: string; // "auto" = follow the device
  // calendar
  defaultView: CalView;
  weekStart: 0 | 1 | 6;
  hideWeekends: boolean;
  defaultDuration: number;
  calendarVisible: Record<string, boolean>;
  calendarColors: Record<string, string>;
  sidebarOpen: boolean;
  showDeclined: boolean;
  // tasks
  defaultListId: string | null;
  taskSort: TaskSort;
  /** Off: a day lists tasks by priority, then newest. On: the order you drop tasks in is kept. */
  manualOrder: boolean;
  showCompleted: boolean;
  showUndated: boolean;
  taskLayout: TaskLayout;
  overdueStyle: OverdueStyle;
  // notifications
  remindEvents: boolean;
  remindLead: number;
  browserNotifications: boolean;
  overdueSummary: boolean;
}

export const REGION_PRESETS: Record<"IN" | "US" | "UK", Pick<Prefs, "language" | "dateFormat" | "timeFormat" | "weekStart">> = {
  IN: { language: "en-IN", dateFormat: "dmy", timeFormat: "12", weekStart: 0 },
  US: { language: "en-US", dateFormat: "mdy", timeFormat: "12", weekStart: 0 },
  UK: { language: "en-GB", dateFormat: "dmy", timeFormat: "24", weekStart: 1 },
};

export const DEFAULT_PREFS: Prefs = {
  density: "comfortable",
  fontSize: "medium",
  accent: "olive",
  language: "en-IN",
  region: "IN",
  dateFormat: "long",
  timeFormat: "12",
  timeZone: "auto",
  defaultView: "week",
  weekStart: 0,
  hideWeekends: false,
  defaultDuration: 30,
  calendarVisible: {},
  calendarColors: {},
  sidebarOpen: true,
  showDeclined: true,
  defaultListId: null,
  taskSort: "due",
  manualOrder: false,
  showCompleted: true,
  showUndated: true,
  taskLayout: "grid",
  overdueStyle: "highlight",
  remindEvents: true,
  remindLead: 10,
  browserNotifications: false,
  overdueSummary: true,
};

interface PrefsStore extends Prefs {
  hydrated: boolean;
  set: (patch: Partial<Prefs>) => void;
  applyRegion: (r: "IN" | "US" | "UK") => void;
  setCalendarVisible: (id: string, v: boolean) => void;
  setCalendarColor: (id: string, c: string | null) => void;
  resetAll: () => void;
}

export const usePrefs = create<PrefsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_PREFS,
      hydrated: false,
      set: (patch) => set(patch),
      applyRegion: (r) => set({ ...REGION_PRESETS[r], region: r }),
      setCalendarVisible: (id, v) => set({ calendarVisible: { ...get().calendarVisible, [id]: v } }),
      setCalendarColor: (id, c) => {
        const next = { ...get().calendarColors };
        if (c) next[id] = c;
        else delete next[id];
        set({ calendarColors: next });
      },
      resetAll: () => set({ ...DEFAULT_PREFS }),
    }),
    {
      name: "daybook.prefs",
      partialize: (s) => {
        const { hydrated: _h, set: _s, applyRegion: _a, setCalendarVisible: _v, setCalendarColor: _c, resetAll: _r, ...rest } = s;
        void _h; void _s; void _a; void _v; void _c; void _r;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
        usePrefs.setState({ hydrated: true });
      },
    }
  )
);
