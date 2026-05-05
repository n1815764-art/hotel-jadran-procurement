"use client";

import { useEffect, useState, useCallback } from "react";
import { getDataService } from "@/services/sample-data-service";
import { useAppStore } from "@/stores/app-store";
import { WEBHOOK_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, ReceivingLineItem } from "@/types";
import { CheckCircle, Camera, ChevronLeft, ChevronRight, AlertTriangle, Package, Truck, Square, CheckSquare } from "lucide-react";

export default function PrijemPage() {
  const {
    receivingStep,
    receivingPO,
    receivingItems,
    receivingDriverName,
    setReceivingStep,
    setReceivingStaff,
    setReceivingPO,
    setReceivingItems,
    updateReceivingItem,
    setReceivingDriverName,
    resetReceiving,
  } = useAppStore();

  const [pendingPOs, setPendingPOs] = useState<PurchaseOrder[]>([]);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [selectedPOData, setSelectedPOData] = useState<PurchaseOrder | null>(null);
  // Item selection state — tracks which PO items are selected for receiving
  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());

  const ds = getDataService();

  useEffect(() => {
    ds.getPurchaseOrders().then((pos) => {
      const deliverable = pos.filter((po) => po.status === "Sent to Vendor" || po.status === "Approved");
      setPendingPOs(deliverable);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openItemSelection = useCallback(
    (po: PurchaseOrder) => {
      setReceivingPO(po.po_number);
      setSelectedPOData(po);
      setSelectedItemIndices(new Set(po.items.map((_, i) => i))); // all selected by default
      setReceivingStep(2); // item selection step
    },
    [setReceivingPO, setReceivingStep]
  );

  const confirmItemSelection = useCallback(() => {
    if (!selectedPOData || selectedItemIndices.size === 0) return;
    const items: ReceivingLineItem[] = selectedPOData.items
      .filter((_, i) => selectedItemIndices.has(i))
      .map((item) => ({
        item_name: item.item_name,
        expected_qty: item.quantity,
        received_qty: item.quantity,
        unit: item.unit,
        quality_ok: true,
      }));
    setReceivingItems(items);
    setCurrentItemIndex(0);
    setReceivingStep(3); // go to per-item recording
  }, [selectedPOData, selectedItemIndices, setReceivingItems, setReceivingStep]);

  const toggleItem = (idx: number) => {
    setSelectedItemIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!selectedPOData) return;
    if (selectedItemIndices.size === selectedPOData.items.length) {
      setSelectedItemIndices(new Set());
    } else {
      setSelectedItemIndices(new Set(selectedPOData.items.map((_, i) => i)));
    }
  };

  const handleSubmit = async () => {
    const hasDiscrepancy = receivingItems.some(
      (item) => item.received_qty !== item.expected_qty || !item.quality_ok
    );

    const record = {
      receiving_id: `REC-2026-${String(Date.now()).slice(-4)}`,
      po_number: receivingPO!,
      vendor_id: selectedPOData?.vendor_id || "",
      vendor_name: selectedPOData?.vendor_name || "",
      date_received: new Date().toISOString(),
      received_by: "Prijem",
      items: receivingItems,
      has_discrepancy: hasDiscrepancy,
      discrepancy_notes: hasDiscrepancy
        ? receivingItems
            .filter((i) => i.received_qty !== i.expected_qty || !i.quality_ok)
            .map(
              (i) =>
                `${i.item_name}: primljeno ${i.received_qty}/${i.expected_qty} ${i.unit}${!i.quality_ok ? " - problem s kvalitetom" : ""}`
            )
            .join("; ")
        : undefined,
      photos: [],
    };

    try {
      await ds.submitReceiving(record);
      try {
        await fetch(WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(record),
        });
      } catch {
        // Offline — would queue in IndexedDB in production
      }
      setSubmitted(true);
    } catch {
      // Handle error
    }
  };

  const currentItem = receivingItems[currentItemIndex];

  // Step 0: Welcome — entry points (Prijem + Novi zahtjev)
  if (receivingStep === 0) {
    return (
      <div className="space-y-6 pt-12">
        <div className="text-center">
          <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-800">Prijem</h2>
          <p className="text-slate-500 mt-2 text-lg">Evidencija zaprimljene robe</p>
        </div>
        <button
          onClick={() => {
            setReceivingStaff("Prijem");
            setReceivingStep(1);
          }}
          className="w-full touch-target bg-blue-600 rounded-2xl p-5 text-center font-bold text-white text-xl active:bg-blue-700 transition-colors"
        >
          Zapocni prijem
        </button>
        <a
          href="/zahtjev"
          className="w-full touch-target bg-white border-2 border-blue-200 rounded-2xl p-5 text-center font-bold text-blue-600 text-xl block active:bg-blue-50 transition-colors"
        >
          Novi zahtjev
        </a>
      </div>
    );
  }

  // Step 1: Select Delivery (by vendor/PO)
  if (receivingStep === 1) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Ocekivane dostave</h2>
          <p className="text-sm text-slate-500">Odaberite dostavu za prijem</p>
        </div>

        {pendingPOs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg text-slate-500">Nema ocekivanih dostava</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingPOs.map((po) => (
              <button
                key={po.po_number}
                onClick={() => openItemSelection(po)}
                className="w-full bg-white border-2 border-slate-200 rounded-xl p-5 text-left hover:border-blue-500 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-semibold text-blue-600">{po.po_number}</span>
                  <span className="text-sm text-slate-500">{po.items.length} artikala</span>
                </div>
                <p className="text-lg font-semibold text-slate-800">{po.vendor_name}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {po.items.map((item, i) => (
                    <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {item.item_name}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => {
            setReceivingPO("UNEXPECTED");
            setReceivingItems([]);
            setSelectedPOData(null);
            setReceivingStep(3);
          }}
          className="w-full touch-target bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
          <p className="text-base font-semibold text-amber-700">Neocekivana dostava</p>
          <p className="text-sm text-amber-600">Dostava bez narudzbenice</p>
        </button>

        <button
          onClick={() => setReceivingStep(0)}
          className="w-full text-sm text-slate-400 py-2"
        >
          Nazad
        </button>
      </div>
    );
  }

  // Step 2: Select which items from this PO are being delivered
  if (receivingStep === 2 && selectedPOData) {
    const allSelected = selectedItemIndices.size === selectedPOData.items.length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setReceivingStep(1)} className="flex items-center gap-1 text-blue-600 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Nazad
          </button>
          <span className="font-mono text-sm text-slate-500">{selectedPOData.po_number}</span>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800">{selectedPOData.vendor_name}</h2>
          <p className="text-sm text-slate-500 mt-1">Odaberite artikle koji su isporuceni</p>
        </div>

        {/* Select all toggle */}
        <button
          onClick={toggleAll}
          className="w-full flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 active:bg-slate-100"
        >
          {allSelected ? (
            <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" />
          ) : (
            <Square className="w-6 h-6 text-slate-400 shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-700">
            {allSelected ? "Ponisti sve" : "Odaberi sve"} ({selectedItemIndices.size}/{selectedPOData.items.length})
          </span>
        </button>

        {/* Item list with checkboxes */}
        <div className="space-y-2">
          {selectedPOData.items.map((item, idx) => {
            const isSelected = selectedItemIndices.has(idx);
            return (
              <button
                key={idx}
                onClick={() => toggleItem(idx)}
                className={cn(
                  "w-full flex items-center gap-3 bg-white border-2 rounded-xl px-4 py-4 text-left transition-all active:scale-[0.98]",
                  isSelected ? "border-blue-500 bg-blue-50/30" : "border-slate-200"
                )}
              >
                {isSelected ? (
                  <CheckSquare className="w-6 h-6 text-blue-600 shrink-0" />
                ) : (
                  <Square className="w-6 h-6 text-slate-300 shrink-0" />
                )}
                <div className="flex-1">
                  <p className={cn("text-base font-semibold", isSelected ? "text-slate-800" : "text-slate-500")}>
                    {item.item_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.quantity} {item.unit}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Confirm selection */}
        <button
          onClick={confirmItemSelection}
          disabled={selectedItemIndices.size === 0}
          className={cn(
            "w-full touch-target rounded-xl p-4 text-center font-bold text-lg transition-colors",
            selectedItemIndices.size > 0
              ? "bg-blue-600 text-white active:bg-blue-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          )}
        >
          Nastavi s {selectedItemIndices.size} artikal{selectedItemIndices.size === 1 ? "om" : "a"}
          <ChevronRight className="w-5 h-5 inline ml-1" />
        </button>
      </div>
    );
  }

  // Step 3: Record Line Items one by one
  if (receivingStep === 3 && receivingItems.length > 0 && currentItem) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setReceivingStep(2)} className="flex items-center gap-1 text-blue-600 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Nazad
          </button>
          <span className="text-sm text-slate-500 font-medium">
            Artikal {currentItemIndex + 1} / {receivingItems.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${((currentItemIndex + 1) / receivingItems.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{currentItem.item_name}</h3>
            <p className="text-sm text-slate-500 mt-1">
              Naruceno: <span className="font-semibold text-slate-700">{currentItem.expected_qty} {currentItem.unit}</span>
            </p>
          </div>

          {/* Received qty */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Primljena kolicina ({currentItem.unit})</label>
            <input
              type="number"
              inputMode="decimal"
              value={currentItem.received_qty}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                updateReceivingItem(currentItemIndex, { ...currentItem, received_qty: val });
              }}
              className={cn(
                "w-full touch-target text-2xl font-bold text-center rounded-xl border-2 p-4 focus:outline-none transition-colors",
                currentItem.received_qty !== currentItem.expected_qty
                  ? "border-amber-400 bg-amber-50 text-amber-800 focus:border-amber-500"
                  : "border-slate-200 bg-white text-slate-800 focus:border-blue-500"
              )}
            />
            {currentItem.received_qty !== currentItem.expected_qty && (
              <p className="text-sm text-amber-600 mt-1 font-medium">
                Razlika: {(currentItem.received_qty - currentItem.expected_qty).toFixed(1)} {currentItem.unit}
              </p>
            )}
          </div>

          {/* Quality check */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Kvaliteta</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateReceivingItem(currentItemIndex, { ...currentItem, quality_ok: true, quality_notes: undefined })}
                className={cn(
                  "touch-target rounded-xl p-4 text-center border-2 font-semibold transition-all",
                  currentItem.quality_ok
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-500"
                )}
              >
                <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                OK
              </button>
              <button
                onClick={() => updateReceivingItem(currentItemIndex, { ...currentItem, quality_ok: false })}
                className={cn(
                  "touch-target rounded-xl p-4 text-center border-2 font-semibold transition-all",
                  !currentItem.quality_ok
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-slate-200 bg-white text-slate-500"
                )}
              >
                <AlertTriangle className="w-6 h-6 mx-auto mb-1" />
                Problem
              </button>
            </div>
          </div>

          {/* Quality notes (if issue) */}
          {!currentItem.quality_ok && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Opis problema</label>
              <textarea
                value={currentItem.quality_notes || ""}
                onChange={(e) => updateReceivingItem(currentItemIndex, { ...currentItem, quality_notes: e.target.value })}
                placeholder="Opisite problem..."
                className="w-full rounded-xl border-2 border-red-300 p-3 text-sm bg-white focus:outline-none focus:border-red-500 min-h-[80px]"
              />
              <button className="mt-2 flex items-center gap-2 bg-slate-100 border border-slate-300 rounded-lg px-4 py-2 text-sm text-slate-600 active:bg-slate-200">
                <Camera className="w-4 h-4" /> Fotografiraj
              </button>
            </div>
          )}

          {/* Temperature (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Temperatura (&deg;C) — opciono</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={currentItem.temperature_c ?? ""}
              onChange={(e) => {
                const val = e.target.value ? parseFloat(e.target.value) : undefined;
                updateReceivingItem(currentItemIndex, { ...currentItem, temperature_c: val });
              }}
              placeholder="—"
              className="w-full touch-target text-xl font-bold text-center rounded-xl border-2 border-slate-200 p-3 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {currentItemIndex > 0 && (
            <button
              onClick={() => setCurrentItemIndex(currentItemIndex - 1)}
              className="flex-1 touch-target bg-white border-2 border-slate-200 rounded-xl p-3 text-center font-semibold text-slate-600 active:bg-slate-100"
            >
              <ChevronLeft className="w-5 h-5 inline mr-1" /> Prethodni
            </button>
          )}
          {currentItemIndex < receivingItems.length - 1 ? (
            <button
              onClick={() => setCurrentItemIndex(currentItemIndex + 1)}
              className="flex-1 touch-target bg-blue-600 rounded-xl p-3 text-center font-semibold text-white active:bg-blue-700"
            >
              Sljedeci artikal <ChevronRight className="w-5 h-5 inline ml-1" />
            </button>
          ) : (
            <button
              onClick={() => setReceivingStep(4)}
              className="flex-1 touch-target bg-blue-600 rounded-xl p-3 text-center font-semibold text-white active:bg-blue-700"
            >
              Pregled <ChevronRight className="w-5 h-5 inline ml-1" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step 4: Summary & Review
  if (receivingStep === 4) {
    const discrepancies = receivingItems.filter((i) => i.received_qty !== i.expected_qty || !i.quality_ok);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setReceivingStep(3)} className="flex items-center gap-1 text-blue-600 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Uredi stavke
          </button>
          <h2 className="text-xl font-bold text-slate-800">Pregled prijema</h2>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-sm text-blue-600 font-semibold">{receivingPO}</span>
            <span className="text-sm text-slate-500">{selectedPOData?.vendor_name}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {receivingItems.map((item, idx) => {
              const hasIssue = item.received_qty !== item.expected_qty || !item.quality_ok;
              return (
                <div
                  key={idx}
                  onClick={() => { setCurrentItemIndex(idx); setReceivingStep(3); }}
                  className={cn(
                    "py-3 flex items-center justify-between cursor-pointer",
                    hasIssue && "bg-amber-50 -mx-4 px-4 rounded-lg"
                  )}
                >
                  <div>
                    <p className={cn("text-sm font-medium", hasIssue ? "text-amber-800" : "text-slate-800")}>
                      {item.item_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.received_qty} / {item.expected_qty} {item.unit}
                      {item.temperature_c !== undefined && ` | ${item.temperature_c}\u00B0C`}
                    </p>
                  </div>
                  <div>
                    {!item.quality_ok && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> Problem
                      </span>
                    )}
                    {item.quality_ok && item.received_qty === item.expected_qty && (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                    {item.quality_ok && item.received_qty !== item.expected_qty && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                        Razlika
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {discrepancies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-700 mb-1">
              {discrepancies.length} nepodudarnost{discrepancies.length > 1 ? "i" : ""}
            </p>
            <p className="text-xs text-amber-600">Dodirnite stavku da biste je uredili.</p>
          </div>
        )}

        {/* Driver name & submit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Ime vozaca (opciono)</label>
            <input
              type="text"
              value={receivingDriverName}
              onChange={(e) => setReceivingDriverName(e.target.value)}
              placeholder="Upisite ime..."
              className="w-full touch-target rounded-xl border-2 border-slate-200 p-3 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="w-full touch-target bg-emerald-600 rounded-xl p-4 text-center font-bold text-white text-lg active:bg-emerald-700 transition-colors"
        >
          Potvrdi prijem
        </button>
      </div>
    );
  }

  // Submitted success
  if (submitted) {
    return (
      <div className="text-center pt-16 space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Prijem zabiljezen</h2>
        <p className="text-slate-500 font-mono">{receivingPO}</p>
        <button
          onClick={() => { resetReceiving(); setSubmitted(false); }}
          className="touch-target bg-blue-600 rounded-xl px-8 py-3 text-white font-semibold active:bg-blue-700"
        >
          Novi prijem
        </button>
      </div>
    );
  }

  // Fallback
  return (
    <div className="text-center pt-16">
      <p className="text-slate-500">Nema podataka. Kliknite nazad.</p>
      <button onClick={() => setReceivingStep(1)} className="mt-4 text-blue-600 underline">
        Nazad na dostave
      </button>
    </div>
  );
}
