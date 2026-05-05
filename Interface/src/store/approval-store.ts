import { create } from "zustand";
import type { ApprovalItem, ApprovalRequest } from "@/types/approval";
import type { POLineItem } from "@/types";
import type { DataService } from "@/services/data-service";
import { submitApproval } from "@/services/approval-service";

type ErrorMap = Record<string, string>;

interface RemovedEntry {
  item: ApprovalItem;
  index: number;
}

export interface EditState {
  // Snapshot of the original items at the moment edit mode was opened —
  // remains stable across polling refreshes so the diff is consistent.
  originalItems: POLineItem[];
  // Current edited items (may include unchanged ones).
  editedItems: POLineItem[];
  // True once modifyPurchaseOrder() has succeeded for this card; further
  // Save & Approve clicks should skip the modify step and just retry approve.
  modifyCommitted: boolean;
}

interface SubmitEditAndApproveArgs {
  payload: ApprovalRequest;
  modifiedItems: POLineItem[];
  originalItems: POLineItem[];
  modifiedBy: string;
  dataService: DataService;
}

interface ApprovalStore {
  items: ApprovalItem[];
  optimisticallyRemoved: Record<string, RemovedEntry>;
  inFlight: Set<string>;
  errors: ErrorMap;
  editStates: Record<string, EditState>;
  lastRefresh: number | null;

  setItems: (items: ApprovalItem[]) => void;
  clearError: (recordId: string) => void;
  submit: (payload: ApprovalRequest) => Promise<boolean>;

  startEdit: (recordId: string, originalItems: POLineItem[]) => void;
  cancelEdit: (recordId: string) => void;
  updateEditedQuantity: (recordId: string, itemIndex: number, quantity: number) => void;
  submitEditAndApprove: (args: SubmitEditAndApproveArgs) => Promise<boolean>;
}

function keyOf(item: Pick<ApprovalItem, "record_id">): string {
  return item.record_id;
}

function omitKey<V>(map: Record<string, V>, key: string): Record<string, V> {
  if (!(key in map)) return map;
  const next: Record<string, V> = {};
  for (const k of Object.keys(map)) {
    if (k !== key) next[k] = map[k];
  }
  return next;
}

function withoutKey(set: Set<string>, key: string): Set<string> {
  if (!set.has(key)) return set;
  const next = new Set(set);
  next.delete(key);
  return next;
}

function withKey(set: Set<string>, key: string): Set<string> {
  if (set.has(key)) return set;
  const next = new Set(set);
  next.add(key);
  return next;
}

function insertAt(items: ApprovalItem[], index: number, item: ApprovalItem): ApprovalItem[] {
  const clamped = Math.max(0, Math.min(index, items.length));
  return [...items.slice(0, clamped), item, ...items.slice(clamped)];
}

