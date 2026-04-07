"use client";

import { useEffect, useState } from "react";
import { getDataService } from "@/services/sample-data-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDateTime, cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import type { AuditEntry } from "@/types";
import { Search, Filter } from "lucide-react";

const EVENT_TYPES = [
  "All",
  "PO_CREATED",
  "PO_APPROVED",
  "PO_REJECTED",
  "INVOICE_MATCHED",
  "INVOICE_DISPUTED",
  "REORDER_TRIGGERED",
  "REORDER_BLOCKED",
  "ANOMALY_DETECTED",
  "REPORT_GENERATED",
  "RECEIVING_CONFIRMED",
];

const ACTORS = ["All", "System", "AI", "Zoran Radonjic", "Vasilije", "Biljana"];

const eventTypeColor: Record<string, string> = {
  PO_CREATED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PO_APPROVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PO_REJECTED: "bg-red-500/20 text-red-400 border-red-500/30",
  INVOICE_MATCHED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  INVOICE_DISPUTED: "bg-red-500/20 text-red-400 border-red-500/30",
  REORDER_TRIGGERED: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  REORDER_BLOCKED: "bg-red-500/20 text-red-400 border-red-500/30",
  ANOMALY_DETECTED: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  REPORT_GENERATED: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  RECEIVING_CONFIRMED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const { auditEventType, auditActor, auditRefSearch, setAuditEventType, setAuditActor, setAuditRefSearch } = useAppStore();

  const ds = getDataService();

  useEffect(() => {
    ds.getAuditTrail({
      event_type: auditEventType === "All" ? undefined : auditEventType,
      actor: auditActor === "All" ? undefined : auditActor,
      reference_id: auditRefSearch || undefined,
    }).then(setEntries);
  }, [auditEventType, auditActor, auditRefSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Audit Trail</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <select
            value={auditEventType}
            onChange={(e) => setAuditEventType(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t === "All" ? "All Events" : t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <select
          value={auditActor}
          onChange={(e) => setAuditActor(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
        >
          {ACTORS.map((a) => (
            <option key={a} value={a}>{a === "All" ? "All Actors" : a}</option>
          ))}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search reference ID..."
            value={auditRefSearch}
            onChange={(e) => setAuditRefSearch(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-md pl-9 pr-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-violet-500 w-64"
          />
        </div>
        <span className="text-xs text-zinc-500">{entries.length} entries</span>
      </div>

      {/* Timeline */}
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-zinc-800">
          {entries.map((entry) => (
            <div key={entry.event_id} className="flex items-start gap-4 px-4 py-3 hover:bg-zinc-800/30 transition-colors">
              <div className="shrink-0 pt-0.5">
                <span className="mono text-[10px] text-zinc-600 block w-32">{formatDateTime(entry.timestamp)}</span>
              </div>
              <div className="shrink-0">
                <Badge className={cn(eventTypeColor[entry.event_type] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30", "text-[10px]")}>
                  {entry.event_type.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 leading-relaxed">{entry.details}</p>
              </div>
              <div className="shrink-0 text-right space-y-0.5">
                <span className="text-xs text-zinc-500">{entry.actor}</span>
                {entry.reference_id && (
                  <span className="block mono text-[10px] text-zinc-600">{entry.reference_id}</span>
                )}
                {entry.amount !== undefined && entry.amount > 0 && (
                  <span className="block mono text-xs text-zinc-400">{formatEUR(entry.amount)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
