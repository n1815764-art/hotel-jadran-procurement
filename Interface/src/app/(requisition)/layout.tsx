"use client";

import { initDataService } from "@/services/init-data-service";

initDataService();

export default function RequisitionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-dark min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide">Hotel Jadran</h1>
          <p className="text-xs text-violet-400 font-medium">Zahtjev za nabavu</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Online" />
          <span className="text-xs text-zinc-400">Online</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  );
}
