"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import type { Alert, InventoryItem, Invoice, PurchaseOrder } from "@/types";
import {
  cn,
  severityColor,
  formatEUR,
  formatDateTime,
  formatDate,
  stockLevelPercent,
  stockLevelColor,
  matchStatusColor,
  poStatusColor,
  approvalTier,
} from "@/lib/utils";

interface Props {
  alert: Alert | null;
  onClose: () => void;
  inventory: InventoryItem[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
}

export function AlertDetailOverlay({ alert, onClose, inventory, invoices, purchaseOrders }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      // Next frame so the initial opacity-0 is painted before we transition
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
  }, [alert]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (alert) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [alert, handleEsc]);

  if (!alert) return null;

  const severityLabel = {
    critical: "CRITICAL",
    warning: "WARNING",
    approval: "APPROVAL",
    info: "INFO",
  }[alert.severity] ?? alert.severity.toUpperCase();

  const severityTextColor = {
    critical: "text-red-400",
    warning: "text-amber-400",
    approval: "text-blue-400",
    info: "text-zinc-400",
  }[alert.severity] ?? "text-zinc-400";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 bg-zinc-950 overflow-y-auto transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-6 py-4 bg-zinc-950/95 border-b border-zinc-800 backdrop-blur-sm">
        <button
          onClick={handleClose}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <div className="h-4 w-px bg-zinc-700" />
        <span className={cn("text-xs font-bold mono tracking-widest", severityTextColor)}>
          {severityLabel}
        </span>
        <span className="text-sm font-semibold text-zinc-200">{alert.title}</span>
        <span className="text-[10px] text-zinc-600 mono ml-auto">{alert.workflow_id}</span>
      </div>

      {/* Two-panel body */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-57px)]">
        {/* ── Left: Alert details ── */}
        <div className="p-6 lg:border-r border-zinc-800 space-y-5">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Alert Details</p>
            <div className={cn("rounded-lg border p-4 space-y-3", severityColor(alert.severity))}>
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5">
                  {alert.severity === "critical" && "🚨"}
                  {alert.severity === "warning" && "⚠️"}
                  {alert.severity === "approval" && "📋"}
                  {alert.severity === "info" && "ℹ️"}
                </span>
                <div>
                  <p className="text-base font-semibold text-zinc-100 mb-1">{alert.title}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{alert.message}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetaField label="Alert ID" value={alert.id} mono />
            <MetaField label="Severity" value={severityLabel} colored={severityTextColor} />
            <MetaField label="Workflow" value={alert.workflow_id} mono />
            <MetaField label="Triggered" value={formatDateTime(alert.timestamp)} />
            {alert.reference_id && (
              <MetaField label="Reference" value={alert.reference_id} mono />
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">What this means</p>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4">
              <AlertExplanation alert={alert} />
            </div>
          </div>
        </div>

        {/* ── Right: Evidence ── */}
        <div className="p-6 space-y-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Evidence from Database</p>
          <EvidencePanel
            alert={alert}
            inventory={inventory}
            invoices={invoices}
            purchaseOrders={purchaseOrders}
          />
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

function MetaField({
  label,
  value,
  mono,
  colored,
}: {
  label: string;
  value: string;
  mono?: boolean;
  colored?: string;
}) {
  return (
    <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</p>
      <p className={cn("text-xs text-zinc-200", mono && "mono", colored)}>{value}</p>
    </div>
  );
}

function AlertExplanation({ alert }: { alert: Alert }) {
  const explanations: Record<string, string> = {
    "ALR-001":
      "Negative stock is physically impossible — it means the POS2 recipe for 'Orada na zaru' is misconfigured and deducting chicken instead of fish. Every grilled sea bream sold incorrectly decrements chicken stock. Auto-reorder has been suspended to prevent ordering unnecessary stock.",
    "ALR-002":
      "Ghost surplus occurs when the system shows stock that doesn't exist. 35 portions of sea bream were sold, but inventory wasn't reduced because the POS2 recipe deducts chicken instead. The displayed 25 kg is unreliable — actual stock is likely much lower.",
    "ALR-003":
      "The vendor invoiced butter at €6.90/kg but the contract rate is €5.50/kg — a 25.5% overcharge. On 40 kg this equals €56.00 extra. The invoice is on hold until the vendor provides a credit note or corrected invoice.",
    "ALR-007":
      "An invoice arrived with no corresponding Purchase Order. This is a control risk — goods may have been ordered verbally without going through the procurement system. The invoice cannot be approved until a PO is created retroactively and approved.",
    "ALR-008":
      "Two invoices with identical line items and amounts arrived for the same PO. This is a common fraud vector (double billing). One invoice must be confirmed as the original and the duplicate rejected before payment.",
    "ALR-009":
      "The contract with this vendor expires in 5 days and does not auto-renew. Without a valid contract, any new POs lack price protection and liability coverage. Renewal negotiations must start immediately.",
    "ALR-012":
      "This vendor is on probation. Three late deliveries this month pushed their score below the 6.0 threshold. Continued poor performance will trigger automatic vendor replacement workflow (WF-10).",
  };
  const text = explanations[alert.id];
  if (text) {
    return <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>;
  }
  return (
    <p className="text-sm text-zinc-400 leading-relaxed">
      This alert was generated by workflow <span className="mono text-zinc-200">{alert.workflow_id}</span>.
      Review the reference data in the evidence panel for full context.
    </p>
  );
}

// ── Evidence Panel ───────────────────────────────────────────────────────────

function EvidencePanel({
  alert,
  inventory,
  invoices,
  purchaseOrders,
}: {
  alert: Alert;
  inventory: InventoryItem[];
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
}) {
  const ref = alert.reference_id;

  // Inventory items (by item_id)
  if (ref && /^(PROT|FISH|MEAT|VEG|DAIRY|DRY|BEV|WINE|CLEAN|LINEN)-/.test(ref)) {
    const item = inventory.find((i) => i.item_id === ref);
    if (item) return <InventoryEvidence item={item} />;
  }

  // Purchase Order — starts with "PO-"
  if (ref?.startsWith("PO-")) {
    const po = purchaseOrders.find((p) => p.po_number === ref);
    if (po) return <POEvidence po={po} />;
    return <PendingEvidence ref={ref} type="Purchase Order" />;
  }

  // Invoice by legacy INV- prefix
  if (ref?.startsWith("INV-")) {
    const invoice = invoices.find((i) => i.invoice_id === ref || i.vendor_invoice_number === ref);
    if (invoice) return <InvoiceEvidence invoice={invoice} />;
    return <PendingEvidence ref={ref} type="Invoice" />;
  }

  // Invoice number formats from Airtable: "826/2026", "1923/2026", "01420", etc.
  // Matches: digits/digits, or pure digit strings that aren't PO/REQ IDs
  if (ref && /^\d+\/\d{4}$/.test(ref)) {
    const invoice = invoices.find((i) => i.vendor_invoice_number === ref);
    if (invoice) return <InvoiceEvidence invoice={invoice} />;
    return <PendingEvidence ref={ref} type="Invoice" />;
  }

  // Requisition — starts with "REQ-": try to find a related PO or invoice
  if (ref?.startsWith("REQ-")) {
    const po = purchaseOrders.find((p) => p.po_number === ref);
    if (po) return <POEvidence po={po} />;
    // Fall through to generic display
  }

  // Vendor
  if (ref?.startsWith("V-")) {
    return <VendorEvidence alert={alert} />;
  }

  // Contract
  if (ref?.startsWith("CON-")) {
    return <ContractEvidence alert={alert} />;
  }

  // Report
  if (ref?.startsWith("RPT-")) {
    return <ReportEvidence alert={alert} />;
  }

  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6 text-center">
      <p className="text-zinc-500 text-sm">No structured evidence data available for this alert.</p>
      <p className="text-zinc-600 text-xs mt-1">
        Check the <span className="mono text-zinc-400">{alert.workflow_id}</span> logs in n8n for details.
      </p>
    </div>
  );
}

function InventoryEvidence({ item }: { item: InventoryItem }) {
  const pct = stockLevelPercent(item.current_stock, item.par_level);
  const barColor = item.negative_stock ? "bg-red-500" : item.ghost_surplus ? "bg-amber-500" : stockLevelColor(pct);

  return (
    <div className="space-y-4">
      <EvidenceCard title="Inventory Record" subtitle={item.item_id}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <EvidenceField label="Item" value={item.item_name} />
          <EvidenceField label="Category" value={item.category} />
          <EvidenceField label="Warehouse" value={item.warehouse} />
          <EvidenceField label="Unit" value={item.unit_of_measure} />
          <EvidenceField label="Unit Cost" value={formatEUR(item.unit_cost)} />
          <EvidenceField label="Vendor" value={item.preferred_vendor_name} />
        </div>

        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Stock Levels</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className={cn("rounded-md p-3 text-center border", item.negative_stock ? "border-red-500 bg-red-500/10" : "border-zinc-700 bg-zinc-800")}>
            <p className="text-[10px] text-zinc-500 mb-1">Current Stock</p>
            <p className={cn("text-lg font-bold mono", item.negative_stock ? "text-red-400" : "text-zinc-100")}>
              {item.current_stock} {item.unit_of_measure}
            </p>
          </div>
          <div className="rounded-md p-3 text-center border border-zinc-700 bg-zinc-800">
            <p className="text-[10px] text-zinc-500 mb-1">Par Level</p>
            <p className="text-lg font-bold mono text-zinc-100">{item.par_level} {item.unit_of_measure}</p>
          </div>
          <div className="rounded-md p-3 text-center border border-zinc-700 bg-zinc-800">
            <p className="text-[10px] text-zinc-500 mb-1">Reorder Point</p>
            <p className="text-lg font-bold mono text-zinc-100">{item.reorder_point} {item.unit_of_measure}</p>
          </div>
        </div>

        <div className="rounded-md bg-zinc-800 h-3 overflow-hidden">
          <div
            className={cn("h-full transition-all", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-zinc-600 mono mt-1">
          <span>0</span>
          <span>{item.negative_stock ? "NEGATIVE" : `${pct}% of par`}</span>
          <span>{item.par_level}</span>
        </div>
      </EvidenceCard>

      {item.ai_flag && (
        <EvidenceCard title="AI Analysis">
          <p className="text-sm text-zinc-300 leading-relaxed">{item.ai_flag}</p>
        </EvidenceCard>
      )}

      <div className="flex gap-2">
        {item.negative_stock && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            🚨 Negative Stock
          </span>
        )}
        {item.ghost_surplus && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            ⚠️ Ghost Surplus
          </span>
        )}
      </div>
    </div>
  );
}

function InvoiceEvidence({ invoice }: { invoice: Invoice }) {
  return (
    <div className="space-y-4">
      <EvidenceCard title="Invoice Record" subtitle={invoice.invoice_id}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <EvidenceField label="Vendor Invoice #" value={invoice.vendor_invoice_number} mono />
          <EvidenceField label="Vendor" value={invoice.vendor_name} />
          <EvidenceField label="Invoice Date" value={formatDate(invoice.invoice_date)} />
          <EvidenceField label="Received" value={formatDate(invoice.received_date)} />
          <EvidenceField label="Linked PO" value={invoice.po_number ?? "— None —"} mono />
          <EvidenceField label="GL Account" value={invoice.gl_account} mono />
          {invoice.ocr_confidence !== undefined && (
            <EvidenceField label="OCR Confidence" value={`${invoice.ocr_confidence}%`} />
          )}
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Match Status</p>
            <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium border", matchStatusColor(invoice.match_status))}>
              {invoice.match_status}
            </span>
          </div>
        </div>

        <div className="rounded-md bg-zinc-800/50 border border-zinc-700 p-3 mb-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Match Details</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{invoice.match_details}</p>
        </div>

        <div className="flex items-center justify-between rounded-md bg-zinc-800 border border-zinc-700 px-4 py-3">
          <span className="text-xs text-zinc-400">Invoice Total</span>
          <span className="text-base font-bold mono text-zinc-100">{formatEUR(invoice.total_amount)}</span>
        </div>
      </EvidenceCard>

      {invoice.items && invoice.items.length > 0 && (
        <EvidenceCard title="Line Items">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left text-zinc-500 font-medium pb-2 pr-3">Item</th>
                  <th className="text-right text-zinc-500 font-medium pb-2 pr-3">Qty</th>
                  <th className="text-right text-zinc-500 font-medium pb-2 pr-3">Invoice €</th>
                  {invoice.items.some((i) => i.po_unit_price) && (
                    <th className="text-right text-zinc-500 font-medium pb-2">Contract €</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const hasDispute = item.po_unit_price !== undefined && item.unit_price !== item.po_unit_price;
                  return (
                    <tr key={idx} className={cn("border-b border-zinc-800", hasDispute && "bg-red-500/5")}>
                      <td className="py-1.5 pr-3 text-zinc-300">{item.item_name}</td>
                      <td className="py-1.5 pr-3 text-right mono text-zinc-400">
                        {item.quantity} {item.unit}
                      </td>
                      <td className={cn("py-1.5 pr-3 text-right mono", hasDispute ? "text-red-400 font-medium" : "text-zinc-300")}>
                        {formatEUR(item.unit_price)}
                      </td>
                      {invoice.items!.some((i) => i.po_unit_price) && (
                        <td className="py-1.5 text-right mono text-zinc-400">
                          {item.po_unit_price ? formatEUR(item.po_unit_price) : "—"}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </EvidenceCard>
      )}

      {invoice.duplicate_flag && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400 mb-1">⚠️ Duplicate Flag Active</p>
          <p className="text-xs text-red-300/80">This invoice has been flagged as a potential duplicate. Do not process until manually verified.</p>
        </div>
      )}
    </div>
  );
}

function POEvidence({ po }: { po: PurchaseOrder }) {
  const tier = approvalTier(po.total_amount);
  return (
    <div className="space-y-4">
      <EvidenceCard title="Purchase Order" subtitle={po.po_number}>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <EvidenceField label="Vendor" value={po.vendor_name} />
          <EvidenceField label="Department" value={po.department} />
          <EvidenceField label="Source" value={po.source} />
          <EvidenceField label="Requester" value={po.requester} />
          <EvidenceField label="Created" value={formatDateTime(po.date_created)} />
          <EvidenceField label="GL Account" value={po.gl_account} mono />
          <div className="col-span-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Status</p>
            <span className={cn("inline-flex px-2 py-0.5 rounded text-xs font-medium border", poStatusColor(po.status))}>
              {po.status}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md bg-zinc-800 border border-zinc-700 px-4 py-3 mb-3">
          <span className="text-xs text-zinc-400">Total Amount</span>
          <span className="text-base font-bold mono text-zinc-100">{formatEUR(po.total_amount)}</span>
        </div>

        <div className="rounded-md bg-blue-500/10 border border-blue-500/30 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wider text-blue-400 mb-1">Approval Required</p>
          <p className="text-sm font-medium text-blue-300">{tier}</p>
        </div>
      </EvidenceCard>

      <EvidenceCard title="AI Recommendation">
        <p className="text-sm text-zinc-300 leading-relaxed">{po.ai_note}</p>
      </EvidenceCard>

      <EvidenceCard title="Line Items">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left text-zinc-500 font-medium pb-2 pr-3">Item</th>
                <th className="text-right text-zinc-500 font-medium pb-2 pr-3">Qty</th>
                <th className="text-right text-zinc-500 font-medium pb-2 pr-3">Unit €</th>
                <th className="text-right text-zinc-500 font-medium pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-800">
                  <td className="py-1.5 pr-3 text-zinc-300">{item.item_name}</td>
                  <td className="py-1.5 pr-3 text-right mono text-zinc-400">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-1.5 pr-3 text-right mono text-zinc-400">{formatEUR(item.unit_price)}</td>
                  <td className="py-1.5 text-right mono text-zinc-200 font-medium">
                    {formatEUR(item.quantity * item.unit_price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </EvidenceCard>
    </div>
  );
}

function VendorEvidence({ alert }: { alert: Alert }) {
  return (
    <EvidenceCard title="Vendor Reference" subtitle={alert.reference_id ?? ""}>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{alert.message}</p>
      <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3">
        <p className="text-xs text-amber-300">
          Full vendor scorecard data is available in the{" "}
          <span className="font-medium">Vendors</span> section. Navigate there to view delivery
          history, performance scores, and the AI recommendation.
        </p>
      </div>
    </EvidenceCard>
  );
}

function ContractEvidence({ alert }: { alert: Alert }) {
  return (
    <EvidenceCard title="Contract Reference" subtitle={alert.reference_id ?? ""}>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{alert.message}</p>
      <div className="rounded-md bg-red-500/10 border border-red-500/30 p-3">
        <p className="text-xs text-red-300">
          Contract data is tracked in Airtable under{" "}
          <span className="mono font-medium">contract-tracker</span>. Renew via the Vendors section or
          contact the Controller directly.
        </p>
      </div>
    </EvidenceCard>
  );
}

function ReportEvidence({ alert }: { alert: Alert }) {
  return (
    <EvidenceCard title="Flash Report" subtitle={alert.reference_id ?? ""}>
      <p className="text-sm text-zinc-300 leading-relaxed mb-4">{alert.message}</p>
      <div className="rounded-md bg-zinc-800 border border-zinc-700 p-3">
        <p className="text-xs text-zinc-400">
          The full report PDF is generated by workflow{" "}
          <span className="mono text-zinc-300">{alert.workflow_id}</span> and emailed to management.
          View the Reports section for historical flash reports.
        </p>
      </div>
    </EvidenceCard>
  );
}

function PendingEvidence({ ref, type }: { ref: string; type: string }) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-6 text-center space-y-2">
      <p className="text-zinc-400 text-sm font-medium">{type} {ref}</p>
      <p className="text-zinc-600 text-xs">
        This record exists in Airtable but is not yet in the sample dataset.
        Connect the live Airtable API to see full evidence here.
      </p>
    </div>
  );
}

function EvidenceCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80">
        <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">{title}</p>
        {subtitle && <span className="text-[10px] mono text-zinc-500">{subtitle}</span>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EvidenceField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</p>
      <p className={cn("text-xs text-zinc-200 truncate", mono && "mono")}>{value}</p>
    </div>
  );
}
