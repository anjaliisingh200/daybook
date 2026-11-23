import type { ReactNode } from "react";

/** The website's Field: a small label above a control. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** The website's Segmented control. */
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="seg">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The website's bottom sheet (its Drawer on a narrow screen): a dimmed page behind, a sheet that rises from the bottom
 * with a header, a scrolling body and a footer. Escape or a click on the dimmed part closes it.
 */
export function Sheet({ label, title, status, onClose, children, footer }: { label: string; title: string; status?: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="sheet-wrap" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="sheet-dim" onClick={onClose} />
      <section role="dialog" aria-label={label} className="sheet">
        <div className="sheet-head">
          <span>
            {title}
            {status}
          </span>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </section>
    </div>
  );
}
