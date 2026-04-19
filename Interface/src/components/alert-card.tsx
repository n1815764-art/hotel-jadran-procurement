"use client";

import type { Alert } from "@/types";
import {
  cn,
  formatDateTime,
  severityAccent,
  severityColor,
  severityIcon,
  severityLabel,
  severityTextColor,
} from "@/lib/utils";

interface AlertCardProps {
  alert: Alert;
  onClick?: (alert: Alert) => void;
  className?: string;
}

export function AlertCard({ alert, onClick, className }: AlertCardProps) {
  const Content = (
    <div className="flex items-start gap-3 p-3 w-full">
      <span
        className={cn("text-lg leading-none mt-0.5 shrink-0", severityTextColor(alert.severity))}
        aria-hidden
      >
        {severityIcon(alert.severity)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium text-zinc-200 leading-tight">{alert.title}</span>
          <Chip label={severityLabel(alert.severity)} tone={alert.severity} />
          {alert.workflow_id && <Chip label={alert.workflow_id} mono />}
          {alert.reference_id && <Chip label={alert.reference_id} mono />}
        </div>
        {alert.message && (
          <p className="text-xs text-zinc-400 leading-relaxed break-words">{alert.message}</p>
        )}
      </div>

      <span className="text-[10px] text-zinc-600 mono shrink-0 mt-1">
        {formatDateTime(alert.timestamp)}
      </span>
    </div>
  );

  const base = cn(
    "w-full rounded-lg border transition-all",
    severityColor(alert.severity),
    severityAccent(alert.severity),
    onClick && "hover:brightness-125 hover:scale-[1.005] active:scale-100 cursor-pointer text-left",
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={() => onClick(alert)} className={base}>
        {Content}
      </button>
    );
  }
  return <div className={base}>{Content}</div>;
}

interface ChipProps {
  label: string;
  mono?: boolean;
  tone?: Alert["severity"];
}

function Chip({ label, mono, tone }: ChipProps) {
  const toneClass = tone
    ? {
        critical: "border-red-500/40 text-red-300",
        warning: "border-amber-500/40 text-amber-300",
        approval: "border-emerald-500/40 text-emerald-300",
        info: "border-zinc-600 text-zinc-400",
      }[tone]
    : "border-zinc-700 text-zinc-400";

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wider",
        toneClass,
        mono && "mono normal-case tracking-normal"
      )}
    >
      {label}
    </span>
  );
}
