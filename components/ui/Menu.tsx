"use client";
import { useEffect, useRef, type ReactElement, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Placement } from "@floating-ui/react-dom";
import { cn } from "@/lib/cn";
import { Dropdown } from "./Popover";

export type MenuItem =
  | { type?: "item"; label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; checked?: boolean; disabled?: boolean; hint?: string; swatch?: string; keepOpen?: boolean }
  | { type: "sep" }
  | { type: "label"; label: string };

function useRovingFocus(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled]),[role=menuitemcheckbox]:not([disabled]),[role=option]:not([disabled])"));
    const selected = root.querySelector<HTMLElement>("[aria-checked=true],[aria-selected=true]");
    (selected ?? items()[0])?.focus({ preventScroll: false });
    selected?.scrollIntoView({ block: "nearest" });
    const onKey = (e: KeyboardEvent) => {
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        list[(i + 1) % list.length]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        list[(i - 1 + list.length) % list.length]?.focus();
      } else if (e.key === "Home") {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === "End") {
        e.preventDefault();
        list[list.length - 1]?.focus();
      }
    };
    root.addEventListener("keydown", onKey);
    return () => root.removeEventListener("keydown", onKey);
  }, [ref]);
}

export function MenuList({ items, close, className }: { items: MenuItem[]; close: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useRovingFocus(ref);
  return (
    <div ref={ref} className={cn("min-w-[11rem] p-1.5", className)}>
      {items.map((it, i) => {
        if (it.type === "sep") return <div key={i} className="my-1.5 h-px bg-border" />;
        if (it.type === "label")
          return (
            <div key={i} className="px-2.5 pb-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wider text-text-3">
              {it.label}
            </div>
          );
        return (
          <button
            key={i}
            role={it.checked === undefined ? "menuitem" : "menuitemcheckbox"}
            type="button"
            disabled={it.disabled}
            aria-checked={it.checked === undefined ? undefined : it.checked}
            onClick={() => {
              it.onSelect();
              if (!it.keepOpen) close();
            }}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors",
              "hover:bg-surface-2 focus-visible:bg-surface-2 disabled:opacity-40",
              it.danger ? "text-danger" : "text-text"
            )}
          >
            {it.swatch ? (
              <span className="size-3 shrink-0 rounded-full" style={{ background: it.swatch }} />
            ) : (
              it.icon && <span className="flex size-4 shrink-0 items-center justify-center text-text-2">{it.icon}</span>
            )}
            <span className="flex-1 truncate">{it.label}</span>
            {it.hint && <span className="text-xs text-text-3">{it.hint}</span>}
            {it.checked && <Check className="size-4 text-accent" />}
          </button>
        );
      })}
    </div>
  );
}

export function Menu({ trigger, items, placement = "bottom-end", className }: { trigger: ReactElement<Record<string, unknown>>; items: MenuItem[]; placement?: Placement; className?: string }) {
  return (
    <Dropdown trigger={trigger} placement={placement}>
      {(close) => <MenuList items={items} close={close} className={className} />}
    </Dropdown>
  );
}

// ───────────────────────────────── Select ─────────────────────────────────

export interface Option<T extends string | number> {
  value: T;
  label: string;
  swatch?: string;
  icon?: ReactNode;
  hint?: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
  variant?: "field" | "ghost";
  placeholder?: string;
  "aria-label"?: string;
  placement?: Placement;
  listClassName?: string;
  /** Optional custom label for the closed trigger */
  renderValue?: (o: Option<T> | undefined) => ReactNode;
}

export function Select<T extends string | number>({ value, options, onChange, className, size = "md", variant = "field", placeholder, placement = "bottom-start", listClassName, renderValue, ...rest }: SelectProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <Dropdown
      matchWidth
      placement={placement}
      trigger={
        <button
          type="button"
          aria-label={rest["aria-label"]}
          className={cn(
            "flex w-full items-center gap-2 text-left text-sm transition-colors",
            size === "sm" ? "h-8 rounded-md px-2.5" : "h-9 rounded-md px-3",
            variant === "field" ? "border border-border bg-surface hover:border-border-strong" : "hover:bg-surface-2",
            className
          )}
        >
          {renderValue ? (
            renderValue(current)
          ) : (
            <>
              {current?.swatch && <span className="size-2.5 shrink-0 rounded-full" style={{ background: current.swatch }} />}
              {current?.icon}
              <span className={cn("flex-1 truncate", !current && "text-text-3")}>{current?.label ?? placeholder ?? "Select"}</span>
            </>
          )}
          <ChevronDown className="size-4 shrink-0 text-text-3" />
        </button>
      }
    >
      {(close) => (
        <SelectList
          options={options}
          value={value}
          className={listClassName}
          onPick={(v) => {
            onChange(v);
            close();
          }}
        />
      )}
    </Dropdown>
  );
}

export function SelectList<T extends string | number>({ options, value, onPick, className }: { options: Option<T>[]; value: T; onPick: (v: T) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useRovingFocus(ref);
  return (
    <div ref={ref} role="listbox" className={cn("max-h-72 min-w-[10rem] overflow-auto p-1.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          role="option"
          type="button"
          aria-selected={o.value === value}
          aria-checked={o.value === value}
          onClick={() => onPick(o.value)}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
        >
          {o.swatch && <span className="size-2.5 shrink-0 rounded-full" style={{ background: o.swatch }} />}
          {o.icon}
          <span className="flex-1 truncate">{o.label}</span>
          {o.hint && <span className="text-xs text-text-3">{o.hint}</span>}
          {o.value === value && <Check className="size-4 text-accent" />}
        </button>
      ))}
    </div>
  );
}
