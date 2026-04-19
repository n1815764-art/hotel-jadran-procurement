import type {
  Vendor,
  VendorScorecard,
  PurchaseOrder,
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

export interface DataService {
  getVendors(): Promise<Vendor[]>;
  getVendorById(id: string): Promise<Vendor | undefined>;
  getVendorScorecards(vendorId?: string): Promise<VendorScorecard[]>;

  getPurchaseOrders(status?: string): Promise<PurchaseOrder[]>;
  getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined>;
  updatePurchaseOrderStatus(poNumber: string, status: string, approvedBy?: string): Promise<void>;

  getPaymentBatches(filters?: { status?: string }): Promise<PaymentBatch[]>;

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
}

export interface AuditFilters {
  event_type?: string;
  actor?: string;
  date_from?: string;
  date_to?: string;
  reference_id?: string;
}
