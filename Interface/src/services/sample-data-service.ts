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
  ARLedgerEntry,
} from "@/types";
import type {
  DataService,
  AuditFilters,
  ModifyPurchaseOrderInput,
  ModifyPurchaseOrderResult,
  AutoReorderStatus,
  DepartmentBudget,
} from "./data-service";
import { buildBcsDiffSummary, totalFor } from "@/lib/po-diff";
import { sampleVendors, sampleScorecards } from "@/data/sample/vendors";
import { samplePurchaseOrders } from "@/data/sample/purchase-orders";
import { sampleInvoices } from "@/data/sample/invoices";
import { sampleInventory } from "@/data/sample/inventory";
import { sampleReceivingLog } from "@/data/sample/receiving-log";
import { sampleContracts } from "@/data/sample/contracts";
import { sampleAuditTrail } from "@/data/sample/audit-trail";
import { sampleOccupancy } from "@/data/sample/occupancy";
import { sampleAlerts } from "@/data/sample/alerts";
import { sampleDailyReports, sampleDemandForecast } from "@/data/sample/reports";
import { sampleWorkflows, sampleIntegrations } from "@/data/sample/system-status";
import { samplePaymentBatches } from "@/data/sample/payment-batches";
import { sampleARLedger } from "@/data/sample/ar-ledger";
import { GL_CODES } from "@/lib/constants";

export class SampleDataService implements DataService {
  private purchaseOrders = [...samplePurchaseOrders];
  private receivingLog = [...sampleReceivingLog];
  private auditTrail = [...sampleAuditTrail];

  async getVendors(): Promise<Vendor[]> {
    return sampleVendors;
  }

  async getVendorById(id: string): Promise<Vendor | undefined> {
    return sampleVendors.find((v) => v.vendor_id === id);
  }

  async getVendorScorecards(vendorId?: string): Promise<VendorScorecard[]> {
    if (vendorId) {
      return sampleScorecards.filter((s) => s.vendor_id === vendorId);
    }
    return sampleScorecards;
  }

