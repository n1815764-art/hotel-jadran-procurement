"use client";

import { useState } from "react";
import { CheckCircle, XCircle, ArrowRight, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn, formatEUR, formatDate, approvalTier } from "@/lib/utils";
import type { ApprovalItem } from "@/types/approval";

interface ApprovalCardProps {
  item: ApprovalItem;
  currentUser: string;
  pending: boolean;
  error?: string;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem, reason: string) => void;
  onViewDetails?: (item: ApprovalItem) => void;
  onDismissError?: (recordId: string) => void;
}

export function ApprovalCard({
  item,
  currentUser,
  pending,
  error,
  onApprove,
  onReject,
  onViewDetails,
  onDismissError,
}: ApprovalCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const handleRejectConfirm = () => {
    onReject(item, reason.trim());
    setRejectOpen(false);
    setReason("");
  };

  const typeLabel = item.type === "po" ? "Purchase Order" : "Payment Batch";
  const tier = approvalTier(item.total_amount);

  return (
    <Card className={cn("space-y-3 relative", pending && "opacity-70")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider",
              item.type === "po"
                ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/30"
                : "text-violet-400 bg-violet-500/10 border-violet-500/30"
            )}
            title={typeLabel}
          >
            {item.type === "po" ? "PO" : "Batch"}
          </span>
          <span className="mono text-sm font-semibold text-zinc-200 truncate">
            {item.reference_id}
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 mono shrink-0">{tier}</span>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-zinc-300 truncate">{item.vendor_name}</p>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          {item.department && <span>{item.department}</span>}
          {item.invoice_count !== undefined && (
            <span>{item.invoice_count} invoices</span>
          )}
          <span className="mono font-semibold text-zinc-200">
            {formatEUR(item.total_amount)}
          </span>
          {item.due_date && (
            <span className="text-[11px]">Due {formatDate(item.due_date)}</span>
          )}
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
          onClick={() => onApprove(item)}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setRejectOpen(true)}
          disabled={pending}
        >
          <XCircle className="w-3.5 h-3.5" />
          Reject
        </Button>
        {onViewDetails && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(item)}
            disabled={pending}
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
        title={`Reject ${typeLabel} ${item.reference_id}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-300">
            Provide a reason for rejection. This is optional but recommended — it
            will be recorded in the audit trail.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Reason for rejection…"
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
            <Button size="sm" variant="danger" onClick={handleRejectConfirm}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
