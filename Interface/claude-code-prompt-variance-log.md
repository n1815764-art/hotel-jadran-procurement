# CLAUDE CODE PROMPT: Variance Log — Airtable Table + WF05 Fan-Out

## Context

We want to start logging receiving variance (expected vs received per line item) so a future AI suggestion engine has historical data to reason over ("vendor X is consistently short by 8% — order more"). The data already flows through WF05 today; we just don't capture it in a queryable shape — line items get serialized into `Receiving_Log.items_received_json` as a blob, which is useless for analytics.

This task does two things:

1. **Create a new `Variance_Log` table in Airtable** (one row per line item per receiving event).
2. **Modify WF05 to fan out into that table** for every receiving submission, on top of its existing writes to `Receiving_Log` and `Audit_Trail`.

The frontend does not change. WF05 owns the receiving lifecycle and is the right place for this write — we are intentionally not piling more logic into the frontend.

## Decisions already made (do not re-litigate)

- **Log everything.** Every line item gets a row, including zero-variance lines. Filter at read time, never at write time. You cannot recover data you didn't log.
- **WF05 does the write, not the frontend.** Adding a fan-out node to WF05 is the architecturally consistent choice — same as PO_Log being written by the PO workflow, Audit_Trail by the workflow that observed the event, etc.
- **Variance is a formula field in Airtable.** WF05 only sets `expected_qty` and `received_qty`. Airtable computes `variance_qty` and `variance_pct` automatically. Less drift if the computation logic changes later.

---

## Part A — Create the `Variance_Log` Airtable table

**Base:** `appjHlTQID87ODAJL` (Hotel Jadran Procurement)

**Table name:** `Variance_Log`

**Fields:**

| Field name | Type | Notes |
|---|---|---|
| `variance_id` | Auto Number (or formula `"VAR-" & RECORD_ID()`) | Stable identifier for the row. Airtable auto-number is fine. |
| `timestamp` | Date and time | When the receiving event occurred. WF05 sets this from the webhook payload. |
| `po_number` | Single line text | e.g. `PO-2026-0048` |
| `vendor_name` | Single line text | e.g. `Jadranska Riba d.o.o.` |
| `item_name` | Single line text | The line item name as the receiver entered it. |
| `item_id` | Single line text | If known (matched to inventory master), else blank. WF05 should look up against `Sample Inventory with Par Levels` by name; leave blank on miss rather than fabricate. |
| `unit` | Single line text | e.g. `kg`, `kom`, `l` |
| `expected_qty` | Number (decimal, precision 4) | Quantity ordered on the PO. |
| `received_qty` | Number (decimal, precision 4) | Quantity recorded as received. |
| `variance_qty` | **Formula** | `{received_qty} - {expected_qty}` — negative means short, positive means over. |
| `variance_pct` | **Formula** | `IF({expected_qty} = 0, 0, ROUND(({received_qty} - {expected_qty}) / {expected_qty} * 100, 2))` |
| `quality_ok` | Checkbox | Did the receiver mark the line as quality-acceptable? |
| `quality_notes` | Long text | Free-form notes from the receiving form (BCS). Empty is fine. |
| `temperature_c` | Number (decimal, precision 1) | If captured by the receiving tablet (cold-chain items only). Empty otherwise. |
| `received_by` | Single line text | Receiver name from the receiving form. |

**Setup notes:**

- Use Airtable MCP if available (`mcp__claude_ai_Airtable__create_table`). If MCP is not available, output the schema as a manual setup instruction for the user to apply in the Airtable UI.
- Do not set up any views beyond the default grid view — read-side filtering happens in code or in Airtable formulas elsewhere. Adding views now is premature.
- Do not add foreign key links to `Receiving_Log` or `PO_Log`. Keep the table denormalized — every row stands alone with the strings it needs. Joins via name lookup at read time are fine for the volume we expect (~50 receiving events / month at peak).

After the table is created, confirm with a brief note:
> Created `Variance_Log` (`tbl…`) with 14 fields. `variance_qty` and `variance_pct` are formula fields. Ready for WF05 to write to it.

---

## Part B — Modify WF05 to fan out to `Variance_Log`

**This is the n8n side of the work and will be applied in the n8n editor by the workflow owner.** Do not modify the frontend code.

**Workflow:** `WF05 — Receiving Update`
**Trigger:** Existing `Webhook` node listening at `/webhook/receiving`
**No new webhook needed.** The frontend payload already contains everything we need.

### Existing payload shape (already sent by the frontend)

```json
{
  "po_number": "PO-2026-0048",
  "vendor_name": "Jadranska Riba d.o.o.",
  "received_by": "Vasilije",
  "delivery_date": "2026-05-04T10:23:00Z",
  "delivery_items": [
    {
      "item_name": "Orada svjeza",
      "quantity_ordered": 60,
      "quantity_received": 55,
      "unit": "kg",
      "notes": "Jedna riba neznatno oštećena"
    },
    {
      "item_name": "Pileća prsa",
      "quantity_ordered": 40,
      "quantity_received": 40,
      "unit": "kg",
      "notes": ""
    }
  ]
}
```

