"use client";

import { useState, useEffect } from "react";
import type { InventoryItem } from "@/types";
import { getDataService } from "@/services/sample-data-service";
import { useAppStore } from "@/stores/app-store";
import { Card } from "@/components/ui/card";
import { StockBar } from "@/components/ui/stock-bar";
import { Badge } from "@/components/ui/badge";
import { formatEUR, cn } from "@/lib/utils";
import { INVENTORY_CATEGORIES } from "@/lib/constants";
import { AlertTriangle, Search, ChevronDown, ChevronUp } from "lucide-react";

function getItemFlag(item: InventoryItem): {
  label: string;
  className: string;
} {
  if (item.negative_stock) {
    return {
      label: "NEGATIVE",
      className: "bg-red-500/20 text-red-400 border-red-500/30",
    };
  }
  if (item.ghost_surplus) {
    return {
      label: "GHOST",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  }
  if (item.current_stock <= item.reorder_point) {
    return {
      label: "LOW",
      className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
  }
  return {
    label: "OK",
    className: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<readonly InventoryItem[]>([]);
  const [expandedFlags, setExpandedFlags] = useState<ReadonlySet<string>>(
    new Set()
  );

  const inventoryCategory = useAppStore((s) => s.inventoryCategory);
  const setInventoryCategory = useAppStore((s) => s.setInventoryCategory);
  const inventorySearch = useAppStore((s) => s.inventorySearch);
  const setInventorySearch = useAppStore((s) => s.setInventorySearch);

  useEffect(() => {
    const service = getDataService();
    service.getInventory().then((data) => setInventory(data));
  }, []);

  const toggleFlag = (itemId: string) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesCategory =
      inventoryCategory === "All" || item.category === inventoryCategory;
    const searchLower = inventorySearch.toLowerCase();
    const matchesSearch =
      searchLower === "" ||
      item.item_name.toLowerCase().includes(searchLower) ||
      item.item_id.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const flaggedItems = inventory.filter((item) => item.ai_flag !== null);
  const negativeStockItems = inventory.filter((item) => item.negative_stock);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">
          Inventory & Reorder
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real-time stock levels, AI anomaly flags, and reorder management
        </p>
      </div>

      {/* Negative Stock / Recipe Error Banner */}
      {negativeStockItems.length > 0 && (
        <div className="bg-red-500/10 border-red-500 border p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-red-400">
                Recipe Configuration Error Detected — Negative Stock
              </h3>
              {negativeStockItems.map((item) => (
                <div key={item.item_id} className="text-sm text-red-300/90">
                  {item.ai_flag}
                </div>
              ))}
              <p className="text-xs text-red-400/70 mt-2">
                BCS Analysis: POS2 recipe for &quot;Orada na zaru&quot; is
                misconfigured with &quot;Piletina 200g&quot; instead of the
                actual fish ingredient. Each sale of orada na zaru decrements
                piletina stock instead of orada stock, causing phantom negative
                stock on piletina and ghost surplus on orada. Auto-reorder has
                been suspended for affected items.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setInventoryCategory("All")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
            inventoryCategory === "All"
              ? "bg-zinc-100 text-zinc-900 border-zinc-100"
              : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
          )}
        >
          All
        </button>
        {INVENTORY_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setInventoryCategory(cat)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md border transition-colors",
              inventoryCategory === cat
                ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                : "bg-zinc-800/50 text-zinc-400 border-zinc-700 hover:border-zinc-600 hover:text-zinc-300"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by item name or SKU..."
          value={inventorySearch}
          onChange={(e) => setInventorySearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
        />
      </div>

      {/* Inventory Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">SKU</th>
                <th className="text-left px-4 py-3 font-medium">Item Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">
                  Current Stock
                </th>
                <th className="text-right px-4 py-3 font-medium">Par Level</th>
                <th className="text-left px-4 py-3 font-medium">
                  Stock Level
                </th>
                <th className="text-left px-4 py-3 font-medium">
                  Preferred Vendor
                </th>
                <th className="text-center px-4 py-3 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {filteredInventory.map((item) => {
                const flag = getItemFlag(item);
                const isNegative = item.current_stock < 0;
                const isLow =
                  !isNegative && item.current_stock <= item.reorder_point;

                return (
                  <tr
                    key={item.item_id}
                    className="hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-zinc-400">
                        {item.item_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-zinc-200">{item.item_name}</span>
                        <span className="block text-xs text-zinc-500 mt-0.5">
                          {item.warehouse}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.category}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={cn(
                          "font-mono font-medium",
                          isNegative
                            ? "text-red-400"
                            : isLow
                              ? "text-amber-400"
                              : "text-zinc-200"
                        )}
                      >
                        {item.current_stock} {item.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-zinc-300">
                        {item.par_level} {item.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StockBar
                        current={item.current_stock}
                        par={item.par_level}
                      />
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.preferred_vendor_name}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={flag.className}>{flag.label}</Badge>
                    </td>
                  </tr>
                );
              })}
              {filteredInventory.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    No inventory items match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Flags Detail Section */}
      {flaggedItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">
            AI Anomaly Flags
          </h2>
          <p className="text-sm text-zinc-400">
            Items flagged by AI analysis for inventory discrepancies or
            configuration issues.
          </p>
          <div className="space-y-2">
            {flaggedItems.map((item) => {
              const isExpanded = expandedFlags.has(item.item_id);
              return (
                <Card key={item.item_id} className="p-0 overflow-hidden">
                  <button
                    onClick={() => toggleFlag(item.item_id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4 flex-shrink-0",
                          item.negative_stock
                            ? "text-red-400"
                            : "text-amber-400"
                        )}
                      />
                      <div>
                        <span className="text-sm font-medium text-zinc-200">
                          {item.item_name}
                        </span>
                        <span className="text-xs text-zinc-500 ml-2">
                          {item.item_id}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-zinc-800">
                      <div className="ai-content mt-3 text-sm text-zinc-300 leading-relaxed">
                        {item.ai_flag}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
