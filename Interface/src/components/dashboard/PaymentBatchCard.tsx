"use client";

import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn, formatEUR, formatDate } from "@/lib/utils";
import type { ApprovalItem } from "@/types/approval";
import type { BatchInvoice, PaymentBatch } from "@/types";

interface PaymentBatchCardProps {
  item: ApprovalItem;
  currentUser: string;
  inFlight: boolean;
  error?: string;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem, reason: string) => void;
  onViewDetails?: (item: ApprovalItem) => void;
  onDismissError?: (recordId: string) => void;
}

function isPaymentBatch(raw: ApprovalItem["raw"]): raw is PaymentBatch {
  return !!raw && "batch_id" in raw;
}

export function PaymentBatchCard({
  item,
  currentUser,
  inFlight,
  error,
  onApprove,
  onReject,
  onViewDetails,
  onDismissError,
}: PaymentBatchCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [invoicesOpen, setInvoicesOpen] = useState(false);

  const batch = isPaymentBatch(item.raw) ? item.raw : null;
  const invoices: BatchInvoice[] = batch?.invoices ?? [];
  const batchDate = batch?.batch_date || batch?.created_date || item.created_date;
  const dueCutoff = batch?.due_date_cutoff || batch?.due_date || item.due_date || "";
  const paymentMethod = batch?.payment_method || "Bank Transfer";
  const invoiceCount = item.invoice_count ?? invoices.length;

  const handleApproveClick = () => {
    if (inFlight) return;
    onApprove(item);
  };

  const handleRejectOpen = () => {
    if (inFlight) return;
    setRejectOpen(true);
  };

  const handleRejectConfirm = () => {
    if (inFlight) return;
    onReject(item, reason.trim());
    setRejectOpen(false);
    setReason("");
  };

  return (
    <Card className={cn("space-y-3 relative col-span-1 lg:col-span-2", inFlight && "opacity-70")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider text-violet-400 bg-violet-500/10 border-violet-500/30"
            title="Payment Batch"
          >
            Batch
          </span>
          <span className="mono text-sm font-semibold text-zinc-200 truncate">
            {item.reference_id}
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider text-blue-400 bg-blue-500/10 border-blue-500/30">
            Pending Approval
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 mono shrink-0">
          Created {formatDate(batchDate)}
          {dueCutoff && ` · Due through ${formatDate(dueCutoff)}`}
        </span>
      </div>

      <div className="flex items-end justify-between gap-3 rounded-md bg-zinc-950/60 border border-zinc-800 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Batch Total</p>
          <p className="text-2xl font-bold mono text-zinc-100">{formatEUR(item.total_amount)}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-xs text-zinc-400">
            {invoiceCount} {invoiceCount === 1 ? "invoice" : "invoices"}
          </p>
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wider text-zinc-400 border-zinc-700 bg-zinc-800/60">
            <CreditCard className="w-3 h-3" />
            {paymentMethod}
          </span>
        </div>
      </div>

      {item.ai_note && (
        <div className="rounded-md border border-violet-500/30 bg-violet-500/5 p-2.5 text-xs text-zinc-300 leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1 text-violet-400 text-[10px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            AI Reasoning
          </div>
          <p className="text-zinc-300">{item.ai_note}</p>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40">
          <button
            type="button"
            onClick={() => setInvoicesOpen((v) => !v)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            {invoicesOpen ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
            <span className="font-medium">
              {invoicesOpen ? "Hide invoices" : "Show invoices"}
            </span>
            <span className="ml-auto text-[10px] text-zinc-500 mono">
              {invoices.length} {invoices.length === 1 ? "item" : "items"}
            </span>
          </button>

          {invoicesOpen && (
            <div className="overflow-x-auto border-t border-zinc-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-900/60">
                    <th className="text-left font-medium text-zinc-500 px-3 py-1.5">Vendor</th>
                    <th className="text-left font-medium text-zinc-500 px-3 py-1.5">Invoice #</th>
                    <th className="text-right font-medium text-zinc-500 px-3 py-1.5">Amount</th>
                    <th className="text-left font-medium text-zinc-500 px-3 py-1.5">Due</th>
                    <th className="text-left font-medium text-zinc-500 px-3 py-1.5">PO</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => (
                    <tr
                      key={`${inv.invoice_number}-${idx}`}
                      className="border-t border-zinc-800/60"
                    >
                      <td className="px-3 py-1.5 text-zinc-300 truncate max-w-[180px]">
                        {inv.vendor_name}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400 mono">{inv.invoice_number}</td>
                      <td className="px-3 py-1.5 text-right text-zinc-200 mono">
                        {formatEUR(inv.amount)}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400">
                        {inv.due_date ? formatDate(inv.due_date) : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-zinc-400 mono">
                        {inv.po_number || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            {onDismissError && (
              <button
                onClick={() => onDismissError(item.record_id)}
                className="mt-1 text-[11px] text-red-400/80 hover:text-red-300 underline"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant="success"
          onClick={handleApproveClick}
          disabled={inFlight}
          aria-busy={inFlight}
        >
          {inFlight ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          Approve Batch
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={handleRejectOpen}
          disabled={inFlight}
          aria-busy={inFlight}
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </Button>
        {onViewDetails && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(item)}
            disabled={inFlight}
          >
            Details <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        )}
        <span className="ml-auto text-[10px] text-zinc-500 mono">{currentUser}</span>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setReason("");
        }}
        title={`Reject Payment Batch ${item.reference_id}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Provide a reason for rejecting this payment batch. The entire batch will
            be returned to staging — individual invoices remain unchanged.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Razlog odbijanja…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejectOpen(false);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button size="sm" variant="danger" onClick={handleRejectConfirm} disabled={inFlight}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
