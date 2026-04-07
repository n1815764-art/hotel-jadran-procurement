"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Package,
  Users,
  BarChart3,
  ScrollText,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/audit", label: "Audit Trail", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-zinc-950 border-r border-zinc-800 flex flex-col">
      <div className="px-4 py-5 border-b border-zinc-800">
        <h1 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">Hotel Jadran</h1>
        <p className="text-[10px] text-violet-400 font-medium mt-0.5">Procurement Command Center</p>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-violet-600/15 text-violet-300 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-zinc-800">
        <p className="text-[10px] text-zinc-600">v0.1 — Sample Data Mode</p>
      </div>
    </aside>
  );
}
