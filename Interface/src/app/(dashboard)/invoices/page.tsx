"use client";

import { useState, useEffect } from "react";
import type { Invoice, InvoiceLineItem } from "@/types";
import { getDataService } from "@/services/sample-data-service";
import { useAppStore } from "@/stores/app-store";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatEUR, formatDate, cn } from "@/lib/utils";
import { MATCH_STATUSES } from "@/lib/constants";
import { AlertTriangle, Send, Edit, X } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<Invoice | null>(null);

  const invoiceStatusFilter = useAppStore((s) => s.invoiceStatusFilter);
  const setInvoiceStatusFilter = useAppStore((s) => s.setInvoiceStatusFilter);
  const selectedInvoice = useAppStore((s) => s.selectedInvoice);
  const setSelectedInvoice = useAppStore((s) => s.setSelectedInvoice);

  const ds = getDataService();

  useEffect(() => {
    ds.getInvoices(invoiceStatusFilter).then(setInvoices);
  }, [invoiceStatusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedInvoice) {
      ds.getInvoiceById(selectedInvoice).then((inv) => {
        setSelectedInvoiceData(inv ?? null);
      });
    } else {
      setSelectedInvoiceData(null);
    }
  }, [selectedInvoice]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCloseModal = () => {
    setSelectedInvoice(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-100">Invoices &amp; Three-Way Matching</h1>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-3">
        {MATCH_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setInvoiceStatusFilter(status)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
              invoiceStatusFilter === status
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Vendor Invoice #</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Vendor</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Linked PO #</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Invoice Total</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">Match Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {invoices.map((inv) => (
              <tr
                key={inv.invoice_id}
                onClick={() => setSelectedInvoice(inv.invoice_id)}
                className="cursor-pointer hover:bg-zinc-800/40 transition-colors"
              >
                <td className="px-4 py-3 mono text-zinc-200">{inv.vendor_invoice_number}</td>
                <td className="px-4 py-3 text-zinc-300">{formatDate(inv.invoice_date)}</td>
                <td className="px-4 py-3 text-zinc-300">{inv.vendor_name}</td>
                <td className="px-4 py-3 mono text-zinc-300">{inv.po_number ?? "\u2014"}</td>
                <td className="px-4 py-3 text-zinc-200 text-right mono">{formatEUR(inv.total_amount)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={inv.match_status} />
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No invoices found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoiceData && (
        <InvoiceDetailModal
          invoice={selectedInvoiceData}
          open={!!selectedInvoice}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

interface InvoiceDetailModalProps {
  invoice: Invoice;
  open: boolean;
  onClose: () => void;
}

function InvoiceDetailModal({ invoice, open, onClose }: InvoiceDetailModalProps) {
  const ocrPercent = invoice.ocr_confidence != null
    ? `${(invoice.ocr_confidence * 100).toFixed(1)}%`
    : null;

  return (
    <Modal open={open} onClose={onClose} title={`Invoice ${invoice.vendor_invoice_number}`} wide>
      <div className="space-y-6">
        {/* Duplicate Warning Banner */}
        {invoice.duplicate_flag && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-sm font-medium text-red-400">
              Potential duplicate invoice detected. Please verify before processing.
            </span>
          </div>
        )}

        {/* Header Fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HeaderField label="Invoice ID" value={invoice.invoice_id} mono />
          <HeaderField label="Vendor" value={invoice.vendor_name} />
          <HeaderField label="Invoice Date" value={formatDate(invoice.invoice_date)} />
          <HeaderField label="Received Date" value={formatDate(invoice.received_date)} />
          <HeaderField label="Linked PO" value={invoice.po_number ?? "\u2014"} mono />
          <HeaderField label="Total Amount" value={formatEUR(invoice.total_amount)} mono />
          <HeaderField label="GL Account" value={invoice.gl_account} mono />
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">OCR Confidence</span>
            {ocrPercent ? (
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                  invoice.ocr_confidence! >= 0.9
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : invoice.ocr_confidence! >= 0.7
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                )}
              >
                {ocrPercent}
              </span>
            ) : (
              <p className="text-sm text-zinc-300">{"\u2014"}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Match Status:</span>
          <StatusBadge status={invoice.match_status} />
        </div>

        {/* Side-by-Side Comparison Table */}
        {invoice.items && invoice.items.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Three-Way Comparison
            </h3>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-800/50 text-left">
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider">Item</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Invoice Qty</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">PO Qty</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Receiving Qty</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Invoice Price</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">PO Price</th>
                    <th className="px-3 py-2.5 text-xs font-medium text-zinc-400 uppercase tracking-wider text-right">Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {invoice.items.map((item, idx) => {
                    const priceDiff = item.po_unit_price != null
                      ? item.unit_price - item.po_unit_price
                      : 0;
                    const hasPriceMismatch = item.po_unit_price != null && priceDiff !== 0;

                    return (
                      <ComparisonRow key={idx} item={item} priceDiff={priceDiff} hasPriceMismatch={hasPriceMismatch} />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Match Analysis */}
        {invoice.match_details && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              AI Match Analysis
            </h3>
            <div className="ai-content rounded-lg bg-zinc-800/30 border border-zinc-700 px-4 py-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {invoice.match_details}
            </div>
          </div>
        )}

        {/* Dispute Email Draft */}
        {invoice.match_status === "Disputed" && invoice.dispute_email_draft && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Dispute Email Draft
            </h3>
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/20 px-4 py-3 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {invoice.dispute_email_draft}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="primary">
                <Send className="w-3.5 h-3.5" /> Send
              </Button>
              <Button size="sm" variant="secondary">
                <Edit className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button size="sm" variant="ghost">
                <X className="w-3.5 h-3.5" /> Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* GL Account */}
        <div className="space-y-1 pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-500 uppercase tracking-wider font-medium">GL Account</span>
          <p className="text-sm text-zinc-200 mono">{invoice.gl_account}</p>
        </div>
      </div>
    </Modal>
  );
}

function HeaderField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">{label}</span>
      <p className={cn("text-sm text-zinc-200", mono && "mono")}>{value}</p>
    </div>
  );
}

function ComparisonRow({
  item,
  priceDiff,
  hasPriceMismatch,
}: {
  item: InvoiceLineItem;
  priceDiff: number;
  hasPriceMismatch: boolean;
}) {
  const rowHighlight = hasPriceMismatch
    ? Math.abs(priceDiff) > 1
      ? "bg-red-500/5"
      : "bg-amber-500/5"
    : "";

  const diffColor = hasPriceMismatch
    ? priceDiff > 0
      ? "text-red-400"
      : "text-emerald-400"
    : "text-zinc-500";

  return (
    <tr className={cn("transition-colors", rowHighlight)}>
      <td className="px-3 py-2.5 text-zinc-200">{item.item_name}</td>
      <td className="px-3 py-2.5 text-zinc-300 text-right mono">{item.quantity}</td>
      <td className="px-3 py-2.5 text-zinc-300 text-right mono">
        {item.po_unit_price != null ? item.quantity : "\u2014"}
      </td>
      <td className="px-3 py-2.5 text-zinc-300 text-right mono">
        {item.receiving_qty != null ? item.receiving_qty : "\u2014"}
      </td>
      <td className="px-3 py-2.5 text-zinc-200 text-right mono">{formatEUR(item.unit_price)}</td>
      <td className="px-3 py-2.5 text-zinc-300 text-right mono">
        {item.po_unit_price != null ? formatEUR(item.po_unit_price) : "\u2014"}
      </td>
      <td className={cn("px-3 py-2.5 text-right mono font-medium", diffColor)}>
        {hasPriceMismatch
          ? `${priceDiff > 0 ? "+" : ""}${formatEUR(priceDiff)}`
          : "\u2014"}
      </td>
    </tr>
  );
}
