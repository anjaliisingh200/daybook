"use client";
import { AlertCircle, X } from "lucide-react";
import { useUI } from "@/lib/store/ui";
import { cn } from "@/lib/cn";

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:items-start md:pb-6 md:pl-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "anim-toast pointer-events-auto flex max-w-[min(92vw,26rem)] items-center gap-3 rounded-lg px-4 py-2.5 text-sm shadow-lg",
            "bg-tooltip text-tooltip-text"
          )}
        >
          {t.tone === "error" && <AlertCircle className="size-4 shrink-0 text-toast-danger" />}
          <span className="flex-1">{t.message}</span>
          {t.action && (
            <button
              className="rounded px-1.5 py-0.5 font-semibold text-toast-accent hover:bg-toast-hover"
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="rounded p-0.5 opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
