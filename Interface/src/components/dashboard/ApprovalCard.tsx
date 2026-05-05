"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle,
  Pencil,
  Save,
  RotateCcw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn, formatEUR, formatDate, approvalTier } from "@/lib/utils";
import type { ApprovalItem } from "@/types/approval";
import type { POLineItem, PurchaseOrder } from "@/types";
import type { EditState } from "@/store/approval-store";
import { totalFor } from "@/lib/po-diff";

interface ApprovalCardProps {
  item: ApprovalItem;
  currentUser: string;
  inFlight: boolean;
  error?: string;
  editState?: EditState;
  onApprove: (item: ApprovalItem) => void;
  onReject: (item: ApprovalItem, reason: string) => void;
  onStartEdit?: (item: ApprovalItem, originalItems: POLineItem[]) => void;
  onCancelEdit?: (item: ApprovalItem) => void;
  onChangeQuantity?: (item: ApprovalItem, itemIndex: number, quantity: number) => void;
  onSaveAndApprove?: (
    item: ApprovalItem,
    modifiedItems: POLineItem[],
    originalItems: POLineItem[]
  ) => void;
  onViewDetails?: (item: ApprovalItem) => void;
  onDismissError?: (recordId: string) => void;
}

function isPurchaseOrder(raw: ApprovalItem["raw"]): raw is PurchaseOrder {
  return !!raw && "po_number" in raw;
}

function quantityIsValid(value: number, original: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (value <= 0) return false;
  if (value > original) return false;
  return true;
}

