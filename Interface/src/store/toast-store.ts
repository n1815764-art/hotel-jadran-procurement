import { create } from "zustand";

export type ToastSeverity = "critical" | "warning" | "approval" | "info";

export interface Toast {
  id: string;
  severity: ToastSeverity;
  title: string;
  message?: string;
  createdAt: number;
}

interface ToastStore {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id" | "createdAt"> & { ttlMs?: number }) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_TTL_MS = 6_000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  push: ({ ttlMs, ...toast }) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const entry: Toast = { id, createdAt: Date.now(), ...toast };
    set((state) => ({ toasts: [...state.toasts, entry] }));

    const lifetime = ttlMs ?? DEFAULT_TTL_MS;
    if (lifetime > 0) {
      const handle = setTimeout(() => get().dismiss(id), lifetime);
      timers.set(id, handle);
    }
    return id;
  },

  dismiss: (id) => {
    const handle = timers.get(id);
    if (handle) {
      clearTimeout(handle);
      timers.delete(id);
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clear: () => {
    for (const handle of timers.values()) clearTimeout(handle);
    timers.clear();
    set({ toasts: [] });
  },
}));
