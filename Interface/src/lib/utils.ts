import { clsx, type ClassValue } from "clsx";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatEUR(amount: number): string {
  const formatted = new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} \u20AC`;
}

export function formatDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd.MM.yyyy.");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "dd.MM.yyyy. HH:mm");
  } catch {
    return dateStr;
  }
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function stockLevelPercent(current: number, par: number): number {
  if (par <= 0) return 0;
  if (current < 0) return 0;
  return Math.min(100, Math.round((current / par) * 100));
}

export function stockLevelColor(percent: number): string {
  if (percent <= 0) return "bg-red-500";
  if (percent < 30) return "bg-red-500";
  if (percent < 60) return "bg-amber-500";
  return "bg-emerald-500";
}

export function matchStatusColor(status: string): string {
  switch (status) {
    case "Perfect Match":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Minor":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Major":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "Disputed":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Pending Review":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function poStatusColor(status: string): string {
  switch (status) {
    case "Pending Approval":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Approved":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Sent to Vendor":
      return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
    case "Partially Received":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Fully Received":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Closed":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    case "Cancelled":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function vendorStatusColor(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Probation":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Suspended":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "Inactive":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  }
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-red-500 bg-red-500/10";
    case "warning":
      return "border-amber-500 bg-amber-500/10";
    case "approval":
      return "border-blue-500 bg-blue-500/10";
    case "info":
      return "border-zinc-600 bg-zinc-800/50";
    default:
      return "border-zinc-600 bg-zinc-800/50";
  }
}

export function severityIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "\uD83D\uDEA8";
    case "warning":
      return "\u26A0\uFE0F";
    case "approval":
      return "\uD83D\uDCCB";
    case "info":
      return "\u2139\uFE0F";
    default:
      return "\u2139\uFE0F";
  }
}

export function approvalTier(amount: number): string {
  if (amount < 500) return "Auto-approved";
  if (amount <= 2000) return "Department Head";
  if (amount <= 5000) return "Controller";
  return "Controller + GM";
}

export function daysUntilColor(days: number): string {
  if (days <= 30) return "text-red-400";
  if (days <= 60) return "text-amber-400";
  if (days <= 90) return "text-yellow-400";
  return "text-zinc-400";
}
