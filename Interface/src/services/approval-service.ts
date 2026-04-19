import type { ApprovalRequest, ApprovalResponse } from "@/types/approval";

const WEBHOOK_PATH = "/webhook/command-center-approve";
const DEFAULT_TIMEOUT_MS = 10_000;

function getWebhookUrl(): string {
  const base = process.env.NEXT_PUBLIC_N8N_WEBHOOK_BASE;
  if (!base) {
    throw new Error("NEXT_PUBLIC_N8N_WEBHOOK_BASE is not configured");
  }
  return `${base.replace(/\/+$/, "")}${WEBHOOK_PATH}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

async function postOnce(
  url: string,
  payload: ApprovalRequest,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitApproval(
  payload: ApprovalRequest,
  opts?: { timeoutMs?: number }
): Promise<ApprovalResponse> {
  const url = getWebhookUrl();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await postOnce(url, payload, timeoutMs);

      if (res.status >= 500 && attempt === 0) {
        lastError = new Error(`Webhook returned ${res.status}`);
        continue;
      }

      const text = await res.text();
      let body: Partial<ApprovalResponse> = {};
      try {
        body = text ? (JSON.parse(text) as Partial<ApprovalResponse>) : {};
      } catch {
        body = {};
      }

      if (!res.ok) {
        return {
          success: false,
          type: payload.type,
          action: payload.action,
          reference_id: payload.reference_id,
          approved_by: payload.approved_by,
          timestamp: new Date().toISOString(),
          message: body.message ?? `Webhook returned ${res.status}`,
          error: body.error ?? `HTTP ${res.status}`,
        };
      }

      return {
        success: body.success ?? true,
        type: body.type ?? payload.type,
        action: body.action ?? payload.action,
        reference_id: body.reference_id ?? payload.reference_id,
        approved_by: body.approved_by ?? payload.approved_by,
        timestamp: body.timestamp ?? new Date().toISOString(),
        message: body.message ?? "Approval received",
      };
    } catch (error: unknown) {
      lastError = error;
      if (attempt === 1) break;
    }
  }

  return {
    success: false,
    type: payload.type,
    action: payload.action,
    reference_id: payload.reference_id,
    approved_by: payload.approved_by,
    timestamp: new Date().toISOString(),
    message: "Failed to reach approval webhook",
    error: getErrorMessage(lastError),
  };
}
