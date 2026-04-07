"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/50 p-4",
        onClick && "cursor-pointer hover:border-zinc-700 transition-colors",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function KPICard({
  label,
  value,
  sublabel,
  alert,
  onClick,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  alert?: boolean;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col gap-1",
        alert && "border-red-500/50 bg-red-500/5",
        onClick && "cursor-pointer hover:border-zinc-600"
      )}
      onClick={onClick}
    >
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className={cn("text-2xl font-bold mono", alert ? "text-red-400" : "text-zinc-100")}>{value}</span>
      {sublabel && <span className="text-xs text-zinc-500">{sublabel}</span>}
    </Card>
  );
}
