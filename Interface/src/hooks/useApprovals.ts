"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DataService } from "@/services/data-service";
import { fetchPendingApprovals } from "@/services/data-service-extensions";
import { useApprovalStore } from "@/store/approval-store";

const POLL_INTERVAL_MS = 30_000;

export interface UseApprovalsResult {
  items: ReturnType<typeof useApprovalStore.getState>["items"];
  pending: ReturnType<typeof useApprovalStore.getState>["pending"];
  errors: ReturnType<typeof useApprovalStore.getState>["errors"];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearError: (recordId: string) => void;
}

export function useApprovals(dataService: DataService): UseApprovalsResult {
  const items = useApprovalStore((s) => s.items);
  const pending = useApprovalStore((s) => s.pending);
  const errors = useApprovalStore((s) => s.errors);
  const setItems = useApprovalStore((s) => s.setItems);
  const clearError = useApprovalStore((s) => s.clearError);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchPendingApprovals(dataService);
      if (!mountedRef.current) return;
      setItems(next);
      setError(null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load approvals");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [dataService, setItems]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  return { items, pending, errors, loading, error, refresh, clearError };
}
