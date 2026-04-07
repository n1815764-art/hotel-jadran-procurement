"use client";

import { useState, useEffect } from "react";
import type { Vendor, VendorScorecard, Contract } from "@/types";
import { getDataService } from "@/services/sample-data-service";
import { useAppStore } from "@/stores/app-store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatEUR, formatDate, daysUntilColor, cn } from "@/lib/utils";
import { Star, Clock, Mail, Phone, AlertTriangle } from "lucide-react";

function scoreColor(score: number): string {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-red-400";
}

function scoreBarColor(score: number): string {
  if (score >= 8) return "bg-emerald-500";
  if (score >= 6) return "bg-amber-500";
  return "bg-red-500";
}

function expiryBarColor(days: number): string {
  if (days < 30) return "bg-red-500";
  if (days < 60) return "bg-amber-500";
  if (days < 90) return "bg-yellow-500";
  return "bg-zinc-600";
}

interface ScoreBarProps {
  label: string;
  score: number;
}

function ScoreBar({ label, score }: ScoreBarProps) {
  const widthPct = (score / 10) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-zinc-400 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", scoreBarColor(score))}
          style={{ width: `${widthPct}%` }}
        />
      </div>
      <span className={cn("w-12 text-sm font-medium text-right", scoreColor(score))}>
        {score.toFixed(1)}/10
      </span>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [scorecards, setScorecards] = useState<VendorScorecard[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const { selectedVendor, setSelectedVendor } = useAppStore();

  useEffect(() => {
    const dataService = getDataService();
    async function loadData() {
      const [v, s, c] = await Promise.all([
        dataService.getVendors(),
        dataService.getVendorScorecards(),
        dataService.getContracts(),
      ]);
      setVendors(v);
      setScorecards(s);
      setContracts(c);
    }
    loadData();
  }, []);

  const activeVendor = vendors.find((v) => v.vendor_id === selectedVendor) ?? null;
  const activeScorecard = activeVendor
    ? scorecards.find((s) => s.vendor_id === activeVendor.vendor_id) ?? null
    : null;
  const activeContract = activeVendor
    ? contracts.find((c) => c.vendor_id === activeVendor.vendor_id) ?? null
    : null;

  const sortedContracts = [...contracts].sort(
    (a, b) => a.days_until_expiry - b.days_until_expiry
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-100">Vendors &amp; Contracts</h1>
      </div>

      {/* Vendor List Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Performance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contract Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {vendors.map((vendor) => {
                const contract = contracts.find((c) => c.vendor_id === vendor.vendor_id);
                return (
                  <tr
                    key={vendor.vendor_id}
                    className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedVendor(vendor.vendor_id)}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-100">
                      {vendor.vendor_name}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {vendor.category.join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", scoreColor(vendor.performance_score))}>
                        <Star className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                        {vendor.performance_score.toFixed(1)}/10
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={vendor.approved_status} />
                    </td>
                    <td className="px-4 py-3">
                      {contract ? (
                        <span className="flex items-center gap-2">
                          <span className="text-zinc-300">{formatDate(contract.end_date)}</span>
                          <span className={cn("text-xs font-medium", daysUntilColor(contract.days_until_expiry))}>
                            <Clock className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                            {contract.days_until_expiry}d
                          </span>
                        </span>
                      ) : (
                        <span className="text-zinc-500">No contract</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Vendor Detail Modal */}
      <Modal
        open={activeVendor !== null}
        onClose={() => setSelectedVendor(null)}
        title={activeVendor?.vendor_name ?? "Vendor Detail"}
        wide
      >
        {activeVendor && (
          <div className="space-y-6">
            {/* Contact Info */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">Contact:</span>
                    <span className="text-zinc-100">{activeVendor.contact_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300">{activeVendor.contact_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-zinc-300">{activeVendor.contact_phone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">Payment Terms:</span>
                    <span className="text-zinc-100">{activeVendor.payment_terms}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">Tax ID:</span>
                    <span className="text-zinc-300">{activeVendor.tax_id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">Onboarding:</span>
                    <span className="text-zinc-300">{formatDate(activeVendor.onboarding_date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Scorecard */}
            {activeScorecard && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                  Performance Scorecard
                </h3>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-4">
                  {/* Overall Score */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-amber-400" />
                      <span className="text-zinc-200 font-medium">Overall Score</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-2xl font-bold", scoreColor(activeScorecard.overall_score))}>
                        {activeScorecard.overall_score.toFixed(1)}/10
                      </span>
                      <StatusBadge status={activeScorecard.recommendation} />
                    </div>
                  </div>

                  {/* Score Bars */}
                  <div className="space-y-2.5">
                    <ScoreBar label="Delivery" score={activeScorecard.delivery_score} />
                    <ScoreBar label="Accuracy" score={activeScorecard.accuracy_score} />
                    <ScoreBar label="Quality" score={activeScorecard.quality_score} />
                    <ScoreBar label="Pricing" score={activeScorecard.pricing_score} />
                    <ScoreBar label="Responsiveness" score={activeScorecard.responsiveness_score} />
                  </div>

                  {/* AI Commentary */}
                  {activeScorecard.ai_commentary && (
                    <div className="ai-content mt-3 rounded-md border border-zinc-700 bg-zinc-800/50 p-3">
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {activeScorecard.ai_commentary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contract Section */}
            {activeContract && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                  Contract Details
                </h3>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Contract ID:</span>
                      <span className="text-zinc-100 font-mono">{activeContract.contract_id}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Status:</span>
                      <StatusBadge status={activeContract.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Start:</span>
                      <span className="text-zinc-200">{formatDate(activeContract.start_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">End:</span>
                      <span className="text-zinc-200">{formatDate(activeContract.end_date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Total Value:</span>
                      <span className="text-zinc-100 font-medium">{formatEUR(activeContract.total_value)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Auto-Renew:</span>
                      <span className={activeContract.auto_renew ? "text-emerald-400" : "text-zinc-400"}>
                        {activeContract.auto_renew ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>

                  {activeContract.key_terms && (
                    <div className="pt-2 border-t border-zinc-800">
                      <span className="text-xs text-zinc-400 uppercase tracking-wider">Key Terms</span>
                      <p className="text-sm text-zinc-300 mt-1">{activeContract.key_terms}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    {activeContract.days_until_expiry <= 30 && (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className={cn("text-sm font-medium", daysUntilColor(activeContract.days_until_expiry))}>
                      {activeContract.days_until_expiry} days until expiry
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Contract Expiry Timeline */}
      <Card>
        <h2 className="text-lg font-semibold text-zinc-100 mb-4">Contract Expiry Timeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-800/50 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">End</th>
                <th className="px-4 py-3">Days Left</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sortedContracts.map((contract) => (
                <tr key={contract.contract_id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 text-zinc-100 font-medium">
                    {contract.vendor_name}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDate(contract.start_date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {formatDate(contract.end_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            expiryBarColor(contract.days_until_expiry)
                          )}
                          style={{
                            width: `${Math.min(100, (contract.days_until_expiry / 120) * 100)}%`,
                          }}
                        />
                      </div>
                      <span className={cn("text-xs font-medium", daysUntilColor(contract.days_until_expiry))}>
                        {contract.days_until_expiry}d
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={contract.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-100 font-medium">
                    {formatEUR(contract.total_value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
