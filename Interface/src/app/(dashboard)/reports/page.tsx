"use client";

import { useEffect, useState } from "react";
import { getDataService } from "@/services/sample-data-service";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatEUR, formatDate, cn } from "@/lib/utils";
import type { DailyFlashReport, DemandForecastItem, OccupancyForecast } from "@/types";
import { FileText, TrendingUp, Calendar } from "lucide-react";

type TabId = "flash" | "forecast" | "occupancy";

export default function ReportsPage() {
  const [tab, setTab] = useState<TabId>("flash");
  const [reports, setReports] = useState<DailyFlashReport[]>([]);
  const [forecast, setForecast] = useState<DemandForecastItem[]>([]);
  const [occupancy, setOccupancy] = useState<OccupancyForecast[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  const ds = getDataService();

  useEffect(() => {
    Promise.all([ds.getDailyReports(), ds.getDemandForecast(), ds.getOccupancyForecast()]).then(
      ([r, f, o]) => {
        setReports(r);
        setForecast(f);
        setOccupancy(o);
        if (r.length > 0) setSelectedReport(r[0].date);
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "flash", label: "Daily Flash Report", icon: <FileText className="w-4 h-4" /> },
    { id: "forecast", label: "Demand Forecast", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "occupancy", label: "Occupancy Forecast", icon: <Calendar className="w-4 h-4" /> },
  ];

  const urgencyLabel = (u: string) => {
    if (u === "red") return { text: "Order within 24h", cls: "bg-red-500/20 text-red-400 border-red-500/30" };
    if (u === "amber") return { text: "Order within 3 days", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    return { text: "Adequate", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Reports</h1>

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === t.id ? "bg-violet-600/20 text-violet-300 border border-violet-500/30" : "text-zinc-400 hover:bg-zinc-800 border border-transparent"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Daily Flash Reports */}
      {tab === "flash" && (
        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-1 space-y-2">
            {reports.map((r) => (
              <button
                key={r.date}
                onClick={() => setSelectedReport(r.date)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  selectedReport === r.date ? "bg-violet-600/15 text-violet-300" : "text-zinc-400 hover:bg-zinc-800"
                )}
              >
                {formatDate(r.date)}
              </button>
            ))}
          </div>
          <div className="col-span-3">
            {reports
              .filter((r) => r.date === selectedReport)
              .map((r) => (
                <Card key={r.date}>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <h3 className="text-sm font-semibold text-zinc-200">Flash Report — {formatDate(r.date)}</h3>
                  </div>
                  <div className="report-text text-sm text-zinc-300 leading-relaxed">{r.content}</div>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Demand Forecast */}
      {tab === "forecast" && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">Weekly Demand Forecast</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Item</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Category</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Current</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Demand (7d)</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Days Left</th>
                  <th className="text-center py-2 px-3 text-zinc-400 font-medium">Urgency</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Recommended Qty</th>
                </tr>
              </thead>
              <tbody>
                {forecast.map((item) => {
                  const u = urgencyLabel(item.urgency);
                  return (
                    <tr key={item.item_name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-zinc-200">{item.item_name}</td>
                      <td className="py-2 px-3 text-zinc-400">{item.category}</td>
                      <td className={cn("py-2 px-3 text-right mono", item.current_stock < 0 ? "text-red-400" : "text-zinc-300")}>
                        {item.current_stock} {item.unit}
                      </td>
                      <td className="py-2 px-3 text-right mono text-zinc-300">
                        {item.forecasted_demand} {item.unit}
                      </td>
                      <td className={cn("py-2 px-3 text-right mono", item.days_until_stockout <= 1 ? "text-red-400" : item.days_until_stockout <= 3 ? "text-amber-400" : "text-zinc-300")}>
                        {item.days_until_stockout}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge className={u.cls}>{u.text}</Badge>
                      </td>
                      <td className="py-2 px-3 text-right mono text-zinc-300">
                        {item.recommended_order_qty > 0 ? `${item.recommended_order_qty} ${item.unit}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Occupancy Forecast */}
      {tab === "occupancy" && (
        <Card>
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">14-Day Occupancy Forecast</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/50">
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Date</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Occupancy</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Rooms</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Arrivals</th>
                  <th className="text-right py-2 px-3 text-zinc-400 font-medium">Departures</th>
                  <th className="text-left py-2 px-3 text-zinc-400 font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {occupancy.map((day) => (
                  <tr key={day.date} className={cn("border-b border-zinc-800/50 hover:bg-zinc-800/30", day.events.length > 0 && "bg-violet-500/5")}>
                    <td className="py-2 px-3 text-zinc-200 mono">{formatDate(day.date)}</td>
                    <td className={cn("py-2 px-3 text-right mono font-medium", day.occupancy_pct >= 85 ? "text-amber-400" : "text-zinc-300")}>
                      {day.occupancy_pct}%
                    </td>
                    <td className="py-2 px-3 text-right mono text-zinc-400">{day.rooms_sold}/{day.total_rooms}</td>
                    <td className="py-2 px-3 text-right mono text-emerald-400">{day.arrivals}</td>
                    <td className="py-2 px-3 text-right mono text-red-400">{day.departures}</td>
                    <td className="py-2 px-3 text-zinc-300">
                      {day.events.length > 0 ? day.events.map((e, i) => (
                        <Badge key={i} className="bg-violet-500/20 text-violet-300 border-violet-500/30 mr-1">{e}</Badge>
                      )) : <span className="text-zinc-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
