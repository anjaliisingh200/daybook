"use client";
import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 text-sm text-text placeholder:text-text-3 transition-[border,box-shadow] hover:border-border-strong focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(inputClass, "h-9", className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputClass, "min-h-[5rem] resize-y py-2 leading-relaxed", className)} {...rest} />;
});

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-text-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-3">{hint}</span>}
    </label>
  );
}

/** Circular completion control used on task cards. */
export function RoundCheck({ checked, onChange, label, size = 22 }: { checked: boolean; onChange: (v: boolean) => void; label: string; size?: number }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      style={{ width: size, height: size }}
      className={cn(
        "group/check relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] transition-all duration-150",
        checked ? "border-transparent bg-[color-mix(in_srgb,var(--semantic-primary)_16%,var(--surface))] text-semantic-primary" : "border-border-strong bg-surface hover:border-accent hover:bg-accent-soft"
      )}
    >
      {checked ? (
        <Check key="c" className="anim-check size-[62%]" strokeWidth={3} />
      ) : (
        <Check className="size-[62%] text-accent opacity-0 transition-opacity group-hover/check:opacity-60" strokeWidth={3} />
      )}
    </button>
  );
}

/** Square colour-filled checkbox used for calendar visibility. */
export function ColorCheck({ checked, color, onChange, label }: { checked: boolean; color: string; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors"
      style={{ borderColor: color, background: checked ? color : "transparent" }}
    >
      {checked && <Check className="size-3 text-on-solid" strokeWidth={3.5} />}
    </button>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-40",
        checked ? "bg-success" : "bg-border-strong"
      )}
    >
      <span className={cn("absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow-sm transition-transform duration-150", checked && "translate-x-4")} />
    </button>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = "md",
  className,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-100",
            size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[0.8125rem]",
            o.value === value ? "bg-raised text-text shadow-sm" : "text-text-2 hover:text-text"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "accent" | "danger" | "muted"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-medium leading-4",
        tone === "neutral" && "bg-surface-2 text-text-2",
        tone === "accent" && "bg-accent-soft text-accent",
        tone === "danger" && "bg-danger-soft text-danger",
        tone === "muted" && "border border-border text-text-3",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-text-3">{icon}</div>
      <h3 className="font-display text-xl">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-2">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
