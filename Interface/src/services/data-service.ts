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
  ARLedgerEntry,
} from "@/types";

export interface DataService {
  getVendors(): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  getVendorScorecards(vendorId?: string): Promise<VendorScorecard[]>;

  getPurchaseOrders(status?: string): Promise<PurchaseOrder[]>;
  getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrderStatus(poNumber: string, status: string, approvedBy?: string): Promise<void>;

  modifyPurchaseOrder(params: ModifyPurchaseOrderInput): Promise<ModifyPurchaseOrderResult>;

  checkAutoReorderStatus(itemId: string): Promise<AutoReorderStatus>;

  getDepartmentBudget(department: string): Promise<DepartmentBudget>;

  getPaymentBatches(filters?: { status?: string }): Promise<PaymentBatch[]>;

  getARLedger(filters?: { status?: string; minDaysOverdue?: number }): Promise<ARLedgerEntry[]>;

  getInvoices(status?: string): Promise<Invoice[]>;
  getInvoiceById(id: string): Promise<Invoice | undefined>;

  getInventory(): Promise<InventoryItem[]>;
  getInventoryAlerts(): Promise<InventoryItem[]>;

  getReceivingLog(): Promise<ReceivingRecord[]>;
  submitReceiving(record: ReceivingRecord): Promise<void>;

  getContracts(): Promise<Contract[]>;

  getAuditTrail(filters?: AuditFilters): Promise<AuditEntry[]>;

  getOccupancyForecast(): Promise<OccupancyForecast[]>;

  getAlerts(): Promise<Alert[]>;

  getDailyReports(): Promise<DailyFlashReport[]>;
  getDemandForecast(): Promise<DemandForecastItem[]>;

  getWorkflowStatuses(): Promise<WorkflowStatus[]>;
  getIntegrationStatuses(): Promise<IntegrationStatus[]>;

  getGLMappings(): Promise<GLMapping[]>;

  // Actions — write operations
  approvePO(poNumber: string, approvedBy: string): Promise<void>;
  rejectPO(poNumber: string, reason?: string): Promise<void>;
  submitRequisition(data: RequisitionInput): Promise<{ requisition_id: string }>;
}

export interface RequisitionInput {
  department: string;
  item_name: string;
  quantity_requested: number;
  unit: string;
  urgency: string;
  requester: string;
  justification?: string;
  // Optional client-generated id; if present, the service must pass it through
  // verbatim (the form shows it on the confirmation screen the moment it submits).
  requisition_id?: string;
  item_id?: string;
  ai_suggested_quantity?: number;
  ai_suggestion_accepted?: boolean;
}

export interface AutoReorderStatus {
  covered: boolean;
  scheduled_date?: string;
  scheduled_quantity?: number;
  reasoning?: string;
}

export interface DepartmentBudget {
  department: string;
  monthly_budget: number;
  spent_mtd: number;
  remaining: number;
  pct_used: number;
}

export interface AuditFilters {
  event_type?: string;
  actor?: string;
  date_from?: string;
  date_to?: string;
  reference_id?: string;
}

export interface ModifyPurchaseOrderInput {
  po_number: string;
  record_id: string;
  modified_items: POLineItem[];
  original_items: POLineItem[];
  modified_by: string;
}

export interface ModifyPurchaseOrderResult {
  success: boolean;
  new_total: number;
  diff_summary: string;
  error?: string;
}
