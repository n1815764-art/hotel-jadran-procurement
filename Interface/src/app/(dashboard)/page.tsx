"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getDataService } from "@/services/sample-data-service";
import { KPICard } from "@/components/ui/card";
import { formatEUR, formatDateTime, formatPercent, severityColor, cn } from "@/lib/utils";
import type { Alert, PurchaseOrder, Invoice, InventoryItem } from "@/types";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { AlertDetailOverlay } from "@/components/alert-detail-overlay";
import { ApprovalQueue } from "@/components/dashboard/ApprovalQueue";
import type { ApprovalItem } from "@/types/approval";

interface DashboardData {
  alerts: Alert[];
  pendingPOs: PurchaseOrder[];
  allPOs: PurchaseOrder[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  kpi: {
    pendingPOsCount: number;
    todayPOsCount: number;
    todayPOsTotal: number;
    matchRate: number;
    mtdSpend: number;
    monthlyBudget: number;
    budgetPct: number;
    dataIssues: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [flash, setFlash] = useState(false);
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null);
  const router = useRouter();
  const dataService = getDataService();
  const currentUser = process.env.NEXT_PUBLIC_DEFAULT_USER ?? "Zoran Radonjić";

  const load = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setData(await res.json());
      setLastUpdated(new Date());
      if (isBackground) {
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const handleViewApprovalDetails = (item: ApprovalItem) => {
    if (item.type === "po") {
      router.push(`/purchase-orders/${encodeURIComponent(item.reference_id)}`);
    } else {
      router.push(`/invoices?batch=${encodeURIComponent(item.reference_id)}`);
    }
  };

  const alerts = data?.alerts ?? [];
  const allPOs = data?.allPOs ?? [];
  const invoices = data?.invoices ?? [];
  const inventory = data?.inventory ?? [];
  const kpi = data?.kpi;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className={cn(
              "text-[11px] text-zinc-600 mono transition-colors duration-500",
              flash && "text-zinc-400"
            )}>
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={() => load(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || refreshing) && "animate-spin")} />
            {loading ? "Loading…" : refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          Airtable error: {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className={cn(
        "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 transition-opacity duration-300",
        refreshing && "opacity-70"
      )}>
        <Link href="/purchase-orders">
          <KPICard
            label="Pending Approvals"
            value={loading ? "…" : kpi?.pendingPOsCount ?? 0}
            sublabel="POs awaiting action"
          />
        </Link>
        <KPICard
          label="Today's POs"
          value={loading ? "…" : kpi?.todayPOsCount ?? 0}
          sublabel={kpi ? formatEUR(kpi.todayPOsTotal) : ""}
        />
        <KPICard
          label="3-Way Match Rate"
          value={loading ? "…" : kpi ? formatPercent(kpi.matchRate) : "—"}
          sublabel="All invoices"
        />
        <KPICard
          label="Budget MTD"
          value={loading ? "…" : kpi ? formatPercent(kpi.budgetPct) : "—"}
          sublabel={kpi ? `${formatEUR(kpi.mtdSpend)} / ${formatEUR(kpi.monthlyBudget)}` : ""}
        />
        <Link href="/inventory">
          <KPICard
            label="Data Issues"
            value={loading ? "…" : kpi?.dataIssues ?? 0}
            alert={(kpi?.dataIssues ?? 0) > 0}
            sublabel="Negative stock / ghost"
          />
        </Link>
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Active Alerts
          {!loading && alerts.length > 0 && (
            <span className="ml-2 text-zinc-600 font-normal normal-case">({alerts.length})</span>
          )}
        </h2>
        {loading && (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-zinc-800/60 animate-pulse" />
            ))}
          </div>
        )}
        {!loading && alerts.length === 0 && (
          <p className="text-xs text-zinc-500">No alerts from Airtable audit trail.</p>
        )}
        <div className={cn(
          "space-y-2 overflow-y-auto max-h-[420px] pr-1 transition-opacity duration-300",
          refreshing && "opacity-70"
        )}>
          {alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => setActiveAlert(alert)}
              className={cn(
                "w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all",
                "hover:brightness-125 hover:scale-[1.005] active:scale-100 cursor-pointer",
                severityColor(alert.severity)
              )}
            >
              <span className="text-lg leading-none mt-0.5">
                {alert.severity === "critical" && "\uD83D\uDEA8"}
                {alert.severity === "warning" && "\u26A0\uFE0F"}
                {alert.severity === "approval" && "\uD83D\uDCCB"}
                {alert.severity === "info" && "\u2139\uFE0F"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-200">{alert.title}</span>
                  <span className="text-[10px] text-zinc-500 mono">{alert.workflow_id}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{alert.message}</p>
              </div>
              <span className="text-[10px] text-zinc-600 mono shrink-0">{formatDateTime(alert.timestamp)}</span>
            </button>
          ))}
        </div>
      </div>

      <AlertDetailOverlay
        alert={activeAlert}
        onClose={() => setActiveAlert(null)}
        inventory={inventory}
        invoices={invoices}
        purchaseOrders={allPOs}
      />

      {/* Pending Approvals */}
      <ApprovalQueue
        dataService={dataService}
        currentUser={currentUser}
        maxVisible={5}
        onViewDetails={handleViewApprovalDetails}
      />
    </div>
  );
}
