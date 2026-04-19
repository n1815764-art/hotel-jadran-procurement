export type ApprovalType = "po" | "batch";
export type ApprovalAction = "approve" | "reject";

export interface ApprovalItem {
  type: ApprovalType;
  record_id: string;
  reference_id: string;
  vendor_name: string;
  total_amount: number;
  department?: string;
  created_date: string;
  ai_note: string;
  invoice_count?: number;
  due_date?: string;
}

export interface ApprovalRequest {
  type: ApprovalType;
  record_id: string;
  reference_id: string;
  action: ApprovalAction;
  approved_by: string;
  notes?: string;
}

export interface ApprovalResponse {
  success: boolean;
  type: ApprovalType;
  action: ApprovalAction;
  reference_id: string;
  approved_by: string;
  timestamp: string;
  message: string;
  error?: string;
}
