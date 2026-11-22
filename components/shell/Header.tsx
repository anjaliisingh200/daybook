"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Cloud, Keyboard, LogIn, LogOut, Palette, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { Menu } from "@/components/ui/Menu";
import { Badge } from "@/components/ui/Controls";
import { LogoMark } from "./Logo";
import { connectGoogle, useGoogle } from "@/lib/store/google";
import { useUI } from "@/lib/store/ui";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/lib/supabase/signOut";

/** The design system page is a development reference. It is shown in `npm run dev` only, never in production. */
export const SHOW_DESIGN_SYSTEM = process.env.NODE_ENV !== "production";

/** Calendar and Tasks are the product. */
export const TABS = [
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", short: "Tasks", icon: CheckCircle2 },
  ...(SHOW_DESIGN_SYSTEM ? [{ href: "/design-system", label: "Design system", short: "Design", icon: Palette }] : []),
];

export function Header() {
  const path = usePathname();
  const openSettings = useUI((s) => s.openSettings);
  const google = useGoogle();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void supabaseBrowser().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  const initial = (email?.[0] ?? "A").toUpperCase();

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-bg px-3 md:gap-6 md:px-5">
      <Link href="/calendar" className="flex items-center gap-2.5" aria-label="Daybook home">
        <LogoMark />
        <span className="font-display text-[1.45rem] leading-none tracking-tight">Daybook</span>
      </Link>

      {/* Two product tabs, plus a temporary Design system tab */}
      <nav aria-label="Primary" className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:block">
        <ul className="flex rounded-xl bg-surface-2 p-1">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = path.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-8 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all duration-150",
                    active ? "bg-raised text-text shadow-sm" : "text-text-2 hover:text-text"
                  )}
                >
                  <Icon className={cn("size-4", active && "text-accent")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Menu
          placement="bottom-end"
          className="w-64"
          trigger={
            <button aria-label="Account" className="ml-1 flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent transition-transform hover:scale-105 active:scale-95">
              {initial}
            </button>
          }
          items={[
            { type: "label", label: "Account" },
            isSupabaseConfigured
              ? { label: email ?? "Signed in", hint: "Signed in", icon: <Cloud className="size-4" />, onSelect: () => openSettings("account") }
              : { label: "Anjali", hint: "Demo mode", icon: <Cloud className="size-4" />, onSelect: () => openSettings("account") },
            { type: "sep" },
            google.connected && !google.needsReconnect
              ? { label: google.email ?? "Google account", hint: "Connected", icon: <LogIn className="size-4" />, onSelect: () => openSettings("account") }
              : { label: google.needsReconnect ? "Reconnect Google" : "Connect Google account", icon: <LogIn className="size-4" />, onSelect: connectGoogle },
            { label: "Settings", icon: <Settings className="size-4" />, onSelect: () => openSettings() },
            { label: "Account & sync settings", icon: <SlidersHorizontal className="size-4" />, onSelect: () => openSettings("account") },
            { label: "Keyboard shortcuts", icon: <Keyboard className="size-4" />, onSelect: () => openSettings("shortcuts") },
            ...(isSupabaseConfigured ? [{ type: "sep" as const }, { label: "Log out", icon: <LogOut className="size-4" />, onSelect: () => void signOut() }] : []),
          ]}
        />
      </div>
    </header>
  );
}

export function DemoBadge() {
  return <Badge tone="muted">Sample data</Badge>;
}
