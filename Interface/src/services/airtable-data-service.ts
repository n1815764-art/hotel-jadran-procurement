import type {
  Vendor,
  VendorScorecard,
  PurchaseOrder,
  POLineItem,
  Invoice,
  InventoryItem,
  ReceivingRecord,
  Contract,
  AuditEntry,
  OccupancyForecast,
  Alert,
  DailyFlashReport,
  DemandForecastItem,
  WorkflowStatus,
  IntegrationStatus,
  GLMapping,
  PaymentBatch,
} from "@/types";
import type { DataService, AuditFilters, RequisitionInput } from "./data-service";
import { sampleWorkflows } from "@/data/sample/system-status";
import {
  buildAlertMessage,
  severityForEvent,
  titleForEvent,
  workflowForEvent,
} from "@/lib/alert-messages";

// Airtable table names
const TABLES = {
  PO_LOG: "PO_Log",
  INVOICE_LOG: "Invoice Log",
  INVENTORY: "Sample Inventory with Par Levels",
  VENDORS: "Sample Vendors",
  VENDOR_CONTRACTS: "Vendor_Contracts",
  OCCUPANCY: "Sample Occupancy Data",
  GL_MAPPING: "Sample GL Account Mapping",
  AUDIT_TRAIL: "Audit_Trail",
  RECEIVING_LOG: "Receiving_Log",
  REQUISITION_LOG: "Requisition_Log",
  CONTRACT_LINE_ITEMS: "Contract_Line_Items",
  PAYMENT_BATCH: "tblKFEvMbOobm9Y9X",
} as const;

const N8N_BASE = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE || "http://localhost:5678";

// ── Airtable fetch helpers ──────────────────────────────────

interface AirtableRawRecord {
  id: string;
  fields: Record<string, unknown>;
}

async function fetchTable(table: string, params?: Record<string, string>): Promise<AirtableRawRecord[]> {
  const url = new URL(`/api/airtable/${encodeURIComponent(table)}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Airtable fetch failed: ${res.status}`);
  const data = await res.json();
  return data.records || [];
}

async function patchRecord(table: string, recordId: string, fields: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/airtable/${encodeURIComponent(table)}/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable patch failed: ${res.status}`);
}

async function createRecord(table: string, fields: Record<string, unknown>): Promise<AirtableRawRecord> {
  const res = await fetch(`/api/airtable/${encodeURIComponent(table)}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`Airtable create failed: ${res.status}`);
  const data = await res.json();
  return data.records?.[0] || data;
}

// ── Field mappers ───────────────────────────────────────────

