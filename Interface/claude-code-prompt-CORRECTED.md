# CLAUDE CODE PROMPT: Payment Batch Integration + Dashboard Fixes + AR Aging View

Three things to build/fix in the Command Center. They're grouped because they all touch the same architectural seams (the approval service, the dashboard layout, the DataService) and it's more efficient to do them together than sequentially.

The PO approval queue (WF16) and requisition review queue (WF17) are already built and working. This prompt wires up the **Payment Batch approval** through the existing approval system, fixes three known dashboard bugs, and adds a read-only AR Aging view for WF15's output.

---

## PART 1 — PAYMENT BATCH APPROVAL (wiring into the existing system)

### Context

WF14 (Payment Batch Staging) runs every Wednesday at 2 PM. It groups approved invoices into a weekly payment batch, writes a record to the `Payment_Batch` Airtable table with status `Pending Approval`, and posts a Slack message.

WF16 (Command Center Approval Handler) ALREADY handles batch approvals — it has `batch/approve` and `batch/reject` branches that are built and tested. The approval system frontend ALREADY supports batches architecturally — `types/approval.ts` defines `ApprovalType = 'po' | 'batch'`, `ApprovalQueue` has filter tabs for All / POs / Batches, and `approval-service.ts` sends `type: "batch"` to the same webhook.

