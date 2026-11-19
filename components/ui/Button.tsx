"use client";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-semantic-primary text-semantic-on-primary hover:bg-semantic-primary-hover shadow-sm",
  secondary: "bg-surface text-text border border-border-strong hover:bg-surface-2 shadow-sm",
  soft: "bg-accent-soft text-text hover:bg-surface-2 border border-accent-line",
  ghost: "bg-transparent text-text hover:bg-surface-2",
  danger: "bg-semantic-destructive text-on-solid hover:brightness-95 shadow-sm",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8125rem] gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-sm gap-2 rounded-md",
  lg: "h-11 px-5 text-[0.9375rem] gap-2 rounded-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, className, children, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background,box-shadow,transform,color] duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  shortcut?: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  noTooltip?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, size = "md", active, noTooltip, className, children, type = "button", ...rest },
  ref
) {
  const btn = (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full text-text-2 transition-[background,color,transform] duration-100 hover:bg-surface-2 hover:text-text active:scale-95 active:bg-surface-3 disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "size-7" : size === "md" ? "size-9" : "size-11",
        active && "bg-surface-2 text-text",
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
  return noTooltip ? btn : (
    <Tooltip label={label} shortcut={shortcut}>
      {btn}
    </Tooltip>
  );
});
