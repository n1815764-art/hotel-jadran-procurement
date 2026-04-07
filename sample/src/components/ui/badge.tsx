"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outline";
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
        variant === "default" && "bg-zinc-700/50 text-zinc-300 border-zinc-600",
        variant === "outline" && "bg-transparent border-zinc-600 text-zinc-400",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const colorMap: Record<string, string> = {
    "Perfect Match": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Minor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Disputed: "bg-red-500/20 text-red-400 border-red-500/30",
    "Pending Review": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Pending Approval": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Sent to Vendor": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    "Partially Received": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Fully Received": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Closed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    Cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
    Active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Probation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Suspended: "bg-red-500/20 text-red-400 border-red-500/30",
    Inactive: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
    Expiring: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    Expired: "bg-red-500/20 text-red-400 border-red-500/30",
    Renewed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    MAINTAIN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    WATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    REPLACE: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  return (
    <Badge className={cn(colorMap[status] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", className)}>
      {status}
    </Badge>
  );
}