**What's actually missing is small:**
1. The `getPaymentBatches()` method on the DataService (the queue can't fetch batch data without it)
2. A `PaymentBatchCard` component (batches need a different card layout than POs — they show an invoice rollup, not a single item)

**What is NOT needed (do not create):**
- ❌ No separate `payment-batch-service.ts` — the existing `approval-service.ts` already handles `type: "batch"`
- ❌ No separate `PaymentBatchQueue` component — the existing `ApprovalQueue` already filters by type
- ❌ No separate Zustand store — the existing `approval-store.ts` already handles batch items

### Webhook (already live — same as PO approvals)

**Endpoint:** `POST https://n181.app.n8n.cloud/webhook/command-center-approve`

**CRITICAL — use these exact field names (WF16's normalize code expects this shape):**

```json
{
  "type": "batch",
  "action": "approve",
  "reference_id": "BATCH-2026-W16",
  "record_id": "recXXXXXXXXXX",
  "approved_by": "Zoran Radonjić",
  "notes": ""
}
```

```json
{
  "type": "batch",
  "action": "reject",
  "reference_id": "BATCH-2026-W16",
  "record_id": "recXXXXXXXXXX",
  "approved_by": "Zoran Radonjić",
  "notes": "Vibacom faktura sporna — čekati razrješenje"
}
```

⚠️ `type` is lowercase `"batch"` not `"Batch"`. The field is `reference_id` not `batch_id`. These must be exact or WF16 will reject the payload.

### Airtable

**Table:** `Payment_Batch` (`tblKFEvMbOobm9Y9X`)

**Fields to read:**
- `batch_id` — formatted `BATCH-YYYY-WNN`
- `batch_date` — when the batch was created
- `due_date_cutoff` — last due date covered
- `total_amount` — EUR total
- `invoice_count` — number of invoices grouped
- `invoices_json` — JSON array of invoice summaries (parse for detail view)
- `status` — filter by `"Pending Approval"` for the queue
- `payment_method` — usually `"Bank Transfer"`
- `notes`

### What to build

**1. Add `getPaymentBatches()` to the DataService:**

```typescript
getPaymentBatches(filters?: { status?: string }): Promise<PaymentBatch[]>
```

Add the types (check if `types/approval.ts` already has `PaymentBatch` and `PaymentBatchInvoice` — it may, since the approval types were built with batch support in mind; if so, use those, don't duplicate):

```typescript
interface PaymentBatch {
  record_id: string;
  batch_id: string;
  batch_date: string;
  due_date_cutoff: string;
  total_amount: number;
  invoice_count: number;
  invoices: BatchInvoice[];      // parsed from invoices_json
  status: "Pending Approval" | "Approved" | "Rejected" | "Paid";
  payment_method: string;
  notes?: string;
}

interface BatchInvoice {
  vendor_name: string;
  invoice_number: string;
  amount: number;
  due_date: string;
  po_number?: string;
}
```

Implement for both `SampleDataService` (2–3 mock batches, one pending) and the live Airtable service.

**2. Verify `data-service-extensions.ts` wires batches into the approval queue:**

The file `services/data-service-extensions.ts` already has `getPendingBatchApprovals()` which calls `dataService.getPaymentBatches()`. Once you implement `getPaymentBatches()`, batches should automatically appear in the `ApprovalQueue` under the "Batches" filter tab. Verify this works — if it does, no queue changes needed.

**3. Create `PaymentBatchCard` component:**

Put it in `src/components/dashboard/`. This replaces the default `ApprovalCard` rendering when the item is a batch. The `ApprovalQueue` (or its parent) should detect `item.type === 'batch'` and render `PaymentBatchCard` instead of `ApprovalCard`.

Layout:

**Header row:**
- Batch ID (monospace, prominent) + status badge
- Date range: "Created {batch_date} · Due through {due_date_cutoff}"

**Summary row (the decision anchor):**
- Large: total amount in EUR (`formatEUR`)
- Secondary: invoice count ("12 invoices")
- Tertiary: payment method badge

**Expandable invoice table (collapsed by default):**
- Toggle: "▸ Show invoices" / "▾ Hide invoices"
- Table: vendor name, invoice number, amount (EUR), due date, linked PO
- Keeps the card compact until the reviewer wants detail

**Action row (two buttons — same as ApprovalCard):**
- ✓ Approve Batch — fires the existing `approve()` from `useApprovals` hook (which calls `approval-service.ts` with `type: "batch"`)
- ✕ Reject — opens inline notes field, then fires `reject()` with notes
- Per-button loading/disabled states, optimistic removal, rollback — all handled by the existing `approval-store.ts`

**4. Wire the card into ApprovalQueue:**

In the `ApprovalQueue` component (or wherever it maps over `pending` items to render cards), add a check:

```tsx
{item.type === 'batch' ? (
  <PaymentBatchCard key={item.id} item={item} ... />
) : (
  <ApprovalCard key={item.id} item={item} ... />
)}
```

The `PendingApproval` type already carries `item.raw` which is the original `PaymentBatch` object — `PaymentBatchCard` can access `item.raw.invoices`, `item.raw.due_date_cutoff`, etc.

**5. Sample data:**

Add 2 sample payment batches to `SampleDataService`:
- `BATCH-2026-W16` — Pending Approval, €8,420.50, 5 invoices, various vendors
- `BATCH-2026-W15` — Approved (already processed), €6,180.00, 4 invoices

---

## PART 2 — DASHBOARD BUG FIXES

### Bug 1 — Verify double-click protection is wired correctly

The approval components I received (`ApprovalCard.tsx`, `approval-store.ts`) already implement per-item `submitting` state tracking, button disabling during flight, and optimistic removal with rollback. **If double-clicks are still happening, the issue is that the dashboard is NOT using these components** — it may have its own inline approval UI.

**Investigation steps:**
1. Check what the dashboard's "Pending Approvals" section actually renders. Is it using `ApprovalQueue` and `ApprovalCard` from `src/components/dashboard/`, or does it have its own inline implementation?
2. If it has its own implementation: **replace it** with `ApprovalQueue`/`ApprovalCard`. Don't add double-click protection to a second implementation — use the one that already has it.
3. If it IS using the correct components but double-clicks still happen: check that the `submitting` map in `approval-store.ts` is being read correctly in the card's button `disabled` prop. The guard is `disabled={submitting}` where `submitting` comes from `isSubmitting(item.id)` via the `useApprovals` hook.

Apply the same verification to `RequisitionReviewCard` — make sure it has the same per-item loading guard.

### Bug 2 — Inconsistent alert styles

**Symptom:** The Active Alerts section mixes visual styles — some alerts use one badge treatment, others use another; severity colors don't match.

**Fix:**
- Create a single `<AlertItem>` component that takes `severity: 'critical' | 'warning' | 'approval' | 'info'` and renders icon, border color, background tint, and badge consistently.
- Replace every ad-hoc alert render in the dashboard with this component.
- Severity mapping:
  - `critical` → red (🚨) — disputes, negative stock, system errors
  - `warning` → amber (⚠️) — price deviations, anomalies, blocked reorders
  - `approval` → blue (📋) — POs awaiting action, batches pending
  - `info` → neutral gray (ℹ️) — reports generated, receiving confirmed
- All alert content stays in BCS (the backend produces it that way); only the chrome/styling is standardized.
- Check the severity assignments in `auditToAlert` in `src/services/airtable-data-service.ts` and make them consistent with the mapping above.

### Bug 3 — Empty notification bodies

**Symptom:** Some notifications render with a title but no body text.

**Fix:**
- In the notification renderer, guard against empty/null/undefined `body`/`message`. If body is empty, either:
  - (a) Don't render the body paragraph at all (preferred — cleaner than fabricating text), or
  - (b) Fall back to a one-liner derived from the alert's type + reference_id + amount (e.g., "PO PO-2026-0052 — €1,240.00")
- Trace back one level: find where these empty bodies originate — likely the `auditToAlert` mapper in `airtable-data-service.ts` where the `details` field from the Audit_Trail record is null. The mapper should fall back to a sensible message per event type using the existing `reference_id` and `amount` fields.
- Log a `console.warn` in dev mode when a notification has no body so missing data is visible during testing.

---

## PART 3 — AR AGING VIEW (READ-ONLY)

### Context

WF15 (AR Aging Monitor) runs daily, scans the `AR_Ledger` table for overdue receivables, and sends tiered dunning emails (30/60/90-day escalation in BCS). The workflow writes `alert_30_sent`, `alert_60_sent`, `alert_90_sent` flags and `last_contact_date` back to the table.

**What's missing:** No UI view. Zoran needs to see which clients owe what, how overdue they are, and whether WF15 has already sent a dunning email.

This is a **read-only view** — no actions yet. Sending manual follow-up emails from the UI can come later.

### Airtable

**Table:** `AR_Ledger` (`tblWg64KRT2VKycZt`)

Fields: `ar_id`, `client_name`, `client_email`, `client_type`, `invoice_number`, `invoice_date`, `due_date`, `amount`, `amount_paid`, `balance`, `status`, `payment_terms`, `po_numbers`, `department`, `gl_account`, `alert_30_sent`, `alert_60_sent`, `alert_90_sent`, `last_contact_date`, `notes`.

### DataService additions

```typescript
getARLedger(filters?: { status?: string; minDaysOverdue?: number }): Promise<ARLedgerEntry[]>
```

```typescript
interface ARLedgerEntry {
  ar_id: string;
  client_name: string;
  client_email: string;
  client_type: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  days_overdue: number;           // computed from due_date vs today
  alert_30_sent: boolean;
  alert_60_sent: boolean;
  alert_90_sent: boolean;
  last_contact_date?: string;
  department: string;
  gl_account: string;
  notes?: string;
}
```

Compute `days_overdue` on read (today minus `due_date`, floored at 0).

Sample data: 6–8 entries across the aging buckets (current, 1–30, 31–60, 61–90, 90+).

### Where it lives

Add a new nav item **"AR Aging"** in the sidebar (after Invoices, before Inventory). New route: `/ar-aging`.

### Page layout

**Top row — aging bucket summary cards:**
- Current (not overdue): count + total €
- 1–30 days overdue: count + total €
- 31–60 days: count + total €
- 61–90 days: count + total € (amber tint)
- 90+ days: count + total € (red tint)

**Table below:**
Columns: Client, Invoice #, Invoice Date, Due Date, Days Overdue (with color-coded badge), Balance (EUR), Dunning Status, Last Contact.

**Dunning Status column:** a compact visual of three dots (30/60/90), each filled or hollow depending on `alert_*_sent` flags. Green/amber/red fill respectively when sent. Hover shows the date the alert was sent if available.

**Sorting:** default sort by `days_overdue` DESC so the worst offenders surface first.

**Filters:** bucket filter (All / Current / 1–30 / 31–60 / 61–90 / 90+), client type filter, search box for client name or invoice number.

**No action buttons yet.** Clicking a row opens a read-only detail modal with the full record + notes.

---

## ARCHITECTURAL NOTES (APPLY TO ALL PARTS)

1. **Do not add new npm dependencies.** Use what's already in the project (Zustand, plain fetch, Tailwind, lucide-react, clsx, date-fns, Recharts if charts are needed).

2. **Follow the existing service → store → hook → component pattern** established by the approval and requisition-review code. For Part 1, you are EXTENDING the existing approval chain, not building a parallel one.

3. **Dark theme, same design language.** The Command Center is desktop-first, dense, professional. Purple accent for AI-generated reasoning blocks.

4. **European number and currency formatting.** `formatEUR` helper for all amounts. Dates in DD MMM YYYY format.

5. **BCS for data fields, English for UI chrome.** Item names, vendor names, AI reasoning, dunning notes stay in BCS exactly as the backend produces them. Labels like "Approve Batch" and "Days Overdue" stay in English.

6. **Optimistic updates with rollback** on all mutating actions. Never leave the UI in a state where the user can't tell whether their action succeeded.

7. **Per-item loading and error states** — never a page-level spinner that blocks other cards while one is in flight.

---

## OUT OF SCOPE (do not build)

- **Invoice dispute review gate** — WF07 currently auto-sends dispute emails with no human checkpoint. The backend change hasn't been made yet, so there's no webhook to wire up.
- **Receiving tablet app** — separate effort, separate route group.
- **Manual "send follow-up email" action** from the AR Aging view — read-only for now.
