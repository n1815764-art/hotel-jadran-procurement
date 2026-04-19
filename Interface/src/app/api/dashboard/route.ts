import { NextResponse } from "next/server";
import type { Alert, PurchaseOrder, InventoryItem, Invoice } from "@/types";

const PAT = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID || "appjHlTQID87ODAJL";
const AT = `https://api.airtable.com/v0/${BASE}`;

interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

async function atFetch(table: string, params?: Record<string, string>): Promise<AirtableRecord[]> {
  if (!PAT) throw new Error("AIRTABLE_PAT not set");

  const url = new URL(`${AT}/${encodeURIComponent(table)}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${PAT}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} ${res.status}: ${body}`);
    }
    const json = await res.json();
    records.push(...json.records);
    offset = json.offset;
  } while (offset);

  return records;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}

export async function GET() {
  if (!PAT) {
    return NextResponse.json({ error: "AIRTABLE_PAT not configured" }, { status: 500 });
  }

  try {
    // Fetch all tables in parallel
    const [auditRecords, poRecords, invoiceRecords, inventoryRecords] = await Promise.all([
      atFetch("Audit_Trail"),
      atFetch("PO_Log", {
        "sort[0][field]": "po_date",
        "sort[0][direction]": "desc",
      }),
      atFetch("Invoice Log"),
      atFetch("Sample Inventory with Par Levels"),
    ]);
    // Sort both by createdTime descending in code — Airtable's timestamp field is unpopulated
    // and createdTime is not a valid sort param in the API
    auditRecords.sort((a, b) => b.createdTime.localeCompare(a.createdTime));
    invoiceRecords.sort((a, b) => b.createdTime.localeCompare(a.createdTime));

    // ── Build alerts from audit trail ──────────────────────────
    // Statuses that require no action — suppress from alerts panel
    const SILENT_PREFIXES = ["PERFECT_MATCH", "AUTO_APPROVED", "MINOR_DISCREPANCY"];
    const SILENT_EVENT_TYPES = ["REPORT_GENERATED", "DEMAND_FORECAST"];

    const alerts: Alert[] = auditRecords
      .flatMap((rec) => {
        const rawDetails = str(rec.fields.details);
        const details = rawDetails.toLowerCase();
        const eventType = str(rec.fields.event_type);

        // Drop records with no title
        if (!eventType) return [];

        // Drop silent event types (reports, forecasts)
        if (SILENT_EVENT_TYPES.includes(eventType)) return [];

        // Drop invoice-matched records that resolved cleanly (event_type may use spaces or underscores)
        const isInvoiceMatch = eventType.toLowerCase().replace(/_/g, " ") === "invoice matched";
        if (
          isInvoiceMatch &&
          SILENT_PREFIXES.some((p) => rawDetails.startsWith(p))
        ) return [];

        // Drop broken n8n template-literal messages (unfilled {{$json.*}} vars)
        if (rawDetails.includes("{{ $json.")) return [];

        let severity: Alert["severity"] = "info";
        if (
          details.includes("negativan") ||
          details.includes("negative") ||
          details.includes("blocked") ||
          details.includes("blokiran")
        ) {
          severity = "critical";
        } else if (
          details.startsWith("dispute_required") ||
          details.includes("dispute") ||
          details.includes("sporn") ||
          details.includes("odstupanje") ||
          details.includes("discrepancy") ||
          details.includes("ghost") ||
          details.includes("mismatch")
        ) {
          severity = "warning";
        } else if (
          details.includes("pending") ||
          details.includes("approval") ||
          details.includes("odobrenje")
        ) {
          severity = "approval";
        }

        // Map event_type to the n8n workflow that generates it
        const workflowMap: Record<string, string> = {
          "Invoice_Matched":   "WF-02 OCR / Match",
          "Invoice Matched":   "WF-02 OCR / Match",
          "Approved":          "WF-04 AI Validation",
          "ANOMALY_DETECTED":  "WF-13 Anomaly Detection",
          "ANOMALY DETECTED":  "WF-13 Anomaly Detection",
          "AR_REMINDER_30_SENT": "WF-AR Reminders",
          "AR_REMINDER_60_SENT": "WF-AR Reminders",
          "AR_REMINDER_90_SENT": "WF-AR Reminders",
        };
        const workflow_id = workflowMap[eventType] ?? eventType.replace(/_/g, " ");

        return [{
          id: rec.id,
          severity,
          title: eventType.replace(/_/g, " "),
          message: rawDetails,
          timestamp: rec.createdTime,
          workflow_id,
          reference_id: str(rec.fields.reference_id) || undefined,
        } satisfies Alert];
      })
      .slice(0, 100);

    // ── Build PO summaries ─────────────────────────────────────
    const today = new Date().toISOString().split("T")[0]; // "2026-04-13"
    const thisMonth = today.slice(0, 7); // "2026-04"
    const monthlyBudget = 45000 + 15000 + 5000; // from original dashboard

    const allPOs: PurchaseOrder[] = poRecords.map((rec) => ({
      _recordId: rec.id,
      po_number: str(rec.fields.po_number),
      date_created: str(rec.fields.po_date) || new Date().toISOString(),
      vendor_id: str(rec.fields.vendor_name),
      vendor_name: str(rec.fields.vendor_name),
      department: str(rec.fields.department),
      total_amount: num(rec.fields.total_amount),
      status: (str(rec.fields.status) || "Pending Approval") as PurchaseOrder["status"],
      approved_by: str(rec.fields.approved_by) || null,
      approval_date: str(rec.fields.approved_by) ? new Date().toISOString() : null,
      gl_account: str(rec.fields.gl_account),
      items: [],
      source: (str(rec.fields.source) || "Manual") as PurchaseOrder["source"],
      requester: str(rec.fields.requester),
      ai_note: str(rec.fields.notes),
    }));

    const pendingPOs = allPOs.filter((po) => po.status === "Pending Approval");
    const todayPOs = allPOs.filter((po) => po.date_created.startsWith(today));
    const todayPOsTotal = todayPOs.reduce((s, po) => s + po.total_amount, 0);
    const mtdSpend = allPOs
      .filter((po) => po.status !== "Cancelled" && po.date_created.startsWith(thisMonth))
      .reduce((s, po) => s + po.total_amount, 0);

    // ── Invoice match rate ─────────────────────────────────────
    const invoices: Invoice[] = invoiceRecords.map((rec) => {
      const statusMap: Record<string, string> = {
        PERFECT_MATCH: "Perfect Match",
        MINOR_DISCREPANCY: "Minor",
        MAJOR_DISCREPANCY: "Major",
        DISPUTE_REQUIRED: "Disputed",
      };
      const raw = str(rec.fields.match_status);
      return {
        _recordId: rec.id,
        invoice_id: rec.id,
        vendor_invoice_number: str(rec.fields.invoice_number),
        vendor_id: str(rec.fields.seller_name),
        vendor_name: str(rec.fields.seller_name),
        po_number: str(rec.fields.po_number) || null,
        invoice_date: str(rec.fields.invoice_date),
        received_date: str(rec.fields.invoice_date),
        total_amount: num(rec.fields.invoice_amount),
        match_status: (statusMap[raw] || raw || "Pending Review") as Invoice["match_status"],
        match_details: str(rec.fields.match_details_json),
        gl_account: str(rec.fields.gl_account),
        duplicate_flag: false,
        ocr_confidence: 95,
      };
    });

    const perfectMatches = invoices.filter((i) => i.match_status === "Perfect Match").length;
    const matchRate = invoices.length > 0 ? (perfectMatches / invoices.length) * 100 : 0;

    // ── Inventory issues ───────────────────────────────────────
    const inventoryItems: InventoryItem[] = inventoryRecords.map((rec) => {
      const currentStock = num(rec.fields["Current Stock"]);
      return {
        item_id: rec.id.slice(0, 10),
        item_name: str(rec.fields.Name),
        category: str(rec.fields.Category),
        department: "Kitchen",
        warehouse: "Kuhinja",
        unit_of_measure: str(rec.fields.Unit),
        par_level: num(rec.fields["Par Level"]),
        reorder_point: num(rec.fields["Reorder Point"]),
        reorder_quantity: num(rec.fields["Par Level"]),
        current_stock: currentStock,
        preferred_vendor_id: "",
        preferred_vendor_name: "",
        unit_cost: num(rec.fields["Unit Cost"]),
        ai_flag: currentStock < 0 ? `NEGATIVAN STOK: ${str(rec.fields.Name)} = ${currentStock}` : null,
        negative_stock: currentStock < 0,
        ghost_surplus: false,
      };
    });

    const dataIssues = inventoryItems.filter((i) => i.negative_stock || i.ghost_surplus).length;

    return NextResponse.json({
      alerts,
      pendingPOs,
      allPOs,
      invoices,
      inventory: inventoryItems,
      kpi: {
        pendingPOsCount: pendingPOs.length,
        todayPOsCount: todayPOs.length,
        todayPOsTotal,
        matchRate,
        mtdSpend,
        monthlyBudget,
        budgetPct: (mtdSpend / monthlyBudget) * 100,
        dataIssues,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
