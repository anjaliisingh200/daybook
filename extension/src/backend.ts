import type * as Real from "./data";

/**
 * Where the panel gets its data. The real build talks to Supabase and the Daybook site.
 * The demo build (npm run extension -- --demo) uses sample data and needs no login; it is only for looking at the design.
 */
export const backend: typeof Real = __DEMO__ ? await import("./demo") : await import("./data");
