"use client";

import { create } from "zustand";
import type { ReceivingLineItem } from "@/types";

interface AppState {
  // PO filters
  poStatusFilter: string;
  setPoStatusFilter: (status: string) => void;

  // Invoice filters
  invoiceStatusFilter: string;
  setInvoiceStatusFilter: (status: string) => void;

  // Inventory filters
  inventoryCategory: string;
  inventorySearch: string;
  setInventoryCategory: (cat: string) => void;
  setInventorySearch: (search: string) => void;

  // Audit trail filters
  auditEventType: string;
  auditActor: string;
  auditRefSearch: string;
  setAuditEventType: (type: string) => void;
  setAuditActor: (actor: string) => void;
  setAuditRefSearch: (search: string) => void;

  // Modal state
  selectedPO: string | null;
  selectedInvoice: string | null;
  selectedVendor: string | null;
  showCreatePO: boolean;
  setSelectedPO: (po: string | null) => void;
  setSelectedInvoice: (inv: string | null) => void;
  setSelectedVendor: (vendor: string | null) => void;
  setShowCreatePO: (show: boolean) => void;

  // Receiving wizard state
  receivingStep: number;
  receivingStaff: string | null;
  receivingPO: string | null;
  receivingItems: ReceivingLineItem[];
  receivingDriverName: string;
  setReceivingStep: (step: number) => void;
  setReceivingStaff: (staff: string | null) => void;
  setReceivingPO: (po: string | null) => void;
  setReceivingItems: (items: ReceivingLineItem[]) => void;
  updateReceivingItem: (index: number, item: ReceivingLineItem) => void;
  setReceivingDriverName: (name: string) => void;
  resetReceiving: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  poStatusFilter: "All",
  setPoStatusFilter: (status) => set({ poStatusFilter: status }),

  invoiceStatusFilter: "All",
  setInvoiceStatusFilter: (status) => set({ invoiceStatusFilter: status }),

  inventoryCategory: "All",
  inventorySearch: "",
  setInventoryCategory: (cat) => set({ inventoryCategory: cat }),
  setInventorySearch: (search) => set({ inventorySearch: search }),

  auditEventType: "All",
  auditActor: "All",
  auditRefSearch: "",
  setAuditEventType: (type) => set({ auditEventType: type }),
  setAuditActor: (actor) => set({ auditActor: actor }),
  setAuditRefSearch: (search) => set({ auditRefSearch: search }),

  selectedPO: null,
  selectedInvoice: null,
  selectedVendor: null,
  showCreatePO: false,
  setSelectedPO: (po) => set({ selectedPO: po }),
  setSelectedInvoice: (inv) => set({ selectedInvoice: inv }),
  setSelectedVendor: (vendor) => set({ selectedVendor: vendor }),
  setShowCreatePO: (show) => set({ showCreatePO: show }),

  receivingStep: 0,
  receivingStaff: null,
  receivingPO: null,
  receivingItems: [],
  receivingDriverName: "",
  setReceivingStep: (step) => set({ receivingStep: step }),
  setReceivingStaff: (staff) => set({ receivingStaff: staff }),
  setReceivingPO: (po) => set({ receivingPO: po }),
  setReceivingItems: (items) => set({ receivingItems: items }),
  updateReceivingItem: (index, item) =>
    set((state) => ({
      receivingItems: state.receivingItems.map((existing, i) => (i === index ? item : existing)),
    })),
  setReceivingDriverName: (name) => set({ receivingDriverName: name }),
  resetReceiving: () =>
    set({
      receivingStep: 0,
      receivingStaff: null,
      receivingPO: null,
      receivingItems: [],
      receivingDriverName: "",
    }),
}));
