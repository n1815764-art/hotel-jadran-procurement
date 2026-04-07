"use client";

import { useState, useEffect } from "react";
import { Plus, CheckCircle, XCircle, FileText } from "lucide-react";
import type { PurchaseOrder, POLineItem, Vendor } from "@/types";
import { getDataService } from "@/services/sample-data-service";
import { useAppStore } from "@/stores/app-store";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { formatEUR, formatDate, formatDateTime, approvalTier } from "@/lib/utils";
import { PO_STATUSES, GL_CODES } from "@/lib/constants";
import { DEPARTMENTS } from "@/lib/constants";

interface CreateLineItem {
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

const EMPTY_LINE_ITEM: CreateLineItem = {
  item_name: "",
  quantity: 1,
  unit: "kom",
  unit_price: 0,
};

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);

  const poStatusFilter = useAppStore((s) => s.poStatusFilter);
  const setPoStatusFilter = useAppStore((s) => s.setPoStatusFilter);
  const selectedPO = useAppStore((s) => s.selectedPO);
  const setSelectedPO = useAppStore((s) => s.setSelectedPO);
  const showCreatePO = useAppStore((s) => s.showCreatePO);
  const setShowCreatePO = useAppStore((s) => s.setShowCreatePO);

  // Create form state
  const [createVendorId, setCreateVendorId] = useState("");
  const [createDepartment, setCreateDepartment] = useState("");
  const [createGLCode, setCreateGLCode] = useState("");
  const [createLineItems, setCreateLineItems] = useState<CreateLineItem[]>([
    { ...EMPTY_LINE_ITEM },
  ]);

  const ds = getDataService();

  const loadPOs = async () => {
    const pos = await ds.getPurchaseOrders(poStatusFilter);
    setPurchaseOrders(pos);
  };

  useEffect(() => {
    loadPOs();
  }, [poStatusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ds.getVendors().then(setVendors);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When selectedPO is set from external navigation (e.g. dashboard), load the detail
  useEffect(() => {
    if (selectedPO) {
      ds.getPurchaseOrderByNumber(selectedPO).then((po) => {
        if (po) setDetailPO(po);
      });
    } else {
      setDetailPO(null);
    }
  }, [selectedPO]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRowClick = (po: PurchaseOrder) => {
    setSelectedPO(po.po_number);
  };

  const handleCloseDetail = () => {
    setSelectedPO(null);
    setDetailPO(null);
  };

  const handleApprove = async (poNumber: string) => {
    await ds.updatePurchaseOrderStatus(poNumber, "Approved", "Zoran Radonjic");
    await loadPOs();
    const updated = await ds.getPurchaseOrderByNumber(poNumber);
    if (updated) setDetailPO(updated);
  };

  const handleReject = async (poNumber: string) => {
    await ds.updatePurchaseOrderStatus(poNumber, "Cancelled");
    await loadPOs();
    const updated = await ds.getPurchaseOrderByNumber(poNumber);
    if (updated) setDetailPO(updated);
  };

  // --- Create PO helpers ---

  const handleLineItemChange = (
    index: number,
    field: keyof CreateLineItem,
    value: string | number
  ) => {
    setCreateLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addLineItem = () => {
    setCreateLineItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }]);
  };

  const removeLineItem = (index: number) => {
    setCreateLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const createTotal = createLineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );

  const handleCreateSubmit = () => {
    const selectedVendor = vendors.find((v) => v.vendor_id === createVendorId);
    if (!selectedVendor || !createDepartment || !createGLCode) return;

    const validItems = createLineItems.filter(
      (item) => item.item_name.trim() !== "" && item.quantity > 0
    );
    if (validItems.length === 0) return;

    const newPO: PurchaseOrder = {
      po_number: `PO-2026-${String(purchaseOrders.length + 100).padStart(3, "0")}`,
      date_created: new Date().toISOString(),
      vendor_id: selectedVendor.vendor_id,
      vendor_name: selectedVendor.vendor_name,
      department: createDepartment,
      total_amount: createTotal,
      status: createTotal < 500 ? "Approved" : "Pending Approval",
      approved_by: createTotal < 500 ? "Auto-approved" : null,
      approval_date: createTotal < 500 ? new Date().toISOString() : null,
      gl_account: createGLCode,
      items: validItems.map((item) => ({
        item_name: item.item_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
      })),
      source: "Manual",
      requester: "Zoran Radonjic",
      ai_note: "Manually created purchase order.",
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);
    resetCreateForm();
    setShowCreatePO(false);
  };

  const resetCreateForm = () => {
    setCreateVendorId("");
    setCreateDepartment("");
    setCreateGLCode("");
    setCreateLineItems([{ ...EMPTY_LINE_ITEM }]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-100">Purchase Orders</h1>
        <Button onClick={() => setShowCreatePO(true)}>
          <Plus className="w-4 h-4" /> Create PO
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-3">
        {PO_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setPoStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              poStatusFilter === status
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* PO Table */}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-800/50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                PO #
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Department
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                Total (EUR)
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Approver
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {purchaseOrders.map((po) => (
              <tr
                key={po.po_number}
                onClick={() => handleRowClick(po)}
                className="hover:bg-zinc-800/30 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 mono text-zinc-200 font-medium">
                  {po.po_number}
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {formatDate(po.date_created)}
                </td>
                <td className="px-4 py-3 text-zinc-300">{po.vendor_name}</td>
                <td className="px-4 py-3 text-zinc-400">{po.department}</td>
                <td className="px-4 py-3 text-right mono text-zinc-200">
                  {formatEUR(po.total_amount)}
                </td>
                <td className="px-4 py-3">
                  <Badge>{po.source}</Badge>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={po.status} />
                </td>
                <td className="px-4 py-3 text-zinc-400">
                  {po.approved_by ?? "---"}
                </td>
              </tr>
            ))}
            {purchaseOrders.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  No purchase orders found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PO Detail Modal */}
      <Modal
        open={detailPO !== null}
        onClose={handleCloseDetail}
        title={detailPO ? `Purchase Order ${detailPO.po_number}` : ""}
        wide
      >
        {detailPO && (
          <div className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  PO Number
                </span>
                <p className="mono text-sm font-semibold text-zinc-200">
                  {detailPO.po_number}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Date Created
                </span>
                <p className="text-sm text-zinc-300">
                  {formatDate(detailPO.date_created)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Vendor
                </span>
                <p className="text-sm text-zinc-300">{detailPO.vendor_name}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Department
                </span>
                <p className="text-sm text-zinc-300">{detailPO.department}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  GL Account
                </span>
                <p className="mono text-sm text-zinc-300">
                  {detailPO.gl_account}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Source
                </span>
                <p className="text-sm">
                  <Badge>{detailPO.source}</Badge>
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Status
                </span>
                <p className="text-sm">
                  <StatusBadge status={detailPO.status} />
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Total
                </span>
                <p className="mono text-sm font-semibold text-zinc-100">
                  {formatEUR(detailPO.total_amount)}
                </p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Requester
                </span>
                <p className="text-sm text-zinc-300">{detailPO.requester}</p>
              </div>
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Approved By
                </span>
                <p className="text-sm text-zinc-300">
                  {detailPO.approved_by ?? "---"}
                </p>
              </div>
              {detailPO.approval_date && (
                <div>
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">
                    Approval Date
                  </span>
                  <p className="text-sm text-zinc-300">
                    {formatDateTime(detailPO.approval_date)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Approval Tier
                </span>
                <p className="text-sm text-zinc-300">
                  {approvalTier(detailPO.total_amount)}
                </p>
              </div>
            </div>

            {/* AI Recommendation */}
            {detailPO.ai_note && (
              <div>
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  AI Recommendation
                </h3>
                <div className="ai-content text-sm text-zinc-300 leading-relaxed">
                  {detailPO.ai_note}
                </div>
              </div>
            )}

            {/* Line Items Table */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Line Items
              </h3>
              <div className="overflow-x-auto rounded-lg border border-zinc-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-800/50 text-left">
                      <th className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                        Qty
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                        Unit Price
                      </th>
                      <th className="px-4 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {detailPO.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-zinc-300">
                          {item.item_name}
                        </td>
                        <td className="px-4 py-2 text-right mono text-zinc-300">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-2 text-zinc-400">
                          {item.unit}
                        </td>
                        <td className="px-4 py-2 text-right mono text-zinc-300">
                          {formatEUR(item.unit_price)}
                        </td>
                        <td className="px-4 py-2 text-right mono text-zinc-200 font-medium">
                          {formatEUR(item.quantity * item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-zinc-700">
                      <td
                        colSpan={4}
                        className="px-4 py-2 text-right text-xs font-semibold text-zinc-400 uppercase"
                      >
                        Total
                      </td>
                      <td className="px-4 py-2 text-right mono text-zinc-100 font-bold">
                        {formatEUR(detailPO.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            {detailPO.status === "Pending Approval" && (
              <div className="flex items-center gap-3 pt-2">
                <Button
                  variant="success"
                  onClick={() => handleApprove(detailPO.po_number)}
                >
                  <CheckCircle className="w-4 h-4" /> Approve
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleReject(detailPO.po_number)}
                >
                  <XCircle className="w-4 h-4" /> Reject
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create PO Modal */}
      <Modal
        open={showCreatePO}
        onClose={() => {
          setShowCreatePO(false);
          resetCreateForm();
        }}
        title="Create Purchase Order"
        wide
      >
        <div className="space-y-6">
          {/* Vendor / Department / GL Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Vendor
              </label>
              <select
                value={createVendorId}
                onChange={(e) => setCreateVendorId(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">Select vendor...</option>
                {vendors.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={createDepartment}
                onChange={(e) => setCreateDepartment(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                GL Code
              </label>
              <select
                value={createGLCode}
                onChange={(e) => setCreateGLCode(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
              >
                <option value="">Select GL code...</option>
                {GL_CODES.map((gl) => (
                  <option key={gl.gl_account_code} value={gl.gl_account_code}>
                    {gl.gl_account_code} - {gl.gl_account_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Line Items
              </h3>
              <Button size="sm" variant="secondary" onClick={addLineItem}>
                <Plus className="w-3.5 h-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {createLineItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-end"
                >
                  <div className="col-span-5">
                    {idx === 0 && (
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Item Name
                      </label>
                    )}
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) =>
                        handleLineItemChange(idx, "item_name", e.target.value)
                      }
                      placeholder="Item name"
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && (
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Qty
                      </label>
                    )}
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(
                          idx,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && (
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Unit
                      </label>
                    )}
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) =>
                        handleLineItemChange(idx, "unit", e.target.value)
                      }
                      placeholder="kg"
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && (
                      <label className="block text-[10px] text-zinc-500 mb-1">
                        Price
                      </label>
                    )}
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unit_price}
                      onChange={(e) =>
                        handleLineItemChange(
                          idx,
                          "unit_price",
                          Number(e.target.value)
                        )
                      }
                      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    {createLineItems.length > 1 && (
                      <button
                        onClick={() => removeLineItem(idx)}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Total + Approval Tier */}
          <Card className="flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Estimated Total
              </span>
              <p className="mono text-lg font-bold text-zinc-100">
                {formatEUR(createTotal)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Approval Tier
              </span>
              <p className="text-sm font-medium text-zinc-300">
                {approvalTier(createTotal)}
              </p>
            </div>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreatePO(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                !createVendorId ||
                !createDepartment ||
                !createGLCode ||
                createLineItems.every((i) => i.item_name.trim() === "")
              }
            >
              <FileText className="w-4 h-4" /> Create Purchase Order
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
