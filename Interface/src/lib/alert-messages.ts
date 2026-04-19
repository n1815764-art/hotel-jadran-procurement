import type { Alert, AuditEntry, AuditEventType } from "@/types";
import { formatEUR } from "./utils";

// TODO(follow-up): enrich AuditEntry to carry vendor_name, invoice_count,
// rejection_reason, etc. so templates can render full context. Today the
// only structured fields we can rely on are reference_id, actor, amount,
// and the free-text `details` string.

export const EVENT_SEVERITY: Record<AuditEventType, Alert["severity"]> = {
  PO_CREATED: "info",
  PO_APPROVED: "approval",
  PO_REJECTED: "warning",
  PAYMENT_BATCH_APPROVED: "approval",
  PAYMENT_BATCH_REJECTED: "warning",
  INVOICE_MATCHED: "approval",
  INVOICE_DISPUTED: "critical",
  REORDER_TRIGGERED: "info",
  REORDER_BLOCKED: "warning",
  ANOMALY_DETECTED: "warning",
  REPORT_GENERATED: "info",
  RECEIVING_CONFIRMED: "approval",
};

// Workflow registry — keep in sync with src/data/sample/system-status.ts.
// There is no single source of truth for event_type → workflow_id today;
// this table is the effective authority at the UI layer.
export const EVENT_TO_WORKFLOW: Record<AuditEventType, string> = {
  PO_CREATED: "WF-06",
  PO_APPROVED: "WF-06",
  PO_REJECTED: "WF-06",
  PAYMENT_BATCH_APPROVED: "WF-16",
  PAYMENT_BATCH_REJECTED: "WF-16",
  INVOICE_MATCHED: "WF-07",
  INVOICE_DISPUTED: "WF-07",
  REORDER_TRIGGERED: "WF-08",
  REORDER_BLOCKED: "WF-08",
  ANOMALY_DETECTED: "WF-12",
  REPORT_GENERATED: "WF-09",
  RECEIVING_CONFIRMED: "WF-05",
};

export const EVENT_TITLE: Record<AuditEventType, string> = {
  PO_CREATED: "PO Created",
  PO_APPROVED: "PO Approved",
  PO_REJECTED: "PO Rejected",
  PAYMENT_BATCH_APPROVED: "Payment Batch Approved",
  PAYMENT_BATCH_REJECTED: "Payment Batch Rejected",
  INVOICE_MATCHED: "Invoice Matched",
  INVOICE_DISPUTED: "Invoice Disputed",
  REORDER_TRIGGERED: "Auto-Reorder Triggered",
  REORDER_BLOCKED: "Auto-Reorder Blocked",
  ANOMALY_DETECTED: "Anomaly Detected",
  REPORT_GENERATED: "Report Generated",
  RECEIVING_CONFIRMED: "Receiving Confirmed",
};

export function humanize(eventType: AuditEventType): string {
  return EVENT_TITLE[eventType] ?? eventType.replace(/_/g, " ").toLowerCase();
}

function join(parts: Array<string | null | undefined>, sep: string): string {
  return parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(sep);
}

function amountSuffix(amount: number | undefined): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount === 0) return null;
  return formatEUR(amount);
}

function ref(entry: AuditEntry): string | null {
  return entry.reference_id ? entry.reference_id : null;
}

/**
 * Build an English, human-readable `message` for any AuditEntry.
 *
 * Strategy: start from structured fields we know exist (reference_id, actor,
 * amount). Assemble the message as conditional segments so a missing field
 * never renders as "undefined" or a dangling separator. For rich descriptive
 * events (INVOICE_DISPUTED, ANOMALY_DETECTED) we keep `entry.details`
 * verbatim — n8n produces detailed strings there that already describe the
 * incident in full. For every other event we construct a clean template.
 */
export function buildAlertMessage(entry: AuditEntry): string {
  const eventType = entry.event_type;
  const refId = ref(entry);
  const amt = amountSuffix(entry.amount);
  const actor = entry.actor || null;
  const details = entry.details?.trim() || null;

  switch (eventType) {
    case "PO_CREATED": {
      const body = join(
        [refId ? `PO ${refId} created` : "Purchase order created", amt ? `total ${amt}` : null],
        " \u2014 "
      );
      return body || humanize(eventType);
    }
    case "PO_APPROVED": {
      const head = refId ? `PO ${refId} approved` : "Purchase order approved";
      const by = actor ? `by ${actor}` : null;
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, by, suffix], " ") || humanize(eventType);
    }
    case "PO_REJECTED": {
      const head = refId ? `PO ${refId} rejected` : "Purchase order rejected";
      const by = actor ? `by ${actor}` : null;
      const reason = details ? `Reason: ${details}` : "Reason: not provided";
      return join([join([head, by], " "), reason], ". ");
    }
    case "PAYMENT_BATCH_APPROVED": {
      const head = refId ? `Payment batch ${refId} approved` : "Payment batch approved";
      const by = actor ? `by ${actor}` : null;
      const suffix = amt ? `\u2014 total ${amt}` : null;
      return join([head, by, suffix], " ") || humanize(eventType);
    }
    case "PAYMENT_BATCH_REJECTED": {
      const head = refId ? `Payment batch ${refId} rejected` : "Payment batch rejected";
      const by = actor ? `by ${actor}` : null;
      const reason = details ? `Reason: ${details}` : "Reason: not provided";
      return join([join([head, by], " "), reason], ". ");
    }
    case "INVOICE_MATCHED": {
      const head = refId ? `Invoice ${refId} matched to PO` : "Invoice matched to PO";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ") || humanize(eventType);
    }
    case "INVOICE_DISPUTED": {
      if (details) return details;
      const head = refId ? `Invoice ${refId} disputed` : "Invoice disputed";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ");
    }
    case "REORDER_TRIGGERED": {
      const head = refId ? `Auto-reorder triggered for ${refId}` : "Auto-reorder triggered";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ") || humanize(eventType);
    }
    case "REORDER_BLOCKED": {
      const head = refId ? `Auto-reorder blocked for ${refId}` : "Auto-reorder blocked";
      const reason = details ? `Reason: ${details}` : "Reason: not provided";
      return join([head, reason], ". ");
    }
    case "ANOMALY_DETECTED": {
      if (details) return details;
      return refId ? `Anomaly detected on ${refId}` : humanize(eventType);
    }
    case "REPORT_GENERATED": {
      const head = refId ? `Report ${refId} generated` : "Report generated";
      return details ? `${head}. ${details}` : head;
    }
    case "RECEIVING_CONFIRMED": {
      const head = refId ? `Receiving confirmed for PO ${refId}` : "Receiving confirmed";
      const by = actor ? `by ${actor}` : null;
      return join([head, by], " ") || humanize(eventType);
    }
    default: {
      const exhaustive: never = eventType;
      return fallbackMessage(exhaustive);
    }
  }
}

function fallbackMessage(eventType: never): string {
  const raw = eventType as unknown as string;
  return `${raw.replace(/_/g, " ").toLowerCase()} event`;
}

export function severityForEvent(eventType: AuditEventType): Alert["severity"] {
  return EVENT_SEVERITY[eventType];
}

export function workflowForEvent(eventType: AuditEventType): string {
  return EVENT_TO_WORKFLOW[eventType];
}

export function titleForEvent(eventType: AuditEventType): string {
  return EVENT_TITLE[eventType];
}
