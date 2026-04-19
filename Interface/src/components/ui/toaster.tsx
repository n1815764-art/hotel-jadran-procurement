"use client";

import { AlertTriangle, AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastSeverity } from "@/store/toast-store";

const ICONS: Record<ToastSeverity, typeof AlertCircle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  approval: CheckCircle2,
  info: Info,
};

const STYLES: Record<ToastSeverity, string> = {
  critical: "border-red-500/40 bg-red-500/10 text-red-200",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-200",
  approval: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  info: "border-zinc-600 bg-zinc-800/90 text-zinc-200",
};

const ICON_COLORS: Record<ToastSeverity, string> = {
  critical: "text-red-400",
  warning: "text-amber-400",
  approval: "text-emerald-400",
  info: "text-zinc-400",
};

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
      {toasts.map((toast) => {
        const Icon = ICONS[toast.severity];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2",
              STYLES[toast.severity]
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_COLORS[toast.severity])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-xs leading-relaxed opacity-80 break-words">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="text-zinc-400 hover:text-zinc-100 transition-colors -m-1 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
