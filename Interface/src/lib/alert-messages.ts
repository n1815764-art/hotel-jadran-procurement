import type { Alert, AuditEntry, AuditEventType } from "@/types";
import { formatEUR } from "./utils";

// TODO(follow-up): enrich AuditEntry to carry vendor_name, invoice_count,
// rejection_reason, etc. so fallback messages can render full context.
// For now the only structured fields we rely on are reference_id, actor,
// amount, and the free-text `details` string written by n8n workflows
// (WF06/WF07/WF16/…). Those workflows write BCS (Bosnian/Croatian/Serbian);
// keep all user-visible strings here in BCS to match.

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

// Short Serbian/BCS titles shown in the alert card header.
export const EVENT_TITLE: Record<AuditEventType, string> = {
  PO_CREATED: "Nova narud\u017Ebenica",
  PO_APPROVED: "PO odobren",
  PO_REJECTED: "PO odbijen",
  PAYMENT_BATCH_APPROVED: "Paket pla\u0107anja odobren",
  PAYMENT_BATCH_REJECTED: "Paket pla\u0107anja odbijen",
  INVOICE_MATCHED: "Faktura uskla\u0111ena",
  INVOICE_DISPUTED: "Sporna faktura",
  REORDER_TRIGGERED: "Auto-narud\u017Eba pokrenuta",
  REORDER_BLOCKED: "Auto-narud\u017Eba blokirana",
  ANOMALY_DETECTED: "Otkrivena anomalija",
  REPORT_GENERATED: "Izvje\u0161taj generiran",
  RECEIVING_CONFIRMED: "Prijem potvr\u0111en",
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
 * Build a human-readable `message` for any AuditEntry.
 *
 * Strategy: n8n workflows (WF06/WF07/WF16/…) already write detailed BCS
 * strings into AuditEntry.details — that is the canonical user-facing
 * description. Pass it through verbatim when populated. Only construct a
 * fallback message (also in BCS) when details is empty, so the UI never
 * shows a blank body. Conditional segments guarantee no "undefined" text.
 *
 * The exhaustive switch exists so adding a new AuditEventType fails the
 * build until a fallback template is registered.
 */
export function buildAlertMessage(entry: AuditEntry): string {
  const details = entry.details?.trim();
  if (details) return details;

  return fallbackMessage(entry);
}

function fallbackMessage(entry: AuditEntry): string {
  const eventType = entry.event_type;
  const refId = ref(entry);
  const amt = amountSuffix(entry.amount);
  const actor = entry.actor || null;

  switch (eventType) {
    case "PO_CREATED": {
      const head = refId ? `Narud\u017Ebenica ${refId} kreirana` : "Narud\u017Ebenica kreirana";
      return join([head, amt ? `iznos ${amt}` : null], " \u2014 ") || humanize(eventType);
    }
    case "PO_APPROVED": {
      const head = refId ? `PO ${refId} odobren` : "PO odobren";
      const by = actor ? `od strane ${actor}` : null;
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, by, suffix], " ") || humanize(eventType);
    }
    case "PO_REJECTED": {
      const head = refId ? `PO ${refId} odbijen` : "PO odbijen";
      const by = actor ? `od strane ${actor}` : null;
      return join([head, by], " ") || humanize(eventType);
    }
    case "PAYMENT_BATCH_APPROVED": {
      const head = refId ? `Paket pla\u0107anja ${refId} odobren` : "Paket pla\u0107anja odobren";
      const by = actor ? `od strane ${actor}` : null;
      const suffix = amt ? `\u2014 ukupno ${amt}` : null;
      return join([head, by, suffix], " ") || humanize(eventType);
    }
    case "PAYMENT_BATCH_REJECTED": {
      const head = refId ? `Paket pla\u0107anja ${refId} odbijen` : "Paket pla\u0107anja odbijen";
      const by = actor ? `od strane ${actor}` : null;
      return join([head, by], " ") || humanize(eventType);
    }
    case "INVOICE_MATCHED": {
      const head = refId ? `Faktura ${refId} uskla\u0111ena sa PO` : "Faktura uskla\u0111ena sa PO";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ") || humanize(eventType);
    }
    case "INVOICE_DISPUTED": {
      const head = refId ? `Sporna faktura ${refId}` : "Sporna faktura";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ") || humanize(eventType);
    }
    case "REORDER_TRIGGERED": {
      const head = refId ? `Auto-narud\u017Eba pokrenuta za ${refId}` : "Auto-narud\u017Eba pokrenuta";
      const suffix = amt ? `\u2014 ${amt}` : null;
      return join([head, suffix], " ") || humanize(eventType);
    }
    case "REORDER_BLOCKED": {
      return refId ? `Auto-narud\u017Eba blokirana za ${refId}` : "Auto-narud\u017Eba blokirana";
    }
    case "ANOMALY_DETECTED": {
      return refId ? `Otkrivena anomalija na ${refId}` : humanize(eventType);
    }
    case "REPORT_GENERATED": {
      return refId ? `Izvje\u0161taj ${refId} generiran` : "Izvje\u0161taj generiran";
    }
    case "RECEIVING_CONFIRMED": {
      const head = refId ? `Prijem potvr\u0111en za PO ${refId}` : "Prijem potvr\u0111en";
      const by = actor ? `od strane ${actor}` : null;
      return join([head, by], " ") || humanize(eventType);
    }
    default: {
      const exhaustive: never = eventType;
      return exhaustiveFallback(exhaustive);
    }
  }
}

function exhaustiveFallback(eventType: never): string {
  const raw = eventType as unknown as string;
  return `${raw.replace(/_/g, " ").toLowerCase()}`;
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
