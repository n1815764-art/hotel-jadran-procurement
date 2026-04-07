"use client";

import { useEffect, useState } from "react";
import { getDataService } from "@/services/sample-data-service";
import { KPICard } from "@/components/ui/card";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatEUR, formatDateTime, formatPercent, severityColor, cn } from "@/lib/utils";
import type { Alert, PurchaseOrder, OccupancyForecast, Invoice, InventoryItem } from "@/types";
import { useAppStore } from "@/stores/app-store";
import Link from "next/link";
import { CheckCircle, XCircle, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyForecast[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrder[]>([]);
  const setSelectedPO = useAppStore((s) => s.setSelectedPO);

  const ds = getDataService();

  useEffect(() => {
    Promise.all([
      ds.getAlerts(),
      ds.getPurchaseOrders("Pending Approval"),
      ds.getOccupancyForecast(),
      ds.getInvoices(),
      ds.getInventory(),
      ds.getPurchaseOrders(),
    ]).then(([a, p, o, i, inv, ap]) => {
      setAlerts(a);
      setPendingPOs(p);
      setOccupancy(o);
      setInvoices(i);
      setInventory(inv);
      setAllPOs(ap);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const todayOcc = occupancy[0];
  const perfectMatches = invoices.filter((i) => i.match_status === "Perfect Match").length;
  const matchRate = invoices.length > 0 ? (perfectMatches / invoices.length) * 100 : 0;
  const dataIssues = inventory.filter((i) => i.negative_stock || i.ghost_surplus).length;
  const todayPOs = allPOs.filter((po) => po.date_created.startsWith("2026-03-25"));
  const todayPOsTotal = todayPOs.reduce((sum, po) => sum + po.total_amount, 0);
  const mtdSpend = allPOs
    .filter((po) => po.status !== "Cancelled" && po.date_created.startsWith("2026-03"))
    .reduce((sum, po) => sum + po.total_amount, 0);
  const monthlyBudget = 45000 + 15000 + 5000;
  const budgetPct = (mtdSpend / monthlyBudget) * 100;

  const handleApprove = async (poNumber: string) => {
    await ds.approvePO(poNumber, "Zoran Radonjic");
    const updated = await ds.getPurchaseOrders("Pending Approval");
    setPendingPOs(updated);
  };

  const handleReject = async (poNumber: string) => {
    await ds.rejectPO(poNumber);
    const updated = await ds.getPurchaseOrders("Pending Approval");
    setPendingPOs(updated);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link href="/purchase-orders">
          <KPICard label="Pending Approvals" value={pendingPOs.length} sublabel="POs awaiting action" />
        </Link>
        <KPICard label="Today's POs" value={todayPOs.length} sublabel={formatEUR(todayPOsTotal)} />
        <KPICard label="3-Way Match Rate" value={formatPercent(matchRate)} sublabel="This week" />
        <KPICard label="Budget MTD" value={formatPercent(budgetPct)} sublabel={`${formatEUR(mtdSpend)} / ${formatEUR(monthlyBudget)}`} />
        <Link href="/inventory">
          <KPICard label="Data Issues" value={dataIssues} alert={dataIssues > 0} sublabel="Negative stock / ghost" />
        </Link>
        <KPICard
          label="Occupancy Today"
          value={todayOcc ? formatPercent(todayOcc.occupancy_pct) : "—"}
          sublabel={todayOcc ? `${todayOcc.rooms_sold} / ${todayOcc.total_rooms} rooms` : ""}
        />
      </div>

      {/* Active Alerts */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Active Alerts</h2>
        <div className="space-y-2">
          {alerts.slice(0, 6).map((alert) => (
            <div key={alert.id} className={cn("flex items-start gap-3 p-3 rounded-lg border", severityColor(alert.severity))}>
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
            </div>
          ))}
        </div>
      </div>

      {/* Pending Approvals */}
      {pendingPOs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Pending Approvals</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {pendingPOs.map((po) => (
              <Card key={po.po_number} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="mono text-sm font-semibold text-zinc-200">{po.po_number}</span>
                  <StatusBadge status={po.source} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-zinc-300">{po.vendor_name}</p>
                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <span>{po.department}</span>
                    <span className="mono font-semibold text-zinc-200">{formatEUR(po.total_amount)}</span>
                  </div>
                </div>
                <div className="ai-content text-xs text-zinc-300 leading-relaxed">{po.ai_note}</div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="success" onClick={() => handleApprove(po.po_number)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleReject(po.po_number)}>
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                  <Link href="/purchase-orders">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedPO(po.po_number)}>
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