  async getPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
    if (status && status !== "All") {
      return this.purchaseOrders.filter((po) => po.status === status);
    }
    return this.purchaseOrders;
  }

  async getPurchaseOrderByNumber(poNumber: string): Promise<PurchaseOrder | undefined> {
    return this.purchaseOrders.find((po) => po.po_number === poNumber);
  }

  async getPaymentBatches(filters?: { status?: string }): Promise<PaymentBatch[]> {
    if (filters?.status && filters.status !== "All") {
      return samplePaymentBatches.filter((b) => b.status === filters.status);
    }
    return samplePaymentBatches;
  }

  async getARLedger(filters?: { status?: string; minDaysOverdue?: number }): Promise<ARLedgerEntry[]> {
    let entries = sampleARLedger;
    if (filters?.status && filters.status !== "All") {
      entries = entries.filter((e) => e.status === filters.status);
    }
    if (typeof filters?.minDaysOverdue === "number") {
      entries = entries.filter((e) => e.days_overdue >= filters.minDaysOverdue!);
    }
    return entries;
  }

  async modifyPurchaseOrder(params: ModifyPurchaseOrderInput): Promise<ModifyPurchaseOrderResult> {
    const { po_number, record_id, modified_items, original_items, modified_by } = params;
    const new_total = totalFor(modified_items);
    const diff_summary = buildBcsDiffSummary(original_items, modified_items);

    await new Promise((resolve) => setTimeout(resolve, 300));

    const idx = this.purchaseOrders.findIndex(
      (po) => po._recordId === record_id || po.po_number === po_number
    );
    if (idx === -1) {
      return {
        success: false,
        new_total,
        diff_summary,
        error: `PO ${po_number} not found in sample dataset`,
      };
    }

    this.purchaseOrders = this.purchaseOrders.map((po, i) =>
      i === idx
        ? {
            ...po,
            items: modified_items.map((item) => ({ ...item })),
            total_amount: new_total,
          }
        : po
    );

    this.auditTrail = [
      {
        event_id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: "PO_MODIFIED",
        actor: modified_by,
        reference_id: po_number,
        details: diff_summary,
        amount: new_total,
      },
      ...this.auditTrail,
    ];

    return { success: true, new_total, diff_summary };
  }

  async updatePurchaseOrderStatus(poNumber: string, status: string, approvedBy?: string): Promise<void> {
    const idx = this.purchaseOrders.findIndex((po) => po.po_number === poNumber);
    if (idx !== -1) {
      this.purchaseOrders = this.purchaseOrders.map((po, i) =>
        i === idx
          ? {
              ...po,
              status: status as PurchaseOrder["status"],
              approved_by: approvedBy ?? po.approved_by,
              approval_date: approvedBy ? new Date().toISOString() : po.approval_date,
            }
          : po
      );
    }
  }

  async getInvoices(status?: string): Promise<Invoice[]> {
    if (status && status !== "All") {
      return sampleInvoices.filter((inv) => inv.match_status === status);
    }
    return sampleInvoices;
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    return sampleInvoices.find((inv) => inv.invoice_id === id);
  }

  async getInventory(): Promise<InventoryItem[]> {
    return sampleInventory;
  }

  async getInventoryAlerts(): Promise<InventoryItem[]> {
    return sampleInventory.filter((item) => item.negative_stock || item.ghost_surplus || item.current_stock <= item.reorder_point);
  }

  async getReceivingLog(): Promise<ReceivingRecord[]> {
    return this.receivingLog;
  }

  async submitReceiving(record: ReceivingRecord): Promise<void> {
    this.receivingLog = [...this.receivingLog, record];
    this.auditTrail = [
      {
        event_id: `AUD-${Date.now()}`,
        timestamp: new Date().toISOString(),
        event_type: "RECEIVING_CONFIRMED",
        actor: record.received_by,
        reference_id: record.po_number,
        details: `Prijem potvrden za ${record.vendor_name}. ${record.has_discrepancy ? "Utvrdjene nepodudarnosti." : "Sve stavke u redu."}`,
        amount: 0,
      },
      ...this.auditTrail,
    ];
  }

  async getContracts(): Promise<Contract[]> {
    return sampleContracts;
  }

  async getAuditTrail(filters?: AuditFilters): Promise<AuditEntry[]> {
    let entries = this.auditTrail;
    if (filters?.event_type && filters.event_type !== "All") {
      entries = entries.filter((e) => e.event_type === filters.event_type);
    }
    if (filters?.actor && filters.actor !== "All") {
      entries = entries.filter((e) => e.actor === filters.actor);
    }
    if (filters?.reference_id) {
      entries = entries.filter((e) => e.reference_id.toLowerCase().includes(filters.reference_id!.toLowerCase()));
    }
    return entries;
  }

  async getOccupancyForecast(): Promise<OccupancyForecast[]> {
    return sampleOccupancy;
  }

  async getAlerts(): Promise<Alert[]> {
    return sampleAlerts;
  }

  async getDailyReports(): Promise<DailyFlashReport[]> {
    return sampleDailyReports;
  }

  async getDemandForecast(): Promise<DemandForecastItem[]> {
    return sampleDemandForecast;
  }

  async getWorkflowStatuses(): Promise<WorkflowStatus[]> {
    return sampleWorkflows;
  }

  async getIntegrationStatuses(): Promise<IntegrationStatus[]> {
    return sampleIntegrations;
  }

  async getGLMappings(): Promise<GLMapping[]> {
    return GL_CODES;
  }

  async approvePO(poNumber: string, approvedBy: string): Promise<void> {
    await this.updatePurchaseOrderStatus(poNumber, "Approved", approvedBy);
  }

  async rejectPO(poNumber: string, _reason?: string): Promise<void> {
    await this.updatePurchaseOrderStatus(poNumber, "Cancelled");
  }

  async submitRequisition(data: import("./data-service").RequisitionInput): Promise<{ requisition_id: string }> {
    return { requisition_id: data.requisition_id ?? `REQ-${Date.now()}` };
  }

  async checkAutoReorderStatus(itemId: string): Promise<AutoReorderStatus> {
    const item = sampleInventory.find((i) => i.item_id === itemId);
    if (!item) return { covered: false };

    const pendingAuto = this.purchaseOrders.find(
      (po) =>
        po.source === "Auto-Reorder" &&
        (po.status === "Pending Approval" || po.status === "Approved") &&
        po.items.some((line) => line.item_name === item.item_name)
    );

    if (pendingAuto) {
      const matchingLine = pendingAuto.items.find((l) => l.item_name === item.item_name);
      return {
        covered: true,
        scheduled_date: pendingAuto.date_created,
        scheduled_quantity: matchingLine?.quantity,
        reasoning: `Auto-narudžba ${pendingAuto.po_number} (${pendingAuto.vendor_name}) pokriva ovaj artikal — čeka odobrenje ili je već odobrena.`,
      };
    }

    if (item.current_stock <= item.reorder_point) {
      return {
        covered: true,
        scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        scheduled_quantity: Math.max(item.par_level - item.current_stock, item.reorder_quantity),
        reasoning: `Stanje (${item.current_stock} ${item.unit_of_measure}) ispod reorder točke ${item.reorder_point}. WF08 će ovo pokrenuti pri sljedećem 6:00 skeniranju.`,
      };
    }

    return { covered: false };
  }

  async getDepartmentBudget(department: string): Promise<DepartmentBudget> {
    const mappings = GL_CODES.filter((g) => g.department === department);
    const monthly_budget = mappings.reduce((sum, g) => sum + g.budget_monthly, 0);
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const spent_mtd = this.purchaseOrders
      .filter(
        (po) =>
          po.department === department &&
          po.status !== "Cancelled" &&
          po.date_created.startsWith(monthPrefix)
      )
      .reduce((sum, po) => sum + po.total_amount, 0);
    const remaining = Math.max(0, monthly_budget - spent_mtd);
    const pct_used = monthly_budget > 0 ? (spent_mtd / monthly_budget) * 100 : 0;
    return { department, monthly_budget, spent_mtd, remaining, pct_used };
  }
}

// Singleton instance
let dataServiceInstance: DataService | undefined;

export function getDataService(): DataService {
  if (!dataServiceInstance) {
    dataServiceInstance = new SampleDataService();
  }
  return dataServiceInstance;
}

export function setDataService(service: DataService): void {
  dataServiceInstance = service;
}
