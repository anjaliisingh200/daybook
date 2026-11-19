"use client";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { ThemeEffects } from "./ThemeEffects";
import { Reminders } from "./Reminders";
import { Toaster } from "@/components/ui/Toaster";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EventLayers } from "@/components/calendar/EventLayers";
import { TaskLayers } from "@/components/tasks/TaskLayers";
import { useData } from "@/lib/store/data";
import { useUI } from "@/lib/store/ui";
import { usePrefs } from "@/lib/store/prefs";
import { useToday } from "@/lib/hooks";
import { Skeleton } from "@/components/ui/Controls";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function AppShell({ children }: { children: ReactNode }) {
  const mounted = useMounted();
  if (!mounted) return <ShellSkeleton />;
  return <ShellInner>{children}</ShellInner>;
}

function ShellSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-4 border-b border-border px-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const router = useRouter();
  const load = useData((s) => s.load);
  const sync = useData((s) => s.sync);
  const status = useData((s) => s.status);
  const lastSync = useData((s) => s.syncedAt);
  const today = useToday();
  const overdueSummary = usePrefs((p) => p.overdueSummary);
  const warned = useRef(false);

  useEffect(() => {
    void load();
  }, [load]);

  // Sensible refresh strategy: poll while visible, refresh on focus/reconnect.
  useEffect(() => {
    const poll = () => {
      if (document.visibilityState === "visible") void sync({ silent: true });
    };
    const id = setInterval(poll, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible" && Date.now() - (useData.getState().syncedAt ?? 0) > 30_000) void sync({ silent: true });
    };
    const onOnline = () => void sync({ silent: true });
    const onOffline = () => useData.setState({ syncState: "offline" });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [sync, lastSync]);

  // One gentle summary per session
  useEffect(() => {
    if (status !== "ready" || warned.current || !overdueSummary) return;
    warned.current = true;
    try {
      if (sessionStorage.getItem("daybook.overdueShown")) return;
      sessionStorage.setItem("daybook.overdueShown", "1");
    } catch {
      /* ignore */
    }
    const n = useData.getState().tasks.filter((t) => t.status === "needsAction" && t.due && t.due < today).length;
    if (n > 0) {
      useUI.getState().toast(`${n} overdue ${n === 1 ? "task" : "tasks"}`, { action: { label: "Review", onClick: () => router.push("/tasks") }, duration: 7000 });
    }
  }, [status, overdueSummary, today, router]);

  return (
    <div className="flex h-full flex-col bg-bg">
      <ThemeEffects />
      <Reminders />
      <Header />
      <main className="min-h-0 flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <MobileNav />
      <EventLayers />
      <TaskLayers />
      <SettingsDialog />
      <Toaster />
    </div>
  );
}
