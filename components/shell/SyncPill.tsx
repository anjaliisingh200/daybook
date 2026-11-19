"use client";
import { AlertTriangle, Check, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useData } from "@/lib/store/data";
import { useNow } from "@/lib/hooks";
import { Tooltip } from "@/components/ui/Tooltip";

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/** Sync status + manual sync in one control. */
export function SyncPill() {
  const state = useData((s) => s.syncState);
  const at = useData((s) => s.syncedAt);
  const status = useData((s) => s.status);
  const sync = useData((s) => s.sync);
  const kind = useData((s) => s.repoKind);
  const now = useNow(15_000);

  const syncing = state === "syncing" || status === "loading";
  const label = syncing ? "Syncing…" : state === "offline" ? "Offline" : state === "error" ? "Sync failed" : at ? `Synced ${ago(now - at)}` : "Not synced";
  const tip = kind === "mock" ? "Sample data. Google isn't connected yet. Click to sync now." : "Click to sync now";

  return (
    <Tooltip label={tip}>
      <button
        onClick={() => void sync()}
        disabled={syncing}
        aria-label={`${label}. Sync now`}
        className={cn(
          "mr-1 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors hover:bg-surface-2 md:px-3",
          state === "error" ? "text-danger" : "text-text"
        )}
      >
        {syncing ? (
          <RefreshCw className="size-3.5 animate-spin text-text" />
        ) : state === "offline" ? (
          <CloudOff className="size-3.5 text-text" />
        ) : state === "error" ? (
          <AlertTriangle className="size-3.5" />
        ) : (
          <Check className="size-3.5 text-text" strokeWidth={3} />
        )}
        <span className="hidden sm:inline">{label}</span>
      </button>
    </Tooltip>
  );
}
