"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { TABS } from "./Header";

/** Phone navigation: the same two tabs, thumb-reachable at the bottom. */
export function MobileNav() {
  const path = usePathname();
  return (
    <nav aria-label="Primary" className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <ul className="grid h-14" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
        {TABS.map(({ href, short, icon: Icon }) => {
          const active = path.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className="flex h-full flex-col items-center justify-center gap-0.5 text-[0.6875rem] font-medium">
                <span className={cn("flex h-7 w-14 items-center justify-center rounded-full transition-colors", active ? "bg-accent-soft text-accent" : "text-text-3")}>
                  <Icon className="size-5" />
                </span>
                <span className={active ? "text-text" : "text-text-3"}>{short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