### Required workflow changes

After WF05's existing nodes complete (the inventory update + Audit_Trail write), add the following branch:

1. **Item Lists / Split Out node** — split `delivery_items` into one execution per line item.

2. **(Optional) Inventory lookup** — for each line item, look up `item_id` in `Sample Inventory with Par Levels` by `Name`. Pass the matched `item_id` forward; if no match, set `item_id` to empty string. **Do not fabricate an ID.**

3. **Airtable Create Record node** — `Variance_Log` table. Field mapping:

| Airtable field | Source |
|---|---|
| `timestamp` | `{{$json.delivery_date}}` from the webhook payload (or `{{$now}}` if `delivery_date` is missing) |
| `po_number` | `{{$json.po_number}}` from the webhook |
| `vendor_name` | `{{$json.vendor_name}}` from the webhook |
| `item_name` | `{{$json.item_name}}` from the split line item |
| `item_id` | Looked-up `item_id` from step 2, else `""` |
| `unit` | `{{$json.unit}}` from the split line item |
| `expected_qty` | `{{$json.quantity_ordered}}` |
| `received_qty` | `{{$json.quantity_received}}` |
| `quality_ok` | `true` if the line had no negative quality flag, else `false`. The current frontend payload doesn't carry an explicit quality flag per line — for now, treat any non-empty `notes` containing the substring `"oštećen"`, `"loše"`, or `"problem"` (BCS) as `quality_ok = false`; otherwise `true`. This is a heuristic to bridge until the receiving form sends an explicit flag. |
| `quality_notes` | `{{$json.notes}}` from the split line item, or empty |
| `temperature_c` | Empty for now — the current frontend doesn't capture per-line temperature. |
| `received_by` | `{{$json.received_by}}` from the webhook |

4. **Error branch** — if the Airtable create fails for one line item, **do not abort the workflow.** Log the error to `Audit_Trail` with `event_type: "VARIANCE_LOG_FAILED"` and continue processing the rest. Variance logging is best-effort — it should never block the actual receiving update.

### Order of operations inside WF05

```
Webhook (/webhook/receiving)
  → existing: update inventory in Sample Inventory with Par Levels
  → existing: create Receiving_Log row
  → existing: create Audit_Trail row (RECEIVING_CONFIRMED)
  → NEW: Split Out delivery_items
       → NEW: Inventory lookup by item_name (optional)
       → NEW: Create Variance_Log row (one per line item)
```

The new branch runs **after** the existing receipt processing is complete. If the new branch fails entirely, the receiving event is still recorded — only the variance telemetry is lost.

---

## Out of scope (do not do these in this task)

- **Cleaning up the frontend dual-write in `airtable-data-service.ts:submitReceiving()`.** That function currently writes to `Receiving_Log` directly AND fires the WF05 webhook — same antipattern we cleaned up for requisition. Worth fixing in a follow-up PR, but doing it as part of this task creates a chicken-and-egg problem (if the cleanup ships before WF05 is updated, no one writes anything until WF05 catches up). Note it as a follow-up; do not edit `submitReceiving()` here.
- **Building a "variance dashboard" UI.** No data exists yet. Don't build a chart for an empty table.
- **Feeding variance into `/api/suggest-quantity`.** Same reason — wait until there are 30+ days of data, then revisit.
- **Adding new fields to the receiving form** (e.g. explicit quality flag per line, per-line temperature). Worthwhile but separate effort with its own UX consideration.

---

## Verification

After both parts ship:

1. Submit a test receiving via `/prijem` with at least one line item where `received_qty < expected_qty`.
2. Open the `Variance_Log` table in Airtable. Confirm:
   - One row per line item exists (including zero-variance lines).
   - `variance_qty` and `variance_pct` show non-zero values for the short line.
   - `timestamp`, `po_number`, `vendor_name`, `received_by` are populated.
3. Submit a second receiving with a deliberately mistyped item name (so the inventory lookup misses). Confirm `item_id` is empty rather than wrong.
4. Run a quick query: filter `Variance_Log` to `variance_pct < -5` over the last 30 days, group by `vendor_name`. Confirm the data is queryable in this shape — that's the use case the AI suggestion engine will rely on.

---

## Architectural notes

- WF05 is now the single writer for `Variance_Log`. Do not write to it from the frontend, ever.
- The `variance_qty` / `variance_pct` formulas live in Airtable — if the variance computation needs to change (different rounding, different sign convention), update the formulas, not WF05.
- The table is intentionally denormalized. Joining back to `Receiving_Log` or `PO_Log` is a read-time concern.
