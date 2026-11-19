import type { CSSProperties } from "react";

/** Sets the calendar colour an event card is painted with. */
export function evVars(hex: string): CSSProperties {
  return { ["--ev" as string]: hex };
}

/** Event titles use exactly the task card title style. */
export const evTitle = "text-[0.9375rem] font-medium leading-snug";

/** Event cards are the calendar's own colour, solid, with white text. */
export const evSurface = "bg-[var(--ev)] text-on-solid hover:brightness-95";
