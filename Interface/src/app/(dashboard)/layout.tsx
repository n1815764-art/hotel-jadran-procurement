"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { ProcurementChatbot } from "@/components/procurement-chatbot";
import { initDataService } from "@/services/init-data-service";

initDataService();

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-dark flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-6">{children}</div>
      </main>
      <ProcurementChatbot />
    </div>
  );
}
