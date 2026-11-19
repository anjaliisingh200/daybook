"use client";
import { create } from "zustand";
import type { CalView, DateKey, EventInstance, Priority, Recurrence } from "@/lib/types";
import type { RepeatPreset } from "@/lib/recurrence";

export interface Toast {
  id: number;
  message: string;
  tone: "default" | "error";
  action?: { label: string; onClick: () => void };
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function toRect(r: DOMRect | Rect): Rect {
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
}

/** Form state for creating/editing an event. Times are wall-clock in the user's display zone. */
export interface EventDraft {
  /** Existing event id (undefined = creating). */
  id?: string;
  /** For recurring events: the occurrence being edited. */
  seriesDate?: DateKey;
  isRecurring?: boolean;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  startDate: DateKey;
  startMin: number;
  endDate: DateKey;
  endMin: number;
  repeat: RepeatPreset;
  recurrence?: Recurrence;
  guests?: string[];
  meetLink?: string;
}

export interface TaskFilters {
  lists: string[];
  priorities: Priority[];
  due: "any" | "overdue" | "today" | "week" | "none";
}

export const NO_FILTERS: TaskFilters = { lists: [], priorities: [], due: "any" };

interface UIStore {
  toasts: Toast[];
  toast: (message: string, opts?: { tone?: Toast["tone"]; action?: Toast["action"]; duration?: number }) => void;
  dismissToast: (id: number) => void;

  // calendar navigation (null = not chosen yet: follow today / the preference)
  calAnchor: DateKey | null;
  calView: CalView | null;
  setCalAnchor: (k: DateKey) => void;
  setCalView: (v: CalView) => void;
  calSearch: string;
  setCalSearch: (q: string) => void;

  eventPopover: { instance: EventInstance; rect: Rect } | null;
  openEventPopover: (instance: EventInstance, rect: Rect) => void;
  closeEventPopover: () => void;
  quickCreate: { rect: Rect; draft: EventDraft } | null;
  openQuickCreate: (rect: Rect, draft: EventDraft) => void;
  closeQuickCreate: () => void;
  eventEditor: EventDraft | null;
  openEventEditor: (draft: EventDraft) => void;
  closeEventEditor: () => void;

  // tasks
  taskPanelId: string | null;
  /** Task waiting for delete confirmation. */
  taskToDelete: string | null;
  setTaskToDelete: (id: string | null) => void;
  openTask: (id: string | null) => void;
  quickAdd: { due?: DateKey | null; listId?: string } | null;
  openQuickAdd: (opts?: { due?: DateKey | null; listId?: string }) => void;
  closeQuickAdd: () => void;
  tasksWeekAnchor: DateKey | null;
  tasksSelected: DateKey | null;
  setTasksWeekAnchor: (k: DateKey | null) => void;
  setTasksSelected: (k: DateKey | null) => void;
  tasksView: "day" | "week" | "month";
  setTasksView: (v: "day" | "week" | "month") => void;
  taskQuery: string;
  setTaskQuery: (q: string) => void;
  taskFilters: TaskFilters;
  setTaskFilters: (f: TaskFilters) => void;
  completedOpen: boolean;
  setCompletedOpen: (v: boolean) => void;

  // settings
  settings: { section: string } | null;
  openSettings: (section?: string) => void;
  closeSettings: () => void;
}

let toastId = 0;

export const useUI = create<UIStore>((set, get) => ({
  toasts: [],
  toast: (message, opts) => {
    const id = ++toastId;
    set({ toasts: [...get().toasts.slice(-2), { id, message, tone: opts?.tone ?? "default", action: opts?.action }] });
    setTimeout(() => get().dismissToast(id), opts?.duration ?? (opts?.action ? 6500 : 3800));
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  calAnchor: null,
  calView: null,
  setCalAnchor: (k) => set({ calAnchor: k }),
  setCalView: (v) => set({ calView: v }),
  calSearch: "",
  setCalSearch: (q) => set({ calSearch: q }),

  eventPopover: null,
  openEventPopover: (instance, rect) => set({ eventPopover: { instance, rect }, quickCreate: null }),
  closeEventPopover: () => set({ eventPopover: null }),
  quickCreate: null,
  openQuickCreate: (rect, draft) => set({ quickCreate: { rect, draft }, eventPopover: null }),
  closeQuickCreate: () => set({ quickCreate: null }),
  eventEditor: null,
  openEventEditor: (draft) => set({ eventEditor: draft, eventPopover: null, quickCreate: null }),
  closeEventEditor: () => set({ eventEditor: null }),

  taskPanelId: null,
  taskToDelete: null,
  setTaskToDelete: (id) => set({ taskToDelete: id }),
  openTask: (id) => set({ taskPanelId: id }),
  quickAdd: null,
  openQuickAdd: (opts) => set({ quickAdd: opts ?? {} }),
  closeQuickAdd: () => set({ quickAdd: null }),
  tasksWeekAnchor: null,
  tasksSelected: null,
  setTasksWeekAnchor: (k) => set({ tasksWeekAnchor: k }),
  setTasksSelected: (k) => set({ tasksSelected: k }),
  tasksView: "week",
  setTasksView: (v) => set({ tasksView: v }),
  taskQuery: "",
  setTaskQuery: (q) => set({ taskQuery: q }),
  taskFilters: NO_FILTERS,
  setTaskFilters: (f) => set({ taskFilters: f }),
  completedOpen: true,
  setCompletedOpen: (v) => set({ completedOpen: v }),

  settings: null,
  openSettings: (section = "general") => set({ settings: { section } }),
  closeSettings: () => set({ settings: null }),
}));
