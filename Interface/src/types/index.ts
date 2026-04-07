// ============================================================
// Hotel Jadran Procurement — TypeScript Type Definitions
// ============================================================

// Airtable record wrapper — all types may include _recordId when from Airtable
export interface AirtableRecord {
  _recordId?: string;
}

export interface Vendor extends AirtableRecord {
  vendor_id: string;
  vendor_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  category: string[];
  payment_terms: string;
  tax_id: string;
  approved_status: VendorStatus;
  performance_score: number;
  onboarding_date: string;
}

export type VendorStatus = "Active" | "Probation" | "Suspended" | "Inactive";

export interface VendorScorecard {
  vendor_id: string;
  month: string;
  delivery_score: number;
  accuracy_score: number;
  quality_score: number;
  pricing_score: number;
  responsiveness_score: number;
  overall_score: number;
  recommendation: "MAINTAIN" | "WATCH" | "REPLACE";
  ai_commentary: string;
}

export interface PurchaseOrder extends AirtableRecord {
  po_number: string;
  date_created: string;
  vendor_id: string;
  vendor_name: string;
  department: string;
  total_amount: number;
  status: POStatus;
  approved_by: string | null;
  approval_date: string | null;
  gl_account: string;
  items: POLineItem[];
  source: POSource;
  requester: string;
  ai_note: string;
}

export type POStatus =
  | "Pending Approval"
  | "Approved"
  | "Sent to Vendor"
  | "Partially Received"
  | "Fully Received"
  | "Closed"
  | "Cancelled";

export type POSource = "Auto-Reorder" | "Manual" | "Emergency";

export interface POLineItem {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export interface Invoice extends AirtableRecord {
  invoice_id: string;
  vendor_invoice_number: string;
  vendor_id: string;
  vendor_name: string;
  po_number: string | null;
  invoice_date: string;
  received_date: string;
  total_amount: number;
  match_status: MatchStatus;
  match_details: string;
  gl_account: string;
  duplicate_flag: boolean;
  dispute_email_draft?: string;
  ocr_confidence?: number;
  items?: InvoiceLineItem[];
}

export type MatchStatus =
  | "Perfect Match"
  | "Minor"
  | "Major"
  | "Disputed"
  | "Pending Review";

export interface InvoiceLineItem {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  po_unit_price?: number;
  receiving_qty?: number;
}

export interface InventoryItem {
  item_id: string;
  item_name: string;
  category: string;
  department: string;
  warehouse: string;
  unit_of_measure: string;
  par_level: number;
  reorder_point: number;
  reorder_quantity: number;
  current_stock: number;
  preferred_vendor_id: string;
  preferred_vendor_name: string;
  unit_cost: number;
  ai_flag: string | null;
  negative_stock: boolean;
  ghost_surplus: boolean;
}

export interface ReceivingRecord {
  receiving_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  date_received: string;
  received_by: string;
  items: ReceivingLineItem[];
  has_discrepancy: boolean;
  discrepancy_notes?: string;
  photos: string[];
}

export interface ReceivingLineItem {
  item_name: string;
  expected_qty: number;
  received_qty: number;
  unit: string;
  quality_ok: boolean;
  quality_notes?: string;
  temperature_c?: number;
}

export interface Contract {
  contract_id: string;
  vendor_id: string;
  vendor_name: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: ContractStatus;
  days_until_expiry: number;
  total_value: number;
  key_terms: string;
}

export type ContractStatus = "Active" | "Expiring" | "Expired" | "Renewed";

export interface AuditEntry extends AirtableRecord {
  event_id: string;
  timestamp: string;
  event_type: AuditEventType;
  actor: string;
  reference_id: string;
  details: string;
  amount?: number;
}

export type AuditEventType =
  | "PO_CREATED"
  | "PO_APPROVED"
  | "PO_REJECTED"
  | "INVOICE_MATCHED"
  | "INVOICE_DISPUTED"
  | "REORDER_TRIGGERED"
  | "REORDER_BLOCKED"
  | "ANOMALY_DETECTED"
  | "REPORT_GENERATED"
  | "RECEIVING_CONFIRMED";

export interface OccupancyForecast {
  date: string;
  occupancy_pct: number;
  rooms_sold: number;
  total_rooms: number;
  arrivals: number;
  departures: number;
  events: string[];
}

export interface GLMapping {
  gl_account_code: string;
  gl_account_name: string;
  department: string;
  budget_monthly: number;
}

export interface Alert {
  id: string;
  severity: "critical" | "warning" | "approval" | "info";
  title: string;
  message: string;
  timestamp: string;
  workflow_id: string;
  reference_id?: string;
}

export interface DailyFlashReport {
  date: string;
  content: string;
}

export interface DemandForecastItem {
  item_name: string;
  category: string;
  current_stock: number;
  forecasted_demand: number;
  days_until_stockout: number;
  urgency: "red" | "amber" | "green";
  recommended_order_qty: number;
  unit: string;
}

export interface WorkflowStatus {
  id: string;
  name: string;
  last_run: string | null;
  status: "active" | "inactive" | "error";
  next_scheduled: string | null;
  trigger_type: "cron" | "webhook" | "manual";
}

export interface IntegrationStatus {
  name: string;
  status: "connected" | "disconnected" | "pending";
  last_check: string;
  details: string;
}

export interface StaffMember {
  name: string;
  department: string;
  pin: string;
}
