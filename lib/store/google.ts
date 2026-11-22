"use client";
import { create } from "zustand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useUI } from "./ui";

/** What the browser knows about the Google connection. The token itself never leaves the server. */
export interface GoogleState {
  /** The server has the Google keys set, so Connect can work. */
  configured: boolean;
  connected: boolean;
  email: string | null;
  /** Google rejected the saved permission; the user has to connect again. */
  needsReconnect: boolean;
  /** The status has been fetched at least once. */
  known: boolean;
  set: (p: Partial<Omit<GoogleState, "set">>) => void;
}

export const useGoogle = create<GoogleState>((set) => ({
  configured: false,
  connected: false,
  email: null,
  needsReconnect: false,
  known: false,
  set: (p) => set(p),
}));

/**
 * What the "Connect Google account" buttons do. A full page load, because Google's consent screen is another site.
 * Explains in plain words when it cannot work yet.
 */
export function connectGoogle(): void {
  const { toast } = useUI.getState();
  if (!isSupabaseConfigured) {
    toast("Google needs a Daybook account to attach to. Log in first (this copy is running on sample data).", { tone: "error" });
    return;
  }
  if (useGoogle.getState().known && !useGoogle.getState().configured) {
    toast("Google isn't set up on this server yet. See docs/GOOGLE-SETUP.md.", { tone: "error" });
    return;
  }
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/api/google/connect");
}

/** Cancels the connection, then reloads so the app goes back to its own data. */
export async function disconnectGoogle(): Promise<boolean> {
  const res = await fetch("/api/google/disconnect", { method: "POST" });
  if (!res.ok) return false;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/calendar");
  return true;
}
