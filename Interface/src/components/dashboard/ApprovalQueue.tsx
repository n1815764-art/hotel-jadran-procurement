"use client";

import { useState } from "react";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";
import type { DataService } from "@/services/data-service";
import type { ApprovalItem } from "@/types/approval";
import type { POLineItem } from "@/types";
import { useApprovals } from "@/hooks/useApprovals";
import { useApprovalStore } from "@/store/approval-store";
import { useToastStore } from "@/store/toast-store";
import { ApprovalCard } from "./ApprovalCard";
import { PaymentBatchCard } from "./PaymentBatchCard";

interface ApprovalQueueProps {
  dataService: DataService;
  currentUser: string;
  maxVisible?: number;
  onViewDetails?: (item: ApprovalItem) => void;
}

export function ApprovalQueue({
  dataService,
  currentUser,
  maxVisible = 5,
  onViewDetails,
}: ApprovalQueueProps) {
  const { items, inFlight, errors, editStates, loading, error, clearError } =
    useApprovals(dataService);
  const submit = useApprovalStore((s) => s.submit);
  const startEdit = useApprovalStore((s) => s.startEdit);
  const cancelEdit = useApprovalStore((s) => s.cancelEdit);
  const updateEditedQuantity = useApprovalStore((s) => s.updateEditedQuantity);
  const submitEditAndApprove = useApprovalStore((s) => s.submitEditAndApprove);
  const pushToast = useToastStore((s) => s.push);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, maxVisible);
  const hiddenCount = Math.max(0, items.length - maxVisible);

  const handleApprove = async (item: ApprovalItem) => {
    const ok = await submit({
      type: item.type,
      record_id: item.record_id,
      reference_id: item.reference_id,
      action: "approve",
      approved_by: currentUser,
    });
    if (ok) {
      pushToast({
        severity: "approval",
        title: "Approval sent",
        message: `${item.reference_id} approved by ${currentUser}.`,
      });
    } else {
      pushToast({
        severity: "critical",
        title: "Approval failed",
        message: `${item.reference_id} could not be approved. It has been restored to the queue.`,
      });
    }
  };

  const handleReject = async (item: ApprovalItem, reason: string) => {
    const ok = await submit({
      type: item.type,
      record_id: item.record_id,
      reference_id: item.reference_id,
      action: "reject",
      approved_by: currentUser,
      notes: reason || undefined,
    });
    if (ok) {
      pushToast({
        severity: "warning",
        title: "Rejection sent",
        message: `${item.reference_id} rejected by ${currentUser}.`,
      });
    } else {
      pushToast({
        severity: "critical",
        title: "Rejection failed",
        message: `${item.reference_id} could not be rejected. It has been restored to the queue.`,
      });
    }
  };

  const handleStartEdit = (item: ApprovalItem, originalItems: POLineItem[]) => {
    startEdit(item.record_id, originalItems);
  };

  const handleCancelEdit = (item: ApprovalItem) => {
    cancelEdit(item.record_id);
  };

  const handleChangeQuantity = (
    item: ApprovalItem,
    itemIndex: number,
    quantity: number
  ) => {
    updateEditedQuantity(item.record_id, itemIndex, quantity);
  };

  const handleSaveAndApprove = async (
    item: ApprovalItem,
    modifiedItems: POLineItem[],
    originalItems: POLineItem[]
  ) => {
    const ok = await submitEditAndApprove({
      payload: {
        type: item.type,
        record_id: item.record_id,
        reference_id: item.reference_id,
        action: "approve",
        approved_by: currentUser,
      },
      modifiedItems,
      originalItems,
      modifiedBy: currentUser,
      dataService,
    });
    if (ok) {
      pushToast({
        severity: "approval",
        title: "Modified & approved",
        message: `${item.reference_id} approved with quantity adjustments.`,
      });
    } else {
      pushToast({
        severity: "critical",
        title: "Edit & approve failed",
        message: `${item.reference_id} could not be processed. See card for details.`,
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          Pending Approvals
          {!loading && items.length > 0 && (
            <span className="ml-2 text-zinc-600 font-normal normal-case">
              ({items.length})
            </span>
          )}
        </h2>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          Failed to load approvals: {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-lg bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-zinc-800 bg-zinc-900/30 text-sm text-zinc-500">
          <Inbox className="w-4 h-4" />
          <span>No items are awaiting approval.</span>
        </div>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {visible.map((item) => {
              const common = {
                item,
                currentUser,
                inFlight: inFlight.has(item.record_id),
                error: errors[item.record_id],
                onApprove: handleApprove,
                onReject: handleReject,
                onViewDetails,
                onDismissError: clearError,
              };
              if (item.type === "batch") {
                return <PaymentBatchCard key={item.record_id} {...common} />;
              }
              return (
                <ApprovalCard
                  key={item.record_id}
                  {...common}
                  editState={editStates[item.record_id]}
                  onStartEdit={handleStartEdit}
                  onCancelEdit={handleCancelEdit}
                  onChangeQuantity={handleChangeQuantity}
                  onSaveAndApprove={handleSaveAndApprove}
                />
              );
            })}
          </div>

          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" /> Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" /> Show {hiddenCount} more
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}
