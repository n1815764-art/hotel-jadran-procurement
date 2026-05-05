# CLAUDE CODE PROMPT: PO Line Item Quantity Reduction at Approval Stage

## Context

The Command Center's `ApprovalCard` for POs currently has two actions: Approve and Reject. Zoran needs a third path — **reduce specific line item quantities and then approve at the lower total**. This is the middle path between blanket approval and outright rejection.

When this matters:
- WF04 right-sized at requisition time, but new info arrived between requisition and PO creation (occupancy revised down, vendor mentioned a price hike, budget pressure mid-month)
- A line item is overspecified ("ordered 40 kg piletina, we only need 30 kg")
- Total is over the spend ceiling for the period and a small trim brings it back

## Architecture (non-negotiable)

The flow has two distinct steps, on two distinct service layers:

1. **`DataService.modifyPurchaseOrder(...)`** — handles the Airtable mutation. PATCHes the `PO_Log` record (`items_json` and `total_amount`) and writes a `PO_MODIFIED` entry to `Audit_Trail`. Lives on the `DataService` interface, implemented in both `SampleDataService` and the live Airtable service.

2. **`approval-service.ts`** stays webhook-only — no Airtable writes, no audit writes. Its job is firing `/webhook/command-center-approve` and nothing else. The BCS diff string from step 1 is passed into the standard approve payload's `notes` field so WF16 can include it downstream (vendor email, audit echo, etc.).

The orchestration of "modify, then approve" lives in the component (or a thin hook that wraps both calls) — never inside `approval-service.ts`.

If the modify step fails: abort, surface error, do not fire the approve webhook. If the approve step fails: the PO is in an awkward state (modified but not approved). Surface error and let the user retry approval — do **not** roll back the Airtable changes, since the user may want to retry with the already-modified record.

## What to build

### 1. `DataService.modifyPurchaseOrder()`

Add to the `DataService` interface:

```typescript
modifyPurchaseOrder(params: {
  po_number: string;
  record_id: string;
  modified_items: POLineItem[];
  original_items: POLineItem[];   // used to build the BCS diff string
  modified_by: string;
}): Promise<{ success: boolean; new_total: number; diff_summary: string; error?: string }>;
```

Implementation responsibilities:
- Compute `new_total` = sum of `qty × unit_price` for `modified_items`
- Compute `diff_summary` (BCS string) by comparing `modified_items` against `original_items` — only list items that actually changed (see Audit string format below)
- PATCH Airtable `PO_Log` record `record_id` with `{ items_json: JSON.stringify(modified_items), total_amount: new_total }`
- POST to Airtable `Audit_Trail`:
  - `event_type: "PO_MODIFIED"`
  - `actor: modified_by`
  - `reference_id: po_number`
  - `timestamp: now`
  - `details: diff_summary`
  - `amount: new_total`
- Return the computed `new_total` and `diff_summary` so the caller can pass `diff_summary` into the approve webhook's `notes` field

`SampleDataService` implementation: simulate by mutating the in-memory PO collection and pushing a row into the in-memory audit array. Return success after a small delay.

### 2. New audit event type — update ALL referenced sites

Adding `PO_MODIFIED` requires touching the `AuditEventType` union and every map keyed off it. The codebase has an exhaustive `never` check in `lib/alert-messages.ts` that will fail compilation if any one of these is missed:

- `AuditEventType` union (the type definition itself)
- All three event-type maps in `lib/alert-messages.ts`
- The `switch` statement in the same file (the one ending in `: never`)

