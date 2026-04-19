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
import type { DataService, AuditFilters } from "./data-service";
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

  async getPaymentBatches(_filters?: { status?: string }): Promise<PaymentBatch[]> {
    return [];
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

  async submitRequisition(_data: import("./data-service").RequisitionInput): Promise<{ requisition_id: string }> {
    return { requisition_id: `REQ-${Date.now()}` };
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