function safeParseJSON<T>(val: unknown, fallback: T): T {
  if (typeof val !== "string") return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

function str(val: unknown): string {
  return typeof val === "string" ? val : "";
}

function num(val: unknown): number {
  return typeof val === "number" ? val : 0;
}

function mapPO(rec: AirtableRawRecord): PurchaseOrder {
  const f = rec.fields;
  const items = safeParseJSON<POLineItem[]>(f.items_json, []);
  return {
    _recordId: rec.id,
    po_number: str(f.po_number),
    date_created: str(f.po_date) || new Date().toISOString(),
    vendor_id: str(f.vendor_name), // No vendor_id in Airtable — use name
    vendor_name: str(f.vendor_name),
    department: str(f.department),
    total_amount: num(f.total_amount),
    status: (str(f.status) || "Pending Approval") as PurchaseOrder["status"],
    approved_by: str(f.approved_by) || null,
    approval_date: str(f.approved_by) ? new Date().toISOString() : null,
    gl_account: str(f.gl_account),
    items,
    source: (str(f.source) || "Manual") as PurchaseOrder["source"],
    requester: str(f.requester),
    ai_note: str(f.notes),
  };
}

function mapPaymentBatch(rec: AirtableRawRecord): PaymentBatch {
  const f = rec.fields;
  return {
    _recordId: rec.id,
    batch_id: str(f.batch_id) || rec.id,
    vendor_id: str(f.vendor_id) || str(f.vendor_name),
    vendor_name: str(f.vendor_name),
    invoice_count: num(f.invoice_count),
    total_amount: num(f.total_amount),
    status: (str(f.status) || "Pending Approval") as PaymentBatch["status"],
    created_date: str(f.created_date) || new Date().toISOString(),
    due_date: str(f.due_date),
    approved_by: str(f.approved_by) || null,
    approval_date: str(f.approval_date) || null,
    ai_note: str(f.ai_note) || str(f.notes),
  };
}

function mapInvoice(rec: AirtableRawRecord): Invoice {
  const f = rec.fields;
  // Map Airtable match_status values to our display values
  const statusMap: Record<string, string> = {
    PERFECT_MATCH: "Perfect Match",
    MINOR_DISCREPANCY: "Minor",
    MAJOR_DISCREPANCY: "Major",
    DISPUTE_REQUIRED: "Disputed",
    "Pending Review": "Pending Review",
  };
  const rawStatus = str(f.match_status);
  const matchStatus = (statusMap[rawStatus] || rawStatus || "Pending Review") as Invoice["match_status"];

  return {
    _recordId: rec.id,
    invoice_id: rec.id,
    vendor_invoice_number: str(f.invoice_number),
    vendor_id: str(f.seller_name),
    vendor_name: str(f.seller_name),
    po_number: str(f.po_number) || null,
    invoice_date: str(f.invoice_date),
    received_date: str(f.invoice_date),
    total_amount: num(f.invoice_amount),
    match_status: matchStatus,
    match_details: str(f.match_details_json),
    gl_account: str(f.gl_account),
    duplicate_flag: false,
    ocr_confidence: 95,
  };
}

function mapInventory(rec: AirtableRawRecord): InventoryItem {
  const f = rec.fields;
  const currentStock = num(f["Current Stock"]);
  const parLevel = num(f["Par Level"]);
  const reorderPoint = num(f["Reorder Point"]);
  const isNegative = currentStock < 0;

  return {
    item_id: rec.id.slice(0, 10),
    item_name: str(f.Name),
    category: str(f.Category),
    department: "Kitchen",
    warehouse: "Kuhinja",
    unit_of_measure: str(f.Unit),
    par_level: parLevel,
    reorder_point: reorderPoint,
    reorder_quantity: parLevel,
    current_stock: currentStock,
    preferred_vendor_id: "",
    preferred_vendor_name: Array.isArray(f["Preferred Vendor"]) ? "Linked" : "",
    unit_cost: num(f["Unit Cost"]),
    ai_flag: isNegative
      ? `NEGATIVAN STOK: ${str(f.Name)} pokazuje ${currentStock} — fizicki nemoguce. Potrebna provjera.`
      : str(f.Notes) || null,
    negative_stock: isNegative,
    ghost_surplus: false,
  };
}

function mapVendor(rec: AirtableRawRecord): Vendor {
  const f = rec.fields;
  return {
    vendor_id: rec.id,
    vendor_name: str(f.Name),
    contact_name: str(f.Name),
    contact_email: str(f["Contact Email"]),
    contact_phone: "",
    category: str(f.Category) ? [str(f.Category)] : [],
    payment_terms: str(f["Payment Terms"]),
    tax_id: "",
    approved_status: "Active",
    performance_score: 7.5,
    onboarding_date: "",
  };
}

function mapContract(rec: AirtableRawRecord): Contract {
  const f = rec.fields;
  const endDate = str(f.end_date);
  const daysUntil = endDate
    ? Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 999;
  const status: Contract["status"] = daysUntil <= 0 ? "Expired" : daysUntil <= 90 ? "Expiring" : "Active";

  return {
    contract_id: str(f.contract_id),
    vendor_id: str(f.vendor_name),
    vendor_name: str(f.vendor_name),
    start_date: str(f.start_date),
    end_date: endDate,
    auto_renew: !!f.auto_renew,
    status,
    days_until_expiry: Math.max(0, daysUntil),
    total_value: num(f.total_value),
    key_terms: str(f.key_terms),
  };
}

function mapAudit(rec: AirtableRawRecord): AuditEntry {
  const f = rec.fields;
  return {
    _recordId: rec.id,
    event_id: rec.id,
    timestamp: str(f.timestamp) || new Date().toISOString(),
    event_type: (str(f.event_type) || "UNKNOWN") as AuditEntry["event_type"],
    actor: str(f.actor),
    reference_id: str(f.reference_id),
    details: str(f.details),
    amount: num(f.amount) || undefined,
  };
}

function mapOccupancy(rec: AirtableRawRecord): OccupancyForecast {
  const f = rec.fields;
  const occPct = num(f["Occupancy %"]);
  return {
    date: str(f.Date),
    occupancy_pct: occPct > 1 ? occPct : Math.round(occPct * 100), // Handle both 0.78 and 78 formats
    rooms_sold: num(f["Rooms Sold"]),
    total_rooms: 200,
    arrivals: num(f.Arrivals),
    departures: num(f.Departures),
    events: str(f.Events) ? str(f.Events).split("\n").filter(Boolean) : [],
  };
}

function mapGL(rec: AirtableRawRecord): GLMapping {
  const f = rec.fields;
  return {
    gl_account_code: str(f["GL Code"]),
    gl_account_name: str(f["GL Name"]),
    department: str(f.Department),
    budget_monthly: num(f["Monthly Budget"]),
  };
}

function auditToAlert(entry: AuditEntry): Alert | null {
  const eventType = entry.event_type;
  return {
    id: entry.event_id,
    severity: severityForEvent(eventType),
    title: titleForEvent(eventType),
    message: buildAlertMessage(entry),
    timestamp: entry.timestamp,
    workflow_id: workflowForEvent(eventType),
    reference_id: entry.reference_id,
  };
}

// ── AirtableDataService ─────────────────────────────────────

export class AirtableDataService implements DataService {
  async getVendors(): Promise<Vendor[]> {
    try {
      const records = await fetchTable(TABLES.VENDORS);
      return records.map(mapVendor);
    } catch {
      return [];
    }
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    const vendors = await this.getVendors();
    return vendors.find((v) => v.vendor_id === id || v.vendor_name === id);
  }

  async getVendorScorecards(_vendorId?: string): Promise<VendorScorecard[]> {
    // No scorecard table in Airtable yet — return empty
    return [];
  }

  async getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
    const params: Record<string, string> = { "sort[0][field]": "po_date", "sort[0][direction]": "desc" };
    if (status && status !== "All") {
      params["filterByFormula"] = `{status} = "${status}"`;
    }
    const records = await fetchTable(TABLES.PO_LOG, params);
    return records.map(mapPO);
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    const records = await fetchTable(TABLES.PO_LOG, {
      filterByFormula: `{po_number} = "${poNumber}"`,
      maxRecords: "1",
    });
    return records.length > 0 ? mapPO(records[0]) : undefined;
  }

  async getPaymentBatches(filters?: { status?: string }): Promise<PaymentBatch[]> {
    const params: Record<string, string> = {};
    if (filters?.status && filters.status !== "All") {
      params["filterByFormula"] = `{status} = "${filters.status}"`;
    }
    try {
      const records = await fetchTable(TABLES.PAYMENT_BATCH, params);
      return records.map(mapPaymentBatch);
    } catch {
      return [];
    }
  }

  async updatePurchaseOrderStatus(poNumber: string, status: string, approvedBy?: string): Promise<void> {
    const po = await this.getPurchaseOrderByNumber(poNumber);
    if (!po?._recordId) throw new Error(`PO ${poNumber} not found`);

    const fields: Record<string, unknown> = { status };
    if (approvedBy) fields.approved_by = approvedBy;

    await patchRecord(TABLES.PO_LOG, po._recordId, fields);
  }

  async approvePO(poNumber: string, approvedBy: string): Promise<void> {
    // 1. Update Airtable status
    await this.updatePurchaseOrderStatus(poNumber, "Approved", approvedBy);

    // 2. Get PO data for webhook
    const po = await this.getPurchaseOrderByNumber(poNumber);
    if (!po) return;

    // 3. Call n8n WF06 to send vendor email
    try {
      await fetch(`${N8N_BASE}/webhook/po-creation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_name: po.vendor_name,
          vendor_email: "",
          department: po.department,
          total_amount: po.total_amount,
          items_json: JSON.stringify(po.items),
          gl_code: po.gl_account,
          source: po.source,
          requester: po.requester,
        }),
      });
    } catch {
      // n8n might not be running — approval still recorded in Airtable
    }
  }

  async rejectPO(poNumber: string, reason?: string): Promise<void> {
    const po = await this.getPurchaseOrderByNumber(poNumber);
    if (!po?._recordId) throw new Error(`PO ${poNumber} not found`);

    const fields: Record<string, unknown> = { status: "Cancelled" };
    if (reason) fields.notes = `${po.ai_note}\n\nRejection reason: ${reason}`;

    await patchRecord(TABLES.PO_LOG, po._recordId, fields);
  }

  async getInvoices(status?: string): Promise<Invoice[]> {
    const params: Record<string, string> = {};
    if (status && status !== "All") {
      const reverseStatusMap: Record<string, string> = {
        "Perfect Match": "PERFECT_MATCH",
        Minor: "MINOR_DISCREPANCY",
        Major: "MAJOR_DISCREPANCY",
        Disputed: "DISPUTE_REQUIRED",
        "Pending Review": "Pending Review",
      };
      const atStatus = reverseStatusMap[status] || status;
      params["filterByFormula"] = `{match_status} = "${atStatus}"`;
    }
    try {
      const records = await fetchTable(TABLES.INVOICE_LOG, params);
      return records.map(mapInvoice);
    } catch {
      return [];
    }
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const invoices = await this.getInvoices();
    return invoices.find((inv) => inv.invoice_id === id || inv.vendor_invoice_number === id);
  }

  async getInventory(): Promise<InventoryItem[]> {
    try {
      const records = await fetchTable(TABLES.INVENTORY);
      return records.map(mapInventory);
    } catch {
      return [];
    }
  }

  async getInventoryAlerts(): Promise<InventoryItem[]> {
    const items = await this.getInventory();
    return items.filter((item) => item.negative_stock || item.ghost_surplus || item.current_stock <= item.reorder_point);
  }

  async getReceivingLog(): Promise<ReceivingRecord[]> {
    const records = await fetchTable(TABLES.RECEIVING_LOG, {
      "sort[0][field]": "date_received",
      "sort[0][direction]": "desc",
    });
    return records.map((rec) => {
      const f = rec.fields;
      return {
        receiving_id: str(f.receiving_id),
        po_number: str(f.po_number),
        vendor_id: str(f.vendor_name),
        vendor_name: str(f.vendor_name),
        date_received: str(f.date_received),
        received_by: str(f.received_by),
        items: safeParseJSON(f.items_received_json, []),
        has_discrepancy: str(f.status) === "Discrepancy",
        discrepancy_notes: str(f.notes),
        photos: [],
      };
    });
  }

  async submitReceiving(record: ReceivingRecord): Promise<void> {
    // 1. Create in Airtable
    await createRecord(TABLES.RECEIVING_LOG, {
      receiving_id: record.receiving_id,
      po_number: record.po_number,
      vendor_name: record.vendor_name,
      date_received: record.date_received,
      received_by: record.received_by,
      items_received_json: JSON.stringify(record.items),
      status: record.has_discrepancy ? "Discrepancy" : "Complete",
      notes: record.discrepancy_notes || "",
    });

    // 2. Call n8n WF05 webhook
    try {
      await fetch(`${N8N_BASE}/webhook/receiving`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          po_number: record.po_number,
          vendor_name: record.vendor_name,
          received_by: record.received_by,
          delivery_date: record.date_received,
          delivery_items: record.items.map((item) => ({
            item_name: item.item_name,
            quantity_ordered: item.expected_qty,
            quantity_received: item.received_qty,
            unit: item.unit,
            notes: item.quality_notes || "",
          })),
        }),
      });
    } catch {
      // n8n may be offline
    }

    // 3. Log to audit trail
    await createRecord(TABLES.AUDIT_TRAIL, {
      reference_id: record.po_number,
      timestamp: new Date().toISOString(),
      event_type: "RECEIVING_CONFIRMED",
      actor: record.received_by,
      details: `Prijem potvrden za ${record.vendor_name}. ${record.has_discrepancy ? "Utvrdjene nepodudarnosti." : "Sve stavke u redu."}`,
    });
  }

  async getContracts(): Promise<Contract[]> {
    try {
      const records = await fetchTable(TABLES.VENDOR_CONTRACTS);
      return records.map(mapContract);
    } catch {
      return [];
    }
  }

  async getAuditTrail(filters?: AuditFilters): Promise<AuditEntry[]> {
    const params: Record<string, string> = {
      "sort[0][field]": "timestamp",
      "sort[0][direction]": "desc",
    };

    const formulas: string[] = [];
    if (filters?.event_type && filters.event_type !== "All") {
      formulas.push(`{event_type} = "${filters.event_type}"`);
    }
    if (filters?.actor && filters.actor !== "All") {
      formulas.push(`{actor} = "${filters.actor}"`);
    }
    if (filters?.reference_id) {
      formulas.push(`FIND("${filters.reference_id}", {reference_id})`);
    }
    if (formulas.length > 0) {
      params["filterByFormula"] = formulas.length === 1 ? formulas[0] : `AND(${formulas.join(",")})`;
    }

    const records = await fetchTable(TABLES.AUDIT_TRAIL, params);
    return records.map(mapAudit);
  }

  async getOccupancyForecast(): Promise<OccupancyForecast[]> {
    try {
      const records = await fetchTable(TABLES.OCCUPANCY, {
        "sort[0][field]": "Date",
        "sort[0][direction]": "asc",
      });
      return records.map(mapOccupancy);
    } catch {
      return [];
    }
  }

  async getAlerts(): Promise<Alert[]> {
    // Derive alerts from recent audit trail entries
    const entries = await this.getAuditTrail();
    return entries
      .slice(0, 20)
      .map(auditToAlert)
      .filter((a): a is Alert => a !== null);
  }

  async getDailyReports(): Promise<DailyFlashReport[]> {
    // Check audit trail for FLASH reports
    const entries = await fetchTable(TABLES.AUDIT_TRAIL, {
      filterByFormula: `FIND("FLASH-", {reference_id})`,
      "sort[0][field]": "timestamp",
      "sort[0][direction]": "desc",
    });

    if (entries.length === 0) {
      return [{ date: new Date().toISOString().split("T")[0], content: "Nema generiranih izvjestaja." }];
    }

    return entries.map((rec) => ({
      date: str(rec.fields.timestamp).split("T")[0],
      content: str(rec.fields.details),
    }));
  }

  async getDemandForecast(): Promise<DemandForecastItem[]> {
    // Derive from inventory data
    const inventory = await this.getInventory();
    return inventory
      .filter((item) => item.current_stock <= item.reorder_point || item.negative_stock)
      .map((item) => ({
        item_name: item.item_name,
        category: item.category,
        current_stock: item.current_stock,
        forecasted_demand: item.par_level,
        days_until_stockout: item.current_stock <= 0 ? 0 : Math.floor(item.current_stock / (item.par_level / 7)),
        urgency: (item.current_stock <= 0 ? "red" : item.current_stock <= item.reorder_point ? "amber" : "green") as "red" | "amber" | "green",
        recommended_order_qty: Math.max(0, item.par_level - item.current_stock),
        unit: item.unit_of_measure,
      }));
  }

  async getWorkflowStatuses(): Promise<WorkflowStatus[]> {
    // Static — no Airtable table for this
    return sampleWorkflows;
  }

  async getIntegrationStatuses(): Promise<IntegrationStatus[]> {
    // Check live connectivity
    const statuses: IntegrationStatus[] = [];
    const now = new Date().toISOString();

    // Check Airtable
    try {
      await fetchTable(TABLES.VENDORS, { maxRecords: "1" });
      statuses.push({ name: "Airtable", status: "connected", last_check: now, details: "Connected to base appjHlTQID87ODAJL" });
    } catch {
      statuses.push({ name: "Airtable", status: "disconnected", last_check: now, details: "Cannot reach Airtable API" });
    }

    // Check n8n
    try {
      const res = await fetch(`${N8N_BASE}/healthz`, { signal: AbortSignal.timeout(3000) });
      statuses.push({
        name: "n8n",
        status: res.ok ? "connected" : "disconnected",
        last_check: now,
        details: res.ok ? `Running at ${N8N_BASE}` : "n8n not responding",
      });
    } catch {
      statuses.push({ name: "n8n", status: "disconnected", last_check: now, details: `Cannot reach ${N8N_BASE}` });
    }

    statuses.push({ name: "Nanonets (OCR)", status: "pending", last_check: now, details: "Connected via n8n workflow" });
    statuses.push({ name: "Kimi K2.5 (Moonshot)", status: "pending", last_check: now, details: "Connected via n8n workflow" });
    statuses.push({ name: "Slack", status: "pending", last_check: now, details: "Not yet configured" });

    return statuses;
  }

  async getGLMappings(): Promise<GLMapping[]> {
    try {
      const records = await fetchTable(TABLES.GL_MAPPING);
      return records.map(mapGL);
    } catch {
      return [];
    }
  }

  async submitRequisition(data: RequisitionInput): Promise<{ requisition_id: string }> {
    const reqId = `REQ-${Date.now()}`;

    // 1. Create in Airtable
    await createRecord(TABLES.REQUISITION_LOG, {
      requisition_id: reqId,
      department: data.department,
      item_name: data.item_name,
      quantity_requested: data.quantity_requested,
      unit: data.unit,
      urgency: data.urgency,
      requester: data.requester,
      justification: data.justification || "",
      status: "Submitted",
      submitted_at: new Date().toISOString(),
    });

    // 2. Call n8n WF03 webhook
    try {
      await fetch(`${N8N_BASE}/webhook/requisition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          department: data.department,
          item_name: data.item_name,
          quantity_requested: data.quantity_requested,
          unit: data.unit,
          urgency: data.urgency,
          requester: data.requester,
          justification: data.justification,
        }),
      });
    } catch {
      // n8n may be offline
    }

    return { requisition_id: reqId };
  }
}