Required values for the new event:
- Severity: `info` (an approver-initiated edit is informational, not an alert)
- Icon and label: pick the same icon used for `PO_APPROVED` but label it appropriately (e.g., "PO Modified" / "PO modificirana")
- Switch case: returns the `details` string from the audit record verbatim (don't synthesize — the diff string is already human-readable BCS)

Verify the project compiles cleanly after these edits before moving on.

### 3. Component — extend the PO `ApprovalCard`

Add an **"Edit Quantities"** button alongside Approve and Reject. Clicking it expands the card into edit mode showing all line items.

Edit mode layout — design it fresh, not copying from any other card:

A line items table with columns: Item Name (read-only, BCS), Quantity (editable number input), Unit (read-only), Unit Price (read-only, formatEUR), Subtotal (live-calculated, formatEUR).

Below the table, a summary block:
- Original total (struck through if changes have been made)
- Modified total (live-calculated, prominent — slightly larger or bolder than the original)
- Delta with sign (e.g., "−92,50 €" in green)

Two action buttons in edit mode:
- **Cancel** — discards changes, returns to default card view
- **Save & Approve** — calls `dataService.modifyPurchaseOrder(...)`, then on success calls the existing `approve()` from `approval-service.ts` with `notes` set to the returned `diff_summary`. Optimistically removes the card from the queue.

Hide the original Approve/Reject actions while edit mode is open. Users commit to one path or the other.

### 4. Validation rules (enforced in the component)

- Each quantity must be a positive number greater than 0. Empty or zero is invalid; if the reviewer wants to remove a line item entirely, that's Reject, not Edit.
- Each quantity must be **less than or equal to the original quantity**. This is reduction-only. Quantity increases require a new requisition because they invalidate WF04's reasoning.
- Disable "Save & Approve" if no quantities have changed, or if any quantity is invalid. Show inline red error text under the offending input.
- The Modified Total must remain greater than 0 (at least one line item must have a non-zero quantity).

### 5. State management

Per-item edit state lives in `approval-store.ts` (Zustand) so it survives the 30-second polling re-render cycle. Add fields per pending item: `editMode: boolean`, `editedItems: POLineItem[] | null`. When polling refreshes the queue, preserve `editMode` and `editedItems` for any item still in the list.

Reuse the existing `submitting` flag for the in-flight state during Save & Approve (covers both the modify call and the approve call). Same disabled-button pattern as the regular Approve/Reject path.

On full success: optimistic removal from the queue. On modify failure: clear `submitting`, keep edit mode open, surface error inline. On approve failure (modify already succeeded): clear `submitting`, keep edit mode open, surface error inline with retry guidance ("Quantities saved. Approval failed — retry?").

### 6. Audit / BCS diff string format

Built inside `modifyPurchaseOrder()` from the original vs modified comparison. Only list items that actually changed. Format:

> "PO modificirana prije odobrenja. Promjene: Pileća prsa 40 kg → 30 kg (−85,00 €); Krompir 20 kg → 15 kg (−7,50 €). Ukupno: 1.240,00 € → 1.147,50 € (−92,50 €)."

Every amount in this string must come from `formatEUR()` in `lib/utils.ts` — suffix `€`, `hr-HR` locale (dot for thousands, comma for decimals, € after the number with a non-breaking space). Do not hand-format any number.

The same `diff_summary` is what gets passed as `notes` into the approve webhook payload — WF16 will surface it in the audit echo and any downstream vendor-facing artifacts.

## Edge case (don't over-engineer)

If a PO's modified total drops below €500 (the auto-approve threshold), the original WF04 routing already decided this PO needs human approval — and Zoran is now providing it. Don't try to re-route or auto-approve based on the new total. Just complete the human approval against the modified amount.

## Out of scope

- Adding new line items at approval time
- Editing unit prices (price disputes go through three-way matching, not approval)
- Editing vendor or department
- Quantity edit on Payment Batch cards
- Quantity edit on the receiving tablet app
- Updating sample PO data (existing samples already have 3–6 line items — sufficient)

## Architectural consistency

- Dark theme, same border treatment and typography as the existing `ApprovalCard`
- Purple accent on any AI-reasoning block that's still visible in edit mode
- Every amount string goes through `formatEUR` from `lib/utils.ts` (suffix `€`, hr-HR formatting)
- BCS for data fields and the diff string; English for UI chrome (button labels, validation errors)
- Optimistic update with rollback on the approve step
- No new npm dependencies
