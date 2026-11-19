"use client";
import { cloneElement, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, size, useFloating, type Placement } from "@floating-ui/react-dom";
import { cn } from "@/lib/cn";
import type { Rect } from "@/lib/store/ui";

// ── Escape handling: only the top-most layer reacts ──
const escStack: Array<() => void> = [];
export function useEscape(onEscape: () => void, enabled = true) {
  const ref = useRef(onEscape);
  useEffect(() => {
    ref.current = onEscape;
  });
  useEffect(() => {
    if (!enabled) return;
    const fn = () => ref.current();
    escStack.push(fn);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && escStack[escStack.length - 1] === fn) {
        e.stopPropagation();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      const i = escStack.indexOf(fn);
      if (i >= 0) escStack.splice(i, 1);
    };
  }, [enabled]);
}

export type Anchor = HTMLElement | Rect | null;

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: Anchor;
  placement?: Placement;
  offsetPx?: number;
  matchWidth?: boolean;
  className?: string;
  children: ReactNode;
  role?: string;
  /** Don't treat clicks on this element as "outside" (e.g. the trigger). */
  ignore?: HTMLElement | null;
  label?: string;
}

/** Anchored floating panel. Flips and shifts to stay on screen; closes on outside click and Escape. */
export function Popover({ open, onClose, anchor, placement = "bottom-start", offsetPx = 6, matchWidth, className, children, role = "dialog", ignore, label }: PopoverProps) {
  const { refs, floatingStyles, isPositioned } = useFloating({
    placement,
    middleware: [
      offset(offsetPx),
      flip({ padding: 8, fallbackAxisSideDirection: "end" }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, rects, elements }) {
          elements.floating.style.maxHeight = `${Math.max(180, availableHeight)}px`;
          if (matchWidth) elements.floating.style.minWidth = `${rects.reference.width}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useLayoutEffect(() => {
    if (!anchor) return refs.setReference(null);
    if (anchor instanceof HTMLElement) refs.setReference(anchor);
    else
      refs.setReference({
        getBoundingClientRect: () => ({ ...anchor, x: anchor.left, y: anchor.top, toJSON: () => ({}) }) as DOMRect,
      });
  }, [anchor, refs]);

  useEscape(onClose, open);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      const floating = refs.floating.current;
      if (floating?.contains(t)) return;
      if (ignore?.contains(t)) return;
      if (anchor instanceof HTMLElement && anchor.contains(t)) return;
      // clicks inside another floating layer (nested popover/menu) are not "outside"
      if ((t as HTMLElement).closest?.("[data-layer]")) {
        const layer = (t as HTMLElement).closest("[data-layer]");
        if (layer && layer !== floating) return;
      }
      onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, onClose, anchor, ignore, refs]);

  if (!open || !anchor || typeof document === "undefined") return null;
  return createPortal(
    <div
      // eslint-disable-next-line react-hooks/refs
      ref={refs.setFloating}
      data-layer
      role={role}
      aria-label={label}
      style={{ ...floatingStyles, zIndex: 60, visibility: isPositioned ? "visible" : "hidden" }}
      className={cn("anim-pop overflow-auto rounded-lg border border-border bg-surface shadow-lg", className)}
    >
      {children}
    </div>,
    document.body
  );
}

// ─────────────────────────── Dropdown (trigger + popover) ───────────────────────────

interface DropdownProps {
  trigger: ReactElement<Record<string, unknown>>;
  children: (close: () => void) => ReactNode;
  placement?: Placement;
  matchWidth?: boolean;
  className?: string;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}

/** Wraps any button; clicking it toggles a Popover with `children`. */
export function Dropdown({ trigger, children, placement = "bottom-start", matchWidth, className, open: controlled, onOpenChange }: DropdownProps) {
  const [inner, setInner] = useState(false);
  const open = controlled ?? inner;
  const setOpen = useCallback(
    (o: boolean) => {
      setInner(o);
      onOpenChange?.(o);
    },
    [onOpenChange]
  );
  const [el, setEl] = useState<HTMLElement | null>(null);
  const id = useId();

  const props = trigger.props as { onClick?: (e: unknown) => void };
  const child = isValidElement(trigger)
    ? cloneElement(trigger, {
        ref: setEl,
        "aria-haspopup": "true",
        "aria-expanded": open,
        "aria-controls": open ? id : undefined,
        onClick: (e: unknown) => {
          props.onClick?.(e);
          setOpen(!open);
        },
      } as Record<string, unknown>)
    : trigger;

  return (
    <>
      {child}
      <Popover open={open} onClose={() => setOpen(false)} anchor={el} placement={placement} matchWidth={matchWidth} className={className} role="menu" ignore={el}>
        {children(() => setOpen(false))}
      </Popover>
    </>
  );
}