function cloneItems(items: ReadonlyArray<POLineItem>): POLineItem[] {
  return items.map((item) => ({ ...item }));
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  items: [],
  optimisticallyRemoved: {},
  inFlight: new Set<string>(),
  errors: {},
  editStates: {},
  lastRefresh: null,

  setItems: (incoming) => {
    const { optimisticallyRemoved, inFlight, editStates } = get();
    const filtered = incoming.filter(
      (item) => !optimisticallyRemoved[keyOf(item)] && !inFlight.has(keyOf(item))
    );
    // Preserve edit state only for items that are still in the queue. Drop edit
    // state for any record that has left the list (approved, rejected, or no
    // longer pending) so it does not leak across queue refreshes.
    const presentKeys = new Set(filtered.map(keyOf));
    const nextEdit: Record<string, EditState> = {};
    for (const k of Object.keys(editStates)) {
      if (presentKeys.has(k)) nextEdit[k] = editStates[k];
    }
    set({ items: filtered, editStates: nextEdit, lastRefresh: Date.now() });
  },

  clearError: (recordId) => {
    set((state) => ({ errors: omitKey(state.errors, recordId) }));
  },

  startEdit: (recordId, originalItems) => {
    set((s) => ({
      editStates: {
        ...s.editStates,
        [recordId]: {
          originalItems: cloneItems(originalItems),
          editedItems: cloneItems(originalItems),
          modifyCommitted: false,
        },
      },
      errors: omitKey(s.errors, recordId),
    }));
  },

  cancelEdit: (recordId) => {
    set((s) => ({
      editStates: omitKey(s.editStates, recordId),
      errors: omitKey(s.errors, recordId),
    }));
  },

  updateEditedQuantity: (recordId, itemIndex, quantity) => {
    set((s) => {
      const current = s.editStates[recordId];
      if (!current) return s;
      const nextItems = current.editedItems.map((item, i) =>
        i === itemIndex ? { ...item, quantity } : item
      );
      return {
        editStates: {
          ...s.editStates,
          [recordId]: { ...current, editedItems: nextItems },
        },
      };
    });
  },

  submit: async (payload) => {
    const key = payload.record_id;
    const state = get();

    if (state.inFlight.has(key)) return false;

    const existingIndex = state.items.findIndex((item) => item.record_id === key);
    if (existingIndex === -1) return false;
    const existing = state.items[existingIndex];

    set((s) => ({
      items: s.items.filter((item) => item.record_id !== key),
      optimisticallyRemoved: {
        ...s.optimisticallyRemoved,
        [key]: { item: existing, index: existingIndex },
      },
      inFlight: withKey(s.inFlight, key),
      errors: omitKey(s.errors, key),
    }));

    const response = await submitApproval(payload);

    if (response.success) {
      set((s) => ({
        inFlight: withoutKey(s.inFlight, key),
        editStates: omitKey(s.editStates, key),
      }));
      return true;
    }

    set((s) => {
      const already = s.items.some((item) => item.record_id === key);
      const removed = s.optimisticallyRemoved[key];
      const restoreIndex = removed?.index ?? 0;
      return {
        items: already ? s.items : insertAt(s.items, restoreIndex, existing),
        optimisticallyRemoved: omitKey(s.optimisticallyRemoved, key),
        inFlight: withoutKey(s.inFlight, key),
        errors: {
          ...s.errors,
          [key]: response.error ?? response.message ?? "Approval failed",
        },
      };
    });
    return false;
  },

  submitEditAndApprove: async ({
    payload,
    modifiedItems,
    originalItems,
    modifiedBy,
    dataService,
  }) => {
    const key = payload.record_id;
    const state = get();

    if (state.inFlight.has(key)) return false;
    const existingIndex = state.items.findIndex((item) => item.record_id === key);
    if (existingIndex === -1) return false;
    const existing = state.items[existingIndex];
    const editState = state.editStates[key];

    set((s) => ({
      inFlight: withKey(s.inFlight, key),
      errors: omitKey(s.errors, key),
    }));

    // Step 1 — modify, unless a previous attempt already committed it.
    let diffSummary: string | undefined;
    const alreadyModified = editState?.modifyCommitted === true;

    if (!alreadyModified) {
      const modifyResult = await dataService.modifyPurchaseOrder({
        po_number: payload.reference_id,
        record_id: payload.record_id,
        modified_items: modifiedItems,
        original_items: originalItems,
        modified_by: modifiedBy,
      });

      if (!modifyResult.success) {
        set((s) => ({
          inFlight: withoutKey(s.inFlight, key),
          errors: {
            ...s.errors,
            [key]: modifyResult.error ?? "Modify failed",
          },
        }));
        return false;
      }
      diffSummary = modifyResult.diff_summary;

      set((s) => ({
        editStates: {
          ...s.editStates,
          [key]: {
            originalItems: editState?.originalItems ?? cloneItems(originalItems),
            editedItems: editState?.editedItems ?? cloneItems(modifiedItems),
            modifyCommitted: true,
          },
        },
      }));
    } else {
      // Reuse the previously-built notes from the original modify call.
      diffSummary = payload.notes;
    }

    // Step 2 — fire the approval webhook with the diff summary as notes.
    set((s) => ({
      items: s.items.filter((item) => item.record_id !== key),
      optimisticallyRemoved: {
        ...s.optimisticallyRemoved,
        [key]: { item: existing, index: existingIndex },
      },
    }));

    const response = await submitApproval({ ...payload, notes: diffSummary });

    if (response.success) {
      set((s) => ({
        inFlight: withoutKey(s.inFlight, key),
        editStates: omitKey(s.editStates, key),
      }));
      return true;
    }

    set((s) => {
      const already = s.items.some((item) => item.record_id === key);
      const removed = s.optimisticallyRemoved[key];
      const restoreIndex = removed?.index ?? 0;
      return {
        items: already ? s.items : insertAt(s.items, restoreIndex, existing),
        optimisticallyRemoved: omitKey(s.optimisticallyRemoved, key),
        inFlight: withoutKey(s.inFlight, key),
        errors: {
          ...s.errors,
          [key]:
            "Količine spremljene. Odobrenje nije prošlo — pokušajte ponovo. " +
            (response.error ?? response.message ?? ""),
        },
      };
    });
    return false;
  },
}));
