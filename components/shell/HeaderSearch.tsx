"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { addDays } from "@/lib/dates";
import { useCalendarViews, useFmt, useIsMobile, useToday, useTz } from "@/lib/hooks";
import { expandEvent } from "@/lib/recurrence";
import { useData } from "@/lib/store/data";
import { toRect, useUI } from "@/lib/store/ui";

/**
 * The one search of the app: an icon in the top header, to the left of the profile circle. On the Tasks page it searches
 * tasks (the list filters as you type); on the Calendar page it searches events (results drop down, and choosing one opens it).
 * It is not on other pages. Pressing "/" opens it.
 */
export function HeaderSearch() {
  const path = usePathname();
  const mode = path.startsWith("/tasks") ? "tasks" : path.startsWith("/calendar") ? "calendar" : null;
  return mode ? <SearchBox key={mode} mode={mode} /> : null;
}

function SearchBox({ mode }: { mode: "tasks" | "calendar" }) {
  const [open, setOpen] = useState(false);
  const [eventQ, setEventQ] = useState("");
  const taskQ = useUI((s) => s.taskQuery);
  const setTaskQ = useUI((s) => s.setTaskQuery);
  const q = mode === "tasks" ? taskQ : eventQ;
  const setQ = mode === "tasks" ? setTaskQ : setEventQ;
  const inputRef = useRef<HTMLInputElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const events = useData((s) => s.events);
  const cals = useCalendarViews();
  const tz = useTz();
  const today = useToday();
  const fmt = useFmt();
  const setAnchor = useUI((s) => s.setCalAnchor);
  const setView = useUI((s) => s.setCalView);
  const openPopover = useUI((s) => s.openEventPopover);
  const mobile = useIsMobile();

  // "/" opens the search (unless you are typing somewhere)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(el.tagName) && !el.isContentEditable) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Leaving the page clears a task search, so it cannot keep filtering the list where you cannot see it.
  useEffect(
    () => () => {
      if (mode === "tasks") useUI.getState().setTaskQuery("");
    },
    [mode]
  );

  const results = useMemo(() => {
    if (mode !== "calendar") return [];
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const from = addDays(today, -183);
    const to = addDays(today, 365);
    const vis = new Map(cals.map((c) => [c.id, c]));
    const out = [];
    for (const ev of events) {
      const hay = `${ev.title} ${ev.description ?? ""} ${ev.location ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) continue;
      out.push(...expandEvent(ev, from, to, tz));
    }
    // upcoming first, then past (nearest first); cap recurrence noise
    const seen = new Map<string, number>();
    return out
      .sort((a, b) => {
        const au = a.startDate >= today ? 0 : 1;
        const bu = b.startDate >= today ? 0 : 1;
        return au - bu || (au === 0 ? a.startDate.localeCompare(b.startDate) : b.startDate.localeCompare(a.startDate)) || a.start - b.start;
      })
      .filter((i) => {
        const n = (seen.get(i.event.id) ?? 0) + 1;
        seen.set(i.event.id, n);
        return n <= 3;
      })
      .slice(0, 12)
      .map((i) => ({ i, cal: vis.get(i.calendarId) }));
  }, [mode, q, events, cals, tz, today]);

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const label = mode === "tasks" ? "Search tasks" : "Search events";

  return (
    <>
      {open ? (
        // on a phone the search takes the whole header while it is open; on a wide screen it opens beside the icons
        <div ref={setAnchorEl} className="flex items-center max-md:absolute max-md:inset-0 max-md:z-10 max-md:bg-bg max-md:px-3 md:w-72">
          <div className="flex h-9 w-full items-center gap-2 rounded-full border border-border-strong bg-surface px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
            <Search className="size-4 shrink-0 text-text-3" />
            <input
              ref={inputRef}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && close()}
              placeholder={label}
              aria-label={label}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
            />
            <button onClick={close} aria-label="Close search" className="text-text-3 hover:text-text">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <IconButton label="Search" shortcut="/" onClick={() => setOpen(true)}>
          <Search className="size-5" />
        </IconButton>
      )}

      {mode === "calendar" && (
        <Popover open={open && q.trim().length >= 2} onClose={() => {}} anchor={anchorEl} placement="bottom-end" className="w-[min(92vw,24rem)]" ignore={anchorEl} role="listbox" label="Search results">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-2">No events match “{q.trim()}”.</p>
          ) : (
            <ul className="p-1.5">
              {results.map(({ i, cal }) => (
                <li key={i.key}>
                  <button
                    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left hover:bg-surface-2"
                    onClick={(e) => {
                      const rect = toRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                      setAnchor(i.startDate);
                      if (mobile) setView("day");
                      close();
                      setTimeout(() => openPopover(i, mobile ? { ...rect, top: window.innerHeight / 3, bottom: window.innerHeight / 3 + 1, height: 1 } : { ...rect, left: window.innerWidth / 2 - 40, right: window.innerWidth / 2 + 40, width: 80 }), 80);
                    }}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: cal?.hex }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{i.title}</span>
                      <span className="block truncate text-xs text-text-2">
                        {fmt.dayShort(i.startDate)}
                        {i.allDay ? "" : ` · ${fmt.time(i.start)}`}
                        {cal ? ` · ${cal.name}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Popover>
      )}
    </>
  );
}