export function ApprovalCard({
  item,
  currentUser,
  inFlight,
  error,
  editState,
  onApprove,
  onReject,
  onStartEdit,
  onCancelEdit,
  onChangeQuantity,
  onSaveAndApprove,
  onViewDetails,
  onDismissError,
}: ApprovalCardProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const typeLabel = item.type === "po" ? "Purchase Order" : "Payment Batch";
  const tier = approvalTier(item.total_amount);

  const po = isPurchaseOrder(item.raw) ? item.raw : null;
  const lineItems: POLineItem[] | null = po?.items ?? null;
  const canEdit =
    item.type === "po" &&
    !!lineItems &&
    lineItems.length > 0 &&
    !!onStartEdit &&
    !!onChangeQuantity &&
    !!onSaveAndApprove &&
    !!onCancelEdit;

  const isEditing = !!editState;

  const validation = useMemo(() => {
    if (!isEditing || !editState) return null;
    const errors: Array<string | null> = editState.editedItems.map((edited, i) => {
      const original = editState.originalItems[i];
      if (!original) return null;
      if (!Number.isFinite(edited.quantity)) return "Unesite broj";
      if (edited.quantity <= 0) return "Količina mora biti veća od 0";
      if (edited.quantity > original.quantity) return "Smanjenje samo — ne preko originala";
      return null;
    });
    const anyChanged = editState.editedItems.some(
      (edited, i) => edited.quantity !== editState.originalItems[i]?.quantity
    );
    const allValid = errors.every((e) => e === null);
    const newTotal = totalFor(editState.editedItems);
    const oldTotal = totalFor(editState.originalItems);
    return {
      errors,
      anyChanged,
      allValid,
      newTotal,
      oldTotal,
      delta: newTotal - oldTotal,
      canSave: allValid && anyChanged && newTotal > 0,
    };
  }, [editState, isEditing]);

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

  const handleStartEdit = () => {
    if (inFlight || !canEdit || !lineItems) return;
    onStartEdit!(item, lineItems);
  };

  const handleCancelEdit = () => {
    if (inFlight) return;
    onCancelEdit!(item);
  };

  const handleSaveAndApprove = () => {
    if (inFlight || !editState || !validation?.canSave) return;
    onSaveAndApprove!(item, editState.editedItems, editState.originalItems);
  };

  return (
    <Card
      className={cn(
        "space-y-3 relative",
        inFlight && "opacity-70",
        isEditing && "border-violet-500/40 col-span-1 lg:col-span-2"
      )}
    >
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
          {isEditing && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border uppercase tracking-wider text-violet-300 bg-violet-500/10 border-violet-500/40">
              Editing
            </span>
          )}
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
          <span
            className={cn(
              "mono font-semibold",
              isEditing && validation?.anyChanged
                ? "text-zinc-500 line-through"
                : "text-zinc-200"
            )}
          >
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

      {isEditing && editState && validation && (
        <div className="space-y-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500">
                  <th className="text-left font-medium pb-1.5 pr-3">Item</th>
                  <th className="text-right font-medium pb-1.5 pr-3 w-28">Quantity</th>
                  <th className="text-left font-medium pb-1.5 pr-3">Unit</th>
                  <th className="text-right font-medium pb-1.5 pr-3">Unit Price</th>
                  <th className="text-right font-medium pb-1.5">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {editState.editedItems.map((edited, idx) => {
                  const original = editState.originalItems[idx];
                  const errMsg = validation.errors[idx];
                  const subtotal = (Number.isFinite(edited.quantity) ? edited.quantity : 0) * edited.unit_price;
                  return (
                    <tr
                      key={`${edited.item_name}-${idx}`}
                      className="border-t border-zinc-800/60 align-top"
                    >
                      <td className="py-1.5 pr-3 text-zinc-300">{edited.item_name}</td>
                      <td className="py-1.5 pr-3">
                        <div className="flex flex-col items-end gap-0.5">
                          <input
                            type="number"
                            min={0}
                            step="any"
                            disabled={inFlight}
                            value={Number.isFinite(edited.quantity) ? edited.quantity : ""}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const next = raw === "" ? Number.NaN : Number(raw);
                              onChangeQuantity!(item, idx, next);
                            }}
                            className={cn(
                              "w-24 rounded border bg-zinc-950 px-2 py-1 text-right text-xs text-zinc-100 focus:outline-none",
                              errMsg
                                ? "border-red-500/60 focus:border-red-400"
                                : "border-zinc-700 focus:border-zinc-500"
                            )}
                            aria-invalid={!!errMsg}
                            aria-describedby={errMsg ? `qty-err-${idx}` : undefined}
                          />
                          {original && original.quantity !== edited.quantity && !errMsg && (
                            <span className="text-[10px] text-zinc-500 mono">
                              was {original.quantity}
                            </span>
                          )}
                          {errMsg && (
                            <span id={`qty-err-${idx}`} className="text-[10px] text-red-400">
                              {errMsg}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 pr-3 text-zinc-400">{edited.unit}</td>
                      <td className="py-1.5 pr-3 text-right text-zinc-400 mono">
                        {formatEUR(edited.unit_price)}
                      </td>
                      <td className="py-1.5 text-right text-zinc-200 mono">
                        {formatEUR(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-zinc-800 pt-3">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Original total
              </p>
              <p
                className={cn(
                  "text-sm mono",
                  validation.anyChanged
                    ? "text-zinc-500 line-through"
                    : "text-zinc-200"
                )}
              >
                {formatEUR(validation.oldTotal)}
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                Modified total
              </p>
              <p className="text-lg font-bold mono text-zinc-100">
                {formatEUR(validation.newTotal)}
              </p>
              {validation.anyChanged && (
                <p
                  className={cn(
                    "text-xs mono",
                    validation.delta < 0 ? "text-emerald-400" : "text-amber-400"
                  )}
                >
                  {validation.delta < 0 ? "−" : "+"}
                  {formatEUR(Math.abs(validation.delta))}
                </p>
              )}
            </div>
          </div>
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

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {isEditing ? (
          <>
            <Button
              size="sm"
              variant="success"
              onClick={handleSaveAndApprove}
              disabled={inFlight || !validation?.canSave}
              aria-busy={inFlight}
            >
              {inFlight ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save & Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelEdit}
              disabled={inFlight}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Cancel
            </Button>
          </>
        ) : (
          <>
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
              Approve
            </Button>
            {canEdit && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleStartEdit}
                disabled={inFlight}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Quantities
              </Button>
            )}
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
          </>
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
            <Button size="sm" variant="danger" onClick={handleRejectConfirm} disabled={inFlight}>
              Confirm Reject
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
