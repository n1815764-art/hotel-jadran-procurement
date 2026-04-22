import { create } from "zustand";
import type { ApprovalItem, ApprovalRequest } from "@/types/approval";
import { submitApproval } from "@/services/approval-service";

type ErrorMap = Record<string, string>;

interface RemovedEntry {
  item: ApprovalItem;
  index: number;
}

interface ApprovalStore {
  items: ApprovalItem[];
  optimisticallyRemoved: Record<string, RemovedEntry>;
  inFlight: Set<string>;
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

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  items: [],
  optimisticallyRemoved: {},
  inFlight: new Set<string>(),
  errors: {},
  lastRefresh: null,

  setItems: (incoming) => {
    const { optimisticallyRemoved, inFlight } = get();
    const filtered = incoming.filter(
      (item) => !optimisticallyRemoved[keyOf(item)] && !inFlight.has(keyOf(item))
    );
    set({ items: filtered, lastRefresh: Date.now() });
  },

  clearError: (recordId) => {
    set((state) => ({ errors: omitKey(state.errors, recordId) }));
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
      set((s) => ({ inFlight: withoutKey(s.inFlight, key) }));
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
}));
