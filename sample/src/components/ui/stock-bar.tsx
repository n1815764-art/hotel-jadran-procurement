"use client";

import { cn } from "@/lib/utils";
import { stockLevelPercent, stockLevelColor } from "@/lib/utils";

export function StockBar({ current, par }: { current: number; par: number }) {
  const pct = stockLevelPercent(current, par);
  const color = stockLevelColor(pct);

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 stock-bar bg-zinc-800">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-xs mono", pct <= 0 ? "text-red-400" : pct < 30 ? "text-red-400" : pct < 60 ? "text-amber-400" : "text-emerald-400")}>
        {pct}%
      </span>
    </div>
  );
}
