"use client";
import { cloneElement, useEffect, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react-dom";

interface Props {
  label: string;
  shortcut?: string;
  children: ReactElement<Record<string, unknown>>;
  placement?: "top" | "bottom" | "left" | "right";
  /** Milliseconds before it appears. Default 150. Use 0 to show it with the hover effect. */
  delay?: number;
}

/** Hover/focus tooltip. Hidden on touch (no hover) and never steals focus. */
export function Tooltip({ label, shortcut, children, placement = "bottom", delay = 150 }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { refs, floatingStyles, isPositioned } = useFloating({
    placement,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    refs.setReference(anchor);
  }, [anchor, refs]);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const show = (e: { currentTarget: EventTarget & Element }) => {
    setAnchor(e.currentTarget as HTMLElement);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(true), delay);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    setShown(false);
  };

  const props = children.props as Record<string, (e: never) => void>;
  // eslint-disable-next-line react-hooks/refs
  const child = cloneElement(children, {
    onMouseEnter: (e: React.MouseEvent) => {
      show(e);
      props.onMouseEnter?.(e as never);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide();
      props.onMouseLeave?.(e as never);
    },
    onPointerDown: (e: React.PointerEvent) => {
      hide();
      props.onPointerDown?.(e as never);
    },
    onFocus: (e: React.FocusEvent) => {
      if ((e.currentTarget as HTMLElement).matches(":focus-visible")) show(e);
      props.onFocus?.(e as never);
    },
    onBlur: (e: React.FocusEvent) => {
      hide();
      props.onBlur?.(e as never);
    },
  });

  return (
    <>
      {child}
      {shown &&
        anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 90, visibility: isPositioned ? "visible" : "hidden" }}
            role="tooltip"
            className="anim-fade pointer-events-none rounded-md bg-tooltip px-2 py-1 text-xs font-medium text-tooltip-text shadow-md"
          >
            {label}
            {shortcut && <kbd className="ml-1.5 rounded bg-tooltip-key px-1 font-sans text-[0.6875rem]">{shortcut}</kbd>}
          </div>,
          document.body
        )}
    </>
  );
}
