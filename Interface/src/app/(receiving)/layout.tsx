"use client";

import { initDataService } from "@/services/init-data-service";

initDataService();

export default function ReceivingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-light min-h-screen">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Hotel Jadran</h1>
          <p className="text-xs text-blue-600 font-medium">Prijem robe</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" title="Online" />
          <span className="text-xs text-slate-500">Online</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-4">{children}</main>
    </div>
  );
}
