import type { PurchaseOrder, PaymentBatch } from "@/types";
import type { ApprovalItem } from "@/types/approval";
import type { DataService } from "./data-service";

export function poToApprovalItem(po: PurchaseOrder): ApprovalItem | null {
  if (!po._recordId) return null;
  return {
    type: "po",
    record_id: po._recordId,
    reference_id: po.po_number,
    vendor_name: po.vendor_name,
    total_amount: po.total_amount,
    department: po.department,
    created_date: po.date_created,
    ai_note: po.ai_note ?? "",
    raw: po,
  };
}

export function batchToApprovalItem(batch: PaymentBatch): ApprovalItem | null {
  if (!batch._recordId) return null;
  return {
    type: "batch",
    record_id: batch._recordId,
    reference_id: batch.batch_id,
    vendor_name: batch.vendor_name,
    total_amount: batch.total_amount,
    created_date: batch.created_date,
    ai_note: batch.ai_note ?? "",
    invoice_count: batch.invoice_count,
    due_date: batch.due_date_cutoff || batch.due_date,
    raw: batch,
  };
}

export async function fetchPendingApprovals(
  dataService: DataService
): Promise<ApprovalItem[]> {
  const [pendingPOs, pendingBatches] = await Promise.all([
    dataService.getPurchaseOrders("Pending Approval"),
    dataService.getPaymentBatches({ status: "Pending Approval" }),
  ]);

  const poItems = pendingPOs
    .map(poToApprovalItem)
    .filter((item): item is ApprovalItem => item !== null);

  const batchItems = pendingBatches
    .map(batchToApprovalItem)
    .filter((item): item is ApprovalItem => item !== null);

  return [...poItems, ...batchItems].sort(
    (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );
}
