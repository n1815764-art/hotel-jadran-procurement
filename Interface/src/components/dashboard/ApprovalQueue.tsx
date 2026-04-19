"use client";

import { useState } from "react";
import { Inbox, ChevronDown, ChevronUp } from "lucide-react";
import type { DataService } from "@/services/data-service";
import type { ApprovalItem } from "@/types/approval";
import { useApprovals } from "@/hooks/useApprovals";
import { useApprovalStore } from "@/store/approval-store";
import { ApprovalCard } from "./ApprovalCard";

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
  const { items, pending, errors, loading, error, clearError } = useApprovals(dataService);
  const submit = useApprovalStore((s) => s.submit);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? items : items.slice(0, maxVisible);
  const hiddenCount = Math.max(0, items.length - maxVisible);

  const handleApprove = (item: ApprovalItem) => {
    submit({
      type: item.type,
      record_id: item.record_id,
      reference_id: item.reference_id,
      action: "approve",
      approved_by: currentUser,
    });
  };

  const handleReject = (item: ApprovalItem, reason: string) => {
    submit({
      type: item.type,
      record_id: item.record_id,
      reference_id: item.reference_id,
      action: "reject",
      approved_by: currentUser,
      notes: reason || undefined,
    });
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
            {visible.map((item) => (
              <ApprovalCard
                key={item.record_id}
                item={item}
                currentUser={currentUser}
                pending={Boolean(pending[item.record_id])}
                error={errors[item.record_id]}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={onViewDetails}
                onDismissError={clearError}
              />
            ))}
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
