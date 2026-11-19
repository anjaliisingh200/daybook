export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      {/* a page with a rising sun: day + book */}
      <path d="M8 21.5h16" stroke="var(--text-on-accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 21.5a5 5 0 0 1 10 0" stroke="var(--text-on-accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M16 9v2.4M9.6 12.4l1.7 1.7M22.4 12.4l-1.7 1.7" stroke="var(--text-on-accent)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
