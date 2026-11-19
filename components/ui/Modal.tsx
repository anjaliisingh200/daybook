"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "./Button";
import { useEscape } from "./Popover";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** On phones the dialog fills the screen instead of being a bottom sheet. */
  fullOnMobile?: boolean;
  hideClose?: boolean;
  className?: string;
  labelledBy?: string;
  /** Allow dismissing by clicking the backdrop (default true). */
  dismissable?: boolean;
}

const widths = { sm: "sm:max-w-[26rem]", md: "sm:max-w-[34rem]", lg: "sm:max-w-[44rem]", xl: "sm:max-w-[56rem]" };

export function Modal({ open, onClose, title, children, size = "md", fullOnMobile, hideClose, className, dismissable = true }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);
  useEscape(onClose, open);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => {
      const p = panel.current;
      if (!p) return;
      const target = p.querySelector<HTMLElement>("[data-autofocus]") ?? p.querySelector<HTMLElement>("input,textarea,button,[tabindex]");
      target?.focus();
    }, 30);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      prevFocus.current?.focus?.();
    };
  }, [open]);

  // Scrolling is allowed only inside the dialog's own scrollable area.
  // Anything else (the dimmed backdrop, or a scroll that has nowhere to go) is blocked,
  // so the page behind never moves.
  const canScrollWithin = (start: HTMLElement | null, dy: number) => {
    let el: HTMLElement | null = start;
    while (el && el !== panel.current) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return true;
      }
      el = el.parentElement;
    }
    return false;
  };
  const blockOutsideScroll = (e: React.WheelEvent) => {
    if (!canScrollWithin(e.target as HTMLElement, e.deltaY)) e.preventDefault();
  };

  // simple focus trap
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !panel.current) return;
    const f = Array.from(panel.current.querySelectorAll<HTMLElement>('button,[href],input,textarea,select,[tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute("disabled"));
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" onKeyDown={onKeyDown} onWheel={blockOutsideScroll}>
      <div className="anim-fade absolute inset-0 bg-[var(--overlay)]" onClick={dismissable ? onClose : undefined} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "anim-sheet sm:anim-pop relative flex w-full flex-col overflow-hidden border border-border bg-surface shadow-lg",
          "max-h-[92dvh] rounded-t-2xl sm:max-h-[88dvh] sm:rounded-xl",
          fullOnMobile && "h-[100dvh] max-h-none rounded-none sm:h-auto sm:max-h-[88dvh] sm:rounded-xl",
          widths[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
            {!hideClose && (
              <IconButton label="Close" size="sm" onClick={onClose} noTooltip>
                <X className="size-4" />
              </IconButton>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Slide-over used for task details on desktop; bottom sheet on phones. */
export function Drawer({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEscape(onClose, open);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Same rule as the dialogs: scrolling only moves the sheet's own scroll area, never the page behind.
  const blockOutsideScroll = (e: React.WheelEvent) => {
    let el: HTMLElement | null = e.target as HTMLElement;
    while (el && el !== panel.current) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) {
        const atTop = el.scrollTop <= 0;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
        if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
      }
      el = el.parentElement;
    }
    e.preventDefault();
  };

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40" onWheel={blockOutsideScroll}>
      <div className="anim-fade absolute inset-0 bg-[var(--overlay)] lg:bg-transparent" onClick={onClose} />
      <aside
        ref={panel}
        role="dialog"
        aria-label={label}
        className="anim-sheet lg:anim-right absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-lg lg:inset-y-3 lg:left-auto lg:right-3 lg:max-h-none lg:w-[26rem] lg:rounded-xl"
      >
        {children}
      </aside>
    </div>,
    document.body
  );
}

/** Slide-over panel from the left edge. Covers the page, closes on backdrop click or Escape. */
export function LeftSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEscape(onClose, open);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="anim-fade absolute inset-0 bg-[var(--overlay)]" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={title}
        className="anim-left absolute inset-y-0 left-0 flex w-[19rem] max-w-[88vw] flex-col overflow-hidden border-r border-border bg-surface shadow-lg md:inset-y-3 md:left-3 md:rounded-xl md:border"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="font-display text-xl">{title}</h2>
          <IconButton label="Close" size="sm" onClick={onClose} noTooltip>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>,
    document.body
  );
}
