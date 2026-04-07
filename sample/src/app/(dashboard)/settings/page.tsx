"use client";

import { useEffect, useState } from "react";
import { getDataService } from "@/services/sample-data-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, cn } from "@/lib/utils";
import type { WorkflowStatus, IntegrationStatus } from "@/types";
import { Wifi, WifiOff, Clock, Activity, Server } from "lucide-react";

export default function SettingsPage() {
  const [workflows, setWorkflows] = useState<WorkflowStatus[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);

  const ds = getDataService();

  useEffect(() => {
    Promise.all([ds.getWorkflowStatuses(), ds.getIntegrationStatuses()]).then(([w, i]) => {
      setWorkflows(w);
      setIntegrations(i);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusIcon = (status: string) => {
    if (status === "connected") return <Wifi className="w-4 h-4 text-emerald-400" />;
    if (status === "disconnected") return <WifiOff className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  const statusColor = (status: string) => {
    if (status === "connected") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "disconnected") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  };

  const wfStatusColor = (status: string) => {
    if (status === "active") return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    if (status === "error") return "bg-red-500/20 text-red-400 border-red-500/30";
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">System Status</h1>

      {/* Integrations */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4" /> Integration Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {integrations.map((int) => (
            <Card key={int.name}>
              <div className="flex items-center gap-3 mb-2">
                {statusIcon(int.status)}
                <span className="text-sm font-medium text-zinc-200">{int.name}</span>
              </div>
              <Badge className={statusColor(int.status)}>
                {int.status === "connected" ? "Connected" : int.status === "disconnected" ? "Disconnected" : "Pending Setup"}
              </Badge>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{int.details}</p>
              <p className="text-[10px] text-zinc-600 mt-1 mono">Last check: {formatDateTime(int.last_check)}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Workflows */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4" /> Workflow Status (13 Workflows)
        </h2>
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">ID</th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">Workflow</th>
                <th className="text-center py-2 px-4 text-zinc-400 font-medium">Status</th>
                <th className="text-center py-2 px-4 text-zinc-400 font-medium">Trigger</th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">Last Run</th>
                <th className="text-left py-2 px-4 text-zinc-400 font-medium">Next Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((wf) => (
                <tr key={wf.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                  <td className="py-2 px-4 mono text-xs text-zinc-500">{wf.id}</td>
                  <td className="py-2 px-4 text-zinc-200">{wf.name}</td>
                  <td className="py-2 px-4 text-center">
                    <Badge className={wfStatusColor(wf.status)}>{wf.status}</Badge>
                  </td>
                  <td className="py-2 px-4 text-center">
                    <Badge className={cn(wf.trigger_type === "cron" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30")}>
                      {wf.trigger_type}
                    </Badge>
                  </td>
                  <td className="py-2 px-4 mono text-xs text-zinc-400">{wf.last_run ? formatDateTime(wf.last_run) : "—"}</td>
                  <td className="py-2 px-4 mono text-xs text-zinc-400">{wf.next_scheduled ? formatDateTime(wf.next_scheduled) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* Cron Schedule */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" /> Cron Schedule
        </h2>
        <Card>
          <div className="space-y-2 text-sm">
            {[
              { time: "06:00", wf: "WF-08", name: "Auto-Reorder Scan", desc: "Check par levels, generate POs" },
              { time: "07:00", wf: "WF-09", name: "Daily Flash Report", desc: "Generate and distribute daily summary" },
              { time: "09:00", wf: "WF-11", name: "Contract Expiry Monitor", desc: "Check for expiring contracts" },
              { time: "22:00", wf: "WF-12", name: "Anomaly Detection", desc: "Scan for errors and anomalies" },
              { time: "18:00 Sun", wf: "WF-13", name: "Demand Forecast", desc: "Generate weekly demand forecast" },
              { time: "08:00 1st", wf: "WF-10", name: "Vendor Scorecard", desc: "Generate monthly vendor scores" },
            ].map((cron) => (
              <div key={cron.wf} className="flex items-center gap-4 py-2 border-b border-zinc-800/50 last:border-0">
                <span className="mono text-xs text-violet-400 w-20 shrink-0">{cron.time}</span>
                <span className="mono text-xs text-zinc-600 w-14 shrink-0">{cron.wf}</span>
                <span className="text-zinc-200 w-48 shrink-0">{cron.name}</span>
                <span className="text-zinc-500">{cron.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
