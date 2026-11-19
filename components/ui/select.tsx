"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

/** shadcn/ui Select (Radix), styled with Daybook tokens. */
const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-2.5 text-sm text-text transition-colors hover:border-border-strong focus:outline-none focus-visible:border-semantic-primary focus-visible:ring-2 focus-visible:ring-semantic-primary/20 disabled:opacity-50 data-[placeholder]:text-text-3",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-text-3" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
);
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>) => (
  <SelectPrimitive.ScrollUpButton className={cn("flex cursor-default items-center justify-center py-1 text-text-3", className)} {...props}>
    <ChevronUp className="size-4" />
  </SelectPrimitive.ScrollUpButton>
);
const SelectScrollDownButton = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>) => (
  <SelectPrimitive.ScrollDownButton className={cn("flex cursor-default items-center justify-center py-1 text-text-3", className)} {...props}>
    <ChevronDown className="size-4" />
  </SelectPrimitive.ScrollDownButton>
);

const SelectContent = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Content>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>>(
  ({ className, children, position = "popper", ...props }, ref) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        className={cn(
          "relative z-[70] max-h-72 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface text-text shadow-lg data-[state=open]:animate-in",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className={cn("p-1.5", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]")}>{children}</SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
);
SelectContent.displayName = "SelectContent";

const SelectItem = React.forwardRef<React.ElementRef<typeof SelectPrimitive.Item>, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>>(
  ({ className, children, ...props }, ref) => (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-md py-2 pl-8 pr-2.5 text-sm text-text outline-none transition-colors focus:bg-surface-2 data-[disabled]:opacity-40",
        className
      )}
      {...props}
    >
      <span className="absolute left-2.5 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-semantic-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
);
SelectItem.displayName = "SelectItem";

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem };
