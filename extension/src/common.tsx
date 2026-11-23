import { useEffect, useState } from "react";
import { systemTimeZone } from "@/lib/dates";
import { makeFmt, type Fmt } from "@/lib/format";

/** The panel uses the computer's own time zone, language and 12/24-hour clock. */
export const TZ = systemTimeZone();

const locale = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en";
export const HOUR12 = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hour12 ?? true;
export const fmt: Fmt = makeFmt({ locale, timeZone: TZ, hour12: HOUR12, dateFormat: "long" });

/** The current time as epoch ms, refreshed every `ms` so "today" rolls over at midnight. */
export function useNow(ms = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Where the Daybook website lives (the "Open Daybook" links). */
export const SITE = __DEMO__ ? "https://example.com" : __SITE_URL__;

/** The website's logo mark. */
export function LogoMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M8 21.5h16" stroke="var(--text-on-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 21.5a5 5 0 0 1 10 0" stroke="var(--text-on-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M16 9v2.4M9.6 12.4l1.7 1.7M22.4 12.4l-1.7 1.7" stroke="var(--text-on-accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <LogoMark />
      <span>Daybook</span>
    </div>
  );
}
