"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, CheckCircle2, Cloud, Keyboard, LogIn, Palette, Settings, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Badge } from "@/components/ui/Controls";
import { LogoMark } from "./Logo";
import { SyncPill } from "./SyncPill";
import { useUI } from "@/lib/store/ui";

/** Calendar and Tasks are the product. "Design system" is a temporary reference tab: delete its entry to remove it. */
export const TABS = [
  { href: "/calendar", label: "Calendar", short: "Calendar", icon: CalendarDays },
  { href: "/tasks", label: "Tasks", short: "Tasks", icon: CheckCircle2 },
  { href: "/design-system", label: "Design system", short: "Design", icon: Palette },
] as const;

export function Header() {
  const path = usePathname();
  const openSettings = useUI((s) => s.openSettings);
  const toast = useUI((s) => s.toast);

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
        <SyncPill />
        <IconButton label="Settings" onClick={() => openSettings()}>
          <Settings className="size-[1.15rem]" />
        </IconButton>
        <Menu
          placement="bottom-end"
          className="w-64"
          trigger={
            <button aria-label="Account" className="ml-1 flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-on-accent transition-transform hover:scale-105 active:scale-95">
              A
            </button>
          }
          items={[
            { type: "label", label: "Account" },
            { label: "Anjali", hint: "Demo mode", icon: <Cloud className="size-4" />, onSelect: () => openSettings("account") },
            { type: "sep" },
            { label: "Connect Google account", icon: <LogIn className="size-4" />, onSelect: () => toast("Google connection arrives in the next phase. You're viewing sample data.") },
            { label: "Account & sync settings", icon: <SlidersHorizontal className="size-4" />, onSelect: () => openSettings("account") },
            { label: "Keyboard shortcuts", icon: <Keyboard className="size-4" />, onSelect: () => openSettings("shortcuts") },
          ]}
        />
      </div>
    </header>
  );
}

export function DemoBadge() {
  return <Badge tone="muted">Sample data</Badge>;
}
