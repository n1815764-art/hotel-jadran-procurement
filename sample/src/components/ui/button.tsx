"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
}

export function Button({ children, variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-violet-600 text-white hover:bg-violet-700",
        variant === "secondary" && "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700",
        variant === "danger" && "bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30",
        variant === "ghost" && "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
        variant === "success" && "bg-emerald-600 text-white hover:bg-emerald-700",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
