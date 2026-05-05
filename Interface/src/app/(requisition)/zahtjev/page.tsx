"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Loader2,
  ChevronRight,
  Send,
  Package,
  Plus,
  X,
} from "lucide-react";
import { getDataService } from "@/services/sample-data-service";
import { STAFF, DEPARTMENTS } from "@/lib/constants";
import { cn, formatEUR } from "@/lib/utils";
import type { InventoryItem } from "@/types";
import type { AutoReorderStatus, DepartmentBudget } from "@/services/data-service";

type Urgency = "standard" | "urgent" | "very_urgent";

interface Suggestion {
  suggested_quantity: number;
  reasoning: string;
}

interface Submitted {
  requisition_id: string;
  item_name: string;
  quantity: number;
  unit: string;
}

const STAFF_STORAGE_KEY = "zahtjev.staff";
const DEPT_STORAGE_KEY = "zahtjev.department";

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function generateRequisitionId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `REQ-${year}-${rand}`;
}

function formatLocalDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function ZahtjevPage() {
  const dataService = getDataService();

  // Staff / department
  const [staff, setStaff] = useState<string>("");
  const [department, setDepartment] = useState<string>("");

  // Item picker
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState("");
  const [itemMode, setItemMode] = useState<"picker" | "freetext">("picker");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [freeTextName, setFreeTextName] = useState("");
  const [freeTextUnit, setFreeTextUnit] = useState("kom");

  // Smart block state
  const [autoStatus, setAutoStatus] = useState<AutoReorderStatus | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);
  const [continuingAfterCovered, setContinuingAfterCovered] = useState(false);
  const [thanksScreen, setThanksScreen] = useState(false);

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const [budget, setBudget] = useState<DepartmentBudget | null>(null);

  // Quantity / urgency / justification
  const [quantity, setQuantity] = useState<number | "">("");
  const [urgency, setUrgency] = useState<Urgency>("standard");
  const [justification, setJustification] = useState("");

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  // Validation
  const [showValidation, setShowValidation] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const s = window.localStorage.getItem(STAFF_STORAGE_KEY);
    const d = window.localStorage.getItem(DEPT_STORAGE_KEY);
    if (s) setStaff(s);
    if (d) setDepartment(d);
  }, []);

  // Load inventory on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await dataService.getInventory();
        if (!cancelled) setInventory(items);
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  // Load department budget when department is set
  useEffect(() => {
    if (!department) return;
    let cancelled = false;
    (async () => {
      try {
        const b = await dataService.getDepartmentBudget(department);
        if (!cancelled) setBudget(b);
      } catch {
        if (!cancelled) setBudget(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataService, department]);

  // Persist staff / department to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (staff) window.localStorage.setItem(STAFF_STORAGE_KEY, staff);
    if (department) window.localStorage.setItem(DEPT_STORAGE_KEY, department);
  }, [staff, department]);

  const handleStaffChange = useCallback((name: string) => {
    setStaff(name);
    const member = STAFF.find((m) => m.name === name);
    if (member) setDepartment(member.department);
  }, []);

  const filteredItems = useMemo(() => {
    if (itemMode !== "picker") return [];
    const q = normalize(itemSearch);
    if (!q) return inventory.slice(0, 10);
    return inventory
      .filter(
        (item) =>
          normalize(item.item_name).includes(q) ||
          normalize(item.category).includes(q) ||
          normalize(item.warehouse).includes(q)
      )
      .slice(0, 12);
  }, [inventory, itemSearch, itemMode]);

  const itemLockedIn =
    (itemMode === "picker" && selectedItem) ||
    (itemMode === "freetext" && freeTextName.trim().length > 0);

  const effectiveItem = itemMode === "picker" ? selectedItem : null;
  const effectiveItemName = itemMode === "picker" ? selectedItem?.item_name ?? "" : freeTextName.trim();
  const effectiveUnit = itemMode === "picker" ? selectedItem?.unit_of_measure ?? "" : freeTextUnit;
  const effectiveUnitCost = itemMode === "picker" ? selectedItem?.unit_cost ?? 0 : 0;

  // When an inventory item is locked in, fetch auto-reorder status + AI suggestion
  useEffect(() => {
    if (itemMode !== "picker" || !selectedItem) {
      setAutoStatus(null);
      setSuggestion(null);
      setContinuingAfterCovered(false);
      return;
    }
    let cancelled = false;
    setAutoLoading(true);
    setSuggestionLoading(true);

    (async () => {
      try {
        const status = await dataService.checkAutoReorderStatus(selectedItem.item_id);
        if (!cancelled) setAutoStatus(status);
      } catch {
        if (!cancelled) setAutoStatus({ covered: false });
      } finally {
        if (!cancelled) setAutoLoading(false);
      }
    })();

    (async () => {
      try {
        const res = await fetch("/api/suggest-quantity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: selectedItem.item_id,
            item_name: selectedItem.item_name,
            department: department || selectedItem.department,
            current_stock: selectedItem.current_stock,
            par_level: selectedItem.par_level,
            unit: selectedItem.unit_of_measure,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) {
          if (!cancelled) setSuggestion(null);
          return;
        }
        const data = (await res.json()) as Suggestion;
        if (!cancelled && typeof data.suggested_quantity === "number") {
          setSuggestion(data);
        }
      } catch {
        if (!cancelled) setSuggestion(null);
      } finally {
        if (!cancelled) setSuggestionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataService, itemMode, selectedItem, department]);

  // Derived budget impact for the line
  const lineCost = useMemo(() => {
    if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) return 0;
    return quantity * effectiveUnitCost;
  }, [quantity, effectiveUnitCost]);

  const budgetImpact = useMemo(() => {
    if (!budget || budget.remaining <= 0 || lineCost <= 0) return null;
    const pct = (lineCost / budget.remaining) * 100;
    let tone: "ok" | "warn" | "danger" = "ok";
    if (pct >= 80) tone = "danger";
    else if (pct >= 50) tone = "warn";
    return { pct, tone };
  }, [budget, lineCost]);

  const justificationRequired =
    urgency === "very_urgent" ||
    (suggestion !== null &&
      typeof quantity === "number" &&
      quantity > suggestion.suggested_quantity * 1.5);

  const validationErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!staff) errs.staff = "Odaberite ime";
    if (!department) errs.department = "Odaberite odjel";
    if (!itemLockedIn) errs.item = "Odaberite artikal";
    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      errs.quantity = "Unesite količinu veću od 0";
    } else {
      const decimals = String(quantity).split(".")[1]?.length ?? 0;
      if (decimals > 4) errs.quantity = "Najviše 4 decimale";
    }
    if (justificationRequired && justification.trim().length === 0) {
      errs.justification = "Obrazloženje je obavezno";
    }
    return errs;
  }, [staff, department, itemLockedIn, quantity, justification, justificationRequired]);

  const handleAcceptSuggestion = () => {
    if (!suggestion) return;
    setQuantity(suggestion.suggested_quantity);
  };

  const handleAcceptItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setItemSearch(item.item_name);
    setQuantity("");
    setContinuingAfterCovered(false);
    setThanksScreen(false);
  };

  const handleSwitchToFreeText = () => {
    setItemMode("freetext");
    setSelectedItem(null);
    setItemSearch("");
    setAutoStatus(null);
    setSuggestion(null);
  };

  const handleSwitchToPicker = () => {
    setItemMode("picker");
    setFreeTextName("");
  };

  const handleNotNeeded = () => {
    setThanksScreen(true);
  };

  const resetForAnother = () => {
    setSelectedItem(null);
    setItemSearch("");
    setItemMode("picker");
    setFreeTextName("");
    setQuantity("");
    setUrgency("standard");
    setJustification("");
    setAutoStatus(null);
    setSuggestion(null);
    setContinuingAfterCovered(false);
    setThanksScreen(false);
    setSubmitted(null);
    setSubmitError(null);
    setShowValidation(false);
  };

  const handleSubmit = async () => {
    setShowValidation(true);
    if (Object.keys(validationErrors).length > 0) return;

    const reqId = generateRequisitionId();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await dataService.submitRequisition({
        requisition_id: reqId,
        department,
        item_name: effectiveItemName,
        item_id: effectiveItem?.item_id,
        quantity_requested: quantity as number,
        unit: effectiveUnit,
        urgency,
        requester: staff,
        justification: justification.trim() || undefined,
        ai_suggested_quantity: suggestion?.suggested_quantity,
        ai_suggestion_accepted:
          suggestion !== null &&
          typeof quantity === "number" &&
          Math.abs(quantity - suggestion.suggested_quantity) < 0.0001,
      });

      setSubmitted({
        requisition_id: result.requisition_id,
        item_name: effectiveItemName,
        quantity: quantity as number,
        unit: effectiveUnit,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Slanje nije uspjelo");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation screen
  if (submitted) {
    return (
      <div className="space-y-6 pt-8">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-100">Zahtjev poslan</h2>
          <p className="mono text-sm text-zinc-300">{submitted.requisition_id}</p>
          <p className="text-base text-zinc-200">
            {submitted.item_name} — {submitted.quantity} {submitted.unit}
          </p>
          <p className="text-xs text-zinc-400 leading-relaxed pt-2 max-w-sm mx-auto">
            Sistem provjerava zahtjev — odluka će biti objavljena u Slacku (obično pod 30 sekundi).
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={resetForAnother}
            className="touch-target rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 transition-colors"
          >
            Pošalji još jedan zahtjev
          </button>
          <a
            href="/prijem"
            className="touch-target rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-4 text-center transition-colors flex items-center justify-center"
          >
            Završi
          </a>
        </div>
      </div>
    );
  }

  // ── "Nije potrebno, hvala" thanks screen
  if (thanksScreen) {
    return (
      <div className="space-y-6 pt-8">
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-6 text-center space-y-3">
          <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
          <h2 className="text-xl font-bold text-zinc-100">Sve je u redu, sistem to već radi</h2>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Nije potrebna nikakva akcija. Hvala što ste provjerili.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={resetForAnother}
            className="touch-target rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold py-4 transition-colors"
          >
            Novi zahtjev
          </button>
          <a
            href="/prijem"
            className="touch-target rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-4 text-center transition-colors flex items-center justify-center"
          >
            Završi
          </a>
        </div>
      </div>
    );
  }

  // ── Section visibility (progressive reveal)
  const showSection2 = !!staff && !!department;
  const showSection3 = showSection2 && itemLockedIn;
  const blockedByCoverage =
    showSection3 &&
    autoStatus?.covered === true &&
    !continuingAfterCovered &&
    itemMode === "picker";
  const showSection4 =
    showSection3 && !blockedByCoverage && typeof quantity === "number" && quantity > 0;
  const showSection5 = showSection4;

  return (
    <div className="space-y-6 py-4">
      {/* SECTION 1 — Tko šalje */}
      <Section number={1} title="Tko šalje zahtjev">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Ime" error={showValidation ? validationErrors.staff : undefined}>
            <select
              value={staff}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="w-full touch-target bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-violet-500"
            >
              <option value="">— Odaberite —</option>
              {STAFF.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} · {m.department}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Odjel" error={showValidation ? validationErrors.department : undefined}>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full touch-target bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-violet-500"
            >
              <option value="">— Odaberite —</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* SECTION 2 — Što treba */}
      {showSection2 && (
        <Section number={2} title="Što treba">
          {itemMode === "picker" ? (
            <div className="space-y-3">
              <Field label="Pretraga artikla" error={showValidation ? validationErrors.item : undefined}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => {
                      setItemSearch(e.target.value);
                      setSelectedItem(null);
                      setQuantity("");
                    }}
                    placeholder="npr. pileća prsa, krompir, salveta…"
                    className="w-full touch-target bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-base focus:outline-none focus:border-violet-500"
                  />
                </div>
              </Field>

              {!selectedItem && itemSearch && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
                  {inventoryLoading && (
                    <div className="p-4 text-sm text-zinc-400">Učitavanje…</div>
                  )}
                  {!inventoryLoading && filteredItems.length === 0 && (
                    <div className="p-4 text-sm text-zinc-400">Nema rezultata.</div>
                  )}
                  {filteredItems.map((item) => (
                    <button
                      key={item.item_id}
                      onClick={() => handleAcceptItem(item)}
                      className="w-full text-left px-4 py-3 hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-medium text-zinc-100 truncate">
                          {item.item_name}
                        </span>
                        <span className="text-xs text-zinc-500 mono shrink-0">
                          {item.current_stock} {item.unit_of_measure}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {item.warehouse} · {item.category}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedItem && (
                <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-base font-semibold text-zinc-100 truncate">
                      {selectedItem.item_name}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {selectedItem.warehouse} · stanje {selectedItem.current_stock}{" "}
                      {selectedItem.unit_of_measure} · par {selectedItem.par_level}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setItemSearch("");
                      setQuantity("");
                    }}
                    className="touch-target rounded-lg p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                    aria-label="Promijeni artikal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <button
                onClick={handleSwitchToFreeText}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
              >
                Artikal nije na listi? →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Novi artikal — zahtjev može trajati duže i može biti označen za pregled.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Field label="Naziv artikla" error={showValidation ? validationErrors.item : undefined}>
                    <input
                      type="text"
                      value={freeTextName}
                      onChange={(e) => setFreeTextName(e.target.value)}
                      placeholder="npr. specijalni začin za sushi"
                      className="w-full touch-target bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-violet-500"
                    />
                  </Field>
                </div>
                <Field label="Jedinica">
                  <input
                    type="text"
                    value={freeTextUnit}
                    onChange={(e) => setFreeTextUnit(e.target.value)}
                    placeholder="kom, kg, l…"
                    className="w-full touch-target bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-violet-500"
                  />
                </Field>
              </div>
              <button
                onClick={handleSwitchToPicker}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline transition-colors"
              >
                ← Natrag na listu artikala
              </button>
            </div>
          )}
        </Section>
      )}

      {/* SECTION 3 — Smart context block */}
      {showSection3 && (
        <Section number={3} title="Kontekst i preporuka">
          {/* 3a — auto-reorder pre-check */}
          {itemMode === "picker" && selectedItem && (
            <div>
              {autoLoading && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Provjera auto-narudžbe…
                </div>
              )}

              {!autoLoading && autoStatus?.covered && (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 min-w-0">
                      <p className="text-base font-semibold text-emerald-300">
                        Već u rasporedu
                      </p>
                      <p className="text-sm text-zinc-200 leading-relaxed">
                        {autoStatus.reasoning ||
                          "Auto-narudžba pokriva ovaj artikal."}
                      </p>
                      {autoStatus.scheduled_quantity != null && (
                        <p className="text-xs text-zinc-400">
                          Količina:{" "}
                          <span className="mono text-zinc-200">
                            {autoStatus.scheduled_quantity} {selectedItem.unit_of_measure}
                          </span>
                          {autoStatus.scheduled_date && (
                            <>
                              {" "}
                              · datum:{" "}
                              <span className="mono text-zinc-200">
                                {formatLocalDate(autoStatus.scheduled_date)}
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                  {!continuingAfterCovered && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setContinuingAfterCovered(true)}
                        className="touch-target rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-3 text-sm font-medium transition-colors"
                      >
                        Dodaj dodatnu količinu
                      </button>
                      <button
                        onClick={handleNotNeeded}
                        className="touch-target rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 text-sm font-semibold transition-colors"
                      >
                        Nije potrebno, hvala
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!autoLoading &&
                autoStatus &&
                autoStatus.covered === false &&
                selectedItem.current_stock <= selectedItem.reorder_point && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-zinc-200">
                      Stanje nisko ({selectedItem.current_stock}{" "}
                      {selectedItem.unit_of_measure}, ispod reorder točke), ali nije u
                      rasporedu auto-narudžbe. Vaš zahtjev će kreirati PO.
                    </p>
                  </div>
                )}

              {!autoLoading &&
                autoStatus &&
                autoStatus.covered === false &&
                selectedItem.current_stock > selectedItem.reorder_point && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <p className="text-sm text-zinc-300">
                      Trenutno stanje:{" "}
                      <span className="mono text-zinc-100">
                        {selectedItem.current_stock} {selectedItem.unit_of_measure}
                      </span>
                      . Par nivo:{" "}
                      <span className="mono text-zinc-100">
                        {selectedItem.par_level} {selectedItem.unit_of_measure}
                      </span>
                      .
                    </p>
                  </div>
                )}
            </div>
          )}

          {/* 3b + 3c grid (only when not blocked by coverage) */}
          {!blockedByCoverage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3">
              {/* 3b — AI suggestion */}
              <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-violet-300 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI preporuka
                </div>
                {suggestionLoading && (
                  <div className="text-sm text-zinc-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Računanje…
                  </div>
                )}
                {!suggestionLoading && suggestion && (
                  <>
                    <div className="text-2xl font-bold mono text-zinc-100">
                      {suggestion.suggested_quantity} {effectiveUnit}
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">
                      {suggestion.reasoning}
                    </p>
                    <button
                      onClick={handleAcceptSuggestion}
                      className="touch-target w-full rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Prihvati {suggestion.suggested_quantity} {effectiveUnit}
                    </button>
                  </>
                )}
                {!suggestionLoading && !suggestion && (
                  <p className="text-xs text-zinc-500">
                    Unesite količinu ručno ispod.
                  </p>
                )}

                <div className="pt-2 border-t border-zinc-800/60">
                  <Field label="Količina" error={showValidation ? validationErrors.quantity : undefined}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={quantity === "" ? "" : quantity}
                        onChange={(e) => {
                          const v = e.target.value;
                          setQuantity(v === "" ? "" : Number(v));
                        }}
                        className="flex-1 touch-target bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base mono focus:outline-none focus:border-violet-500"
                      />
                      <span className="mono text-sm text-zinc-400 px-2">{effectiveUnit || "kom"}</span>
                    </div>
                  </Field>
                </div>
              </div>

              {/* 3c — Budget context */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Budžet
                </p>

                {!budget && <p className="text-xs text-zinc-500">Učitavanje budžeta…</p>}

                {budget && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Cijena linije</span>
                      <span className="mono text-zinc-100 font-semibold">
                        {formatEUR(lineCost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Mjesečni budžet ({department})</span>
                      <span className="mono text-zinc-200">
                        {formatEUR(budget.monthly_budget)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">
                        Iskorišteno ({budget.pct_used.toFixed(0)}%)
                      </span>
                      <span className="mono text-zinc-200">
                        {formatEUR(budget.spent_mtd)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Ostalo</span>
                      <span className="mono text-zinc-100 font-semibold">
                        {formatEUR(budget.remaining)}
                      </span>
                    </div>
                    {budgetImpact && (
                      <div
                        className={cn(
                          "rounded-md px-3 py-2 mt-2 text-xs flex items-center justify-between border",
                          budgetImpact.tone === "ok" &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                          budgetImpact.tone === "warn" &&
                            "border-amber-500/30 bg-amber-500/10 text-amber-200",
                          budgetImpact.tone === "danger" &&
                            "border-red-500/30 bg-red-500/10 text-red-200"
                        )}
                      >
                        <span>Ova narudžba</span>
                        <span className="mono font-semibold">
                          {budgetImpact.pct.toFixed(1)}% preostalog budžeta
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* SECTION 4 — Hitnost i obrazloženje */}
      {showSection4 && (
        <Section number={4} title="Hitnost i obrazloženje">
          <div className="space-y-3">
            <Field label="Hitnost">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(
                  [
                    { value: "standard", label: "Standardno" },
                    { value: "urgent", label: "Hitno (48h)" },
                    { value: "very_urgent", label: "Vrlo hitno (24h)" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className={cn(
                      "touch-target rounded-xl px-4 py-3 text-sm font-medium border transition-colors",
                      urgency === opt.value
                        ? "border-violet-500 bg-violet-500/15 text-violet-200"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label={`Obrazloženje${justificationRequired ? " (obavezno)" : " (opciono)"}`}
              error={showValidation ? validationErrors.justification : undefined}
            >
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={justificationRequired ? 4 : 2}
                placeholder={
                  justificationRequired && suggestion && typeof quantity === "number" && quantity > suggestion.suggested_quantity * 1.5
                    ? "Količina znatno iznad preporuke — molimo objasnite."
                    : urgency === "very_urgent"
                    ? "Razlog vrlo hitnog zahtjeva."
                    : 'Opciono — npr. „za vjenčanje subota".'
                }
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-violet-500"
              />
            </Field>
          </div>
        </Section>
      )}

      {/* SECTION 5 — Submit */}
      {showSection5 && (
        <div className="space-y-3">
          {submitError && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {submitError}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              "w-full touch-target rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold py-5 text-lg transition-colors flex items-center justify-center gap-2"
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Slanje…
              </>
            ) : (
              <>
                <Send className="w-5 h-5" /> Pošalji zahtjev
              </>
            )}
          </button>
        </div>
      )}

      {!showSection2 && (
        <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-400">
          <Package className="w-5 h-5 text-zinc-500 mt-0.5" />
          <p>Odaberite ime i odjel da nastavite.</p>
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full border border-violet-500/40 bg-violet-500/15 text-violet-200 text-xs font-bold mono flex items-center justify-center">
          {number}
        </span>
        <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
        <ChevronRight className="w-4 h-4 text-zinc-700" />
      </div>
      {children}
    </section>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
    </div>
  );
}
