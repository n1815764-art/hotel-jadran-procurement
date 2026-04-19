import { create } from "zustand";
import type { ApprovalItem, ApprovalRequest } from "@/types/approval";
import { submitApproval } from "@/services/approval-service";

type PendingMap = Record<string, boolean>;
type ErrorMap = Record<string, string>;

interface ApprovalStore {
  items: ApprovalItem[];
  optimisticallyRemoved: Record<string, ApprovalItem>;
  pending: PendingMap;
  errors: ErrorMap;
  lastRefresh: number | null;

  setItems: (items: ApprovalItem[]) => void;
  clearError: (recordId: string) => void;
  submit: (payload: ApprovalRequest) => Promise<boolean>;
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

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  items: [],
  optimisticallyRemoved: {},
  pending: {},
  errors: {},
  lastRefresh: null,

  setItems: (items) => {
    const { optimisticallyRemoved } = get();
    const filtered = items.filter((item) => !optimisticallyRemoved[keyOf(item)]);
    set({ items: filtered, lastRefresh: Date.now() });
  },

  clearError: (recordId) => {
    set((state) => ({ errors: omitKey(state.errors, recordId) }));
  },

  submit: async (payload) => {
    const key = payload.record_id;
    const existing = get().items.find((item) => item.record_id === key);
    if (!existing) return false;

    set((state) => ({
      items: state.items.filter((item) => item.record_id !== key),
      optimisticallyRemoved: { ...state.optimisticallyRemoved, [key]: existing },
      pending: { ...state.pending, [key]: true },
      errors: omitKey(state.errors, key),
    }));

    const response = await submitApproval(payload);

    if (response.success) {
      set((state) => ({
        pending: omitKey(state.pending, key),
      }));
      return true;
    }

    set((state) => {
      const already = state.items.some((item) => item.record_id === key);
      return {
        items: already ? state.items : [existing, ...state.items],
        optimisticallyRemoved: omitKey(state.optimisticallyRemoved, key),
        pending: omitKey(state.pending, key),
        errors: {
          ...state.errors,
          [key]: response.error ?? response.message ?? "Approval failed",
        },
      };
    });
    return false;
  },
}));
