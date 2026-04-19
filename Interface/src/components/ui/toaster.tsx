"use client";

import { X } from "lucide-react";
import {
  cn,
  severityAccent,
  severityColor,
  severityIcon,
  severityTextColor,
} from "@/lib/utils";
import { useToastStore } from "@/store/toast-store";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "pointer-events-auto rounded-lg border shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2",
            severityColor(toast.severity),
            severityAccent(toast.severity)
          )}
        >
          <div className="flex items-start gap-3 p-3">
            <span
              className={cn(
                "text-lg leading-none mt-0.5 shrink-0",
                severityTextColor(toast.severity)
              )}
              aria-hidden
            >
              {severityIcon(toast.severity)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-200 leading-tight">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-zinc-500 hover:text-zinc-200 transition-colors -m-1 p-1 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
