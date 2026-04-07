# PROCUREMENT COMMAND CENTER — Live Data Connection Spec

## OBJECTIVE
Connect the Procurement Command Center to live Airtable data and n8n workflow webhooks. Replace all sample/hardcoded data with real API calls. The interface is already built — this is purely a data layer swap.

---

## AIRTABLE CONNECTION

**Base ID:** `appjHlTQID87ODAJL`
**API:** Use Airtable REST API v0 — `https://api.airtable.com/v0/appjHlTQID87ODAJL/{table_name}`
**Auth:** Bearer token via environment variable `AIRTABLE_PAT`

### Tables → Pages Mapping

#### 1. Dashboard Page
Reads from ALL tables to compute KPIs:

| KPI | Source Table | How to Calculate |
|-----|-------------|-----------------|
| Pending Approvals | `PO_Log` | Count records where `status` = "Pending Approval" |
| Today's POs | `PO_Log` | Count + sum `total_amount` for all records (filter by date if needed) |
| 3-Way Match Rate | `Invoice Log` | Count where `match_status` in ["PERFECT_MATCH","MINOR_DISCREPANCY"] ÷ total invoices × 100 |
| Budget MTD | `Sample GL Account Mapping` | Sum `Monthly Budget` field for total budget; sum PO_Log `total_amount` for spend |
| Data Issues | `Sample Inventory with Par Levels` | Count where `Current Stock` < 0 (negative stock) |
| Occupancy Today | `Sample Occupancy Data` | Filter by today's date, read `Occupancy %` and `Rooms Sold` |

**Active Alerts:** Read from `Audit_Trail` table, filtered by recent timestamps. Map `event_type` to alert severity:
- "Approved" with negative stock details → CRITICAL (red)
- "Approved" with discrepancy details → WARNING (amber)  
- PO-related events with "Pending" → APPROVAL (blue)
- Report/forecast events → INFO (neutral)

**Pending Approvals Cards:** Read `PO_Log` where `status` = "Pending Approval". Display: `po_number`, `vendor_name`, `department`, `total_amount`, `items_json`, `source`, `notes` (AI reasoning)

#### 2. Purchase Orders Page
**Table:** `PO_Log` (table ID: `tblZDGSeFkMfR3UiN`)
**Fields:** po_number, vendor_name, po_date, total_amount, items_json, status, notes, vendor_email, department, gl_account, source, requester, approved_by

**Status values (singleSelect):** Pending Approval, Approved, Sent to Vendor, Open, Partially Received, Fully Received, Closed, Cancelled

**Approve action:** PATCH record → set `status` to "Approved", set `approved_by` to current user name, then POST to `/webhook/po-creation` to send vendor email
**Reject action:** PATCH record → set `status` to "Cancelled", add rejection note to `notes`

#### 3. Invoices Page
**Table:** `Invoice Log` (table ID: `tbliqNuQDtHyWUTey`)
**Fields:** seller_name, invoice_number, invoice_date, invoice_amount, currency, po_number, seller_address, seller_email, subtotal, total_tax, total_tax_%, match_status, match_details_json, gl_account, approved

**Match status values:** PERFECT_MATCH, MINOR_DISCREPANCY, MAJOR_DISCREPANCY, DISPUTE_REQUIRED, Pending Review

#### 4. Inventory Page
**Table:** `Sample Inventory with Par Levels` (table ID: `tblGtXmeNqMOv57W6`)
**Fields:** Name, Notes, Category, Unit, Par Level, Reorder Point, Current Stock, Unit Cost, Preferred Vendor

**Negative stock banner:** Show when any record has `Current Stock` < 0
**Stock level bar:** Calculate as `Current Stock / Par Level × 100`. Color: red <30%, amber 30-60%, green >60%
**Flags:** NEGATIVE (Current Stock < 0), LOW (Current Stock ≤ Reorder Point), OK (everything else)

#### 5. Vendors Page
**Vendor list table:** `Sample Vendors` (table ID: `tblxdloqGr9Zsm2Yd`)
**Fields:** Name, Notes, Category, Contact Email, Payment Terms

**Contracts table:** `Vendor_Contracts` (table ID: `tblPtftB8Llv44OQW`)
**Fields:** contract_id, vendor_name, contract_type, start_date, end_date, total_value, status, key_terms, auto_renew, alert_90_sent, alert_60_sent, alert_30_sent

**Contract expiry colors:** 
- ≤30 days: red
- 31-60 days: amber  
- 61-90 days: yellow
- >90 days: green

#### 6. Reports Page
**Daily Flash Report:** Read from `Audit_Trail` where `reference_id` starts with "FLASH-". The report text is in the `details` field. OR, read the latest Slack message via Slack API.

**Weekly Demand Forecast:** Read from `Audit_Trail` where `reference_id` starts with "FORECAST-".

#### 7. Audit Trail Page
**Table:** `Audit_Trail` (table ID: `tbl4pTUUujvn59G7b`)
**Fields:** reference_id, timestamp, event_type, actor, details, amount

Display as chronological log, newest first. Filter by: event_type, actor, date range, reference_id.

#### 8. Settings Page
**Workflow status:** No direct Airtable table. Show static list of 13 workflows with their cron schedules. Connection status can check if Airtable API responds (green) or not (red).

---

## n8n WEBHOOK CONNECTIONS

The Command Center needs to call these n8n webhooks:

### 1. Submit Requisition (from dashboard or PO page)
**Endpoint:** `POST http://localhost:5678/webhook/requisition`
**Triggers:** WF03 → WF04 → WF06
**Payload:**
```json
{
  "department": "Kitchen",
  "item_name": "Chicken Breast",
  "quantity_requested": 50,
  "unit": "kg",
  "urgency": "high",
  "requester": "Vasilije",
  "justification": "Running low, weekend event"
}
```

### 2. Record Delivery (from Receiving Tablet App)
**Endpoint:** `POST http://localhost:5678/webhook/receiving`
**Triggers:** WF05
**Payload:**
```json
{
  "po_number": "PO-2026-XXXX",
  "vendor_name": "Sysco Foodservice",
  "received_by": "Vasilije",
  "delivery_date": "2026-03-30",
  "delivery_items": [
    {
      "item_name": "Chicken Breast",
      "quantity_ordered": 50,
      "quantity_received": 48,
      "unit": "kg",
      "notes": "2 kg short"
    }
  ]
}
```

### 3. PO Approval (from dashboard approval cards)
When user clicks "Approve" on a pending PO:
1. **PATCH** the PO_Log record in Airtable → set `status` to "Approved", `approved_by` to user name
2. Then call WF06's webhook to trigger vendor email: `POST http://localhost:5678/webhook/po-creation` with the PO data (this will draft the email via AI, send it, and update status to "Sent to Vendor")

**Payload for WF06:**
```json
{
  "vendor_name": "Sysco Foodservice",
  "vendor_email": "orders@sysco-test.com",
  "department": "Kitchen",
  "total_amount": 3420,
  "items_json": "[{\"item_name\": \"Chicken Breast\", \"quantity\": 50, \"unit\": \"kg\", \"unit_price\": 7.00}]",
  "gl_code": "4010",
  "source": "Auto-Reorder",
  "requester": "System"
}
```

When user clicks "Reject" on a pending PO:
1. **PATCH** the PO_Log record in Airtable → set `status` to "Cancelled"
2. No webhook call needed

### 4. n8n Workflow Base URL
All webhook endpoints use: `${N8N_WEBHOOK_BASE}/webhook/{path}`

| Webhook Path | Workflow | Purpose |
|---|---|---|
| `/webhook/requisition` | WF03 | Submit new purchase requisition |
| `/webhook/receiving` | WF05 | Record delivery receipt |
| `/webhook/po-creation` | WF06 | Create PO and send vendor email |

---

## DATA SERVICE INTERFACE

The app should use the DataService abstraction pattern. Here's the interface — implement `AirtableDataService`:

```typescript
interface DataService {
  // Purchase Orders
  getPurchaseOrders(filters?: { status?: string }): Promise<PO[]>
  getPurchaseOrder(poNumber: string): Promise<PO>
  approvePO(recordId: string, approvedBy: string): Promise<void>
  rejectPO(recordId: string, reason: string): Promise<void>
  
  // Invoices
  getInvoices(filters?: { matchStatus?: string }): Promise<Invoice[]>
  
  // Inventory
  getInventory(): Promise<InventoryItem[]>
  getNegativeStockItems(): Promise<InventoryItem[]>
  getLowStockItems(): Promise<InventoryItem[]>
  
  // Vendors
  getVendors(): Promise<Vendor[]>
  getContracts(): Promise<Contract[]>
  getExpiringContracts(daysAhead: number): Promise<Contract[]>
  
  // Occupancy
  getOccupancyForecast(days: number): Promise<OccupancyDay[]>
  
  // Audit
  getAuditTrail(filters?: { eventType?: string, dateRange?: [Date, Date] }): Promise<AuditEntry[]>
  
  // Dashboard KPIs
  getDashboardKPIs(): Promise<DashboardKPIs>
  
  // Requisitions
  submitRequisition(data: RequisitionInput): Promise<{ requisition_id: string }>
  
  // Receiving
  submitDelivery(data: DeliveryInput): Promise<{ receiving_id: string }>
}
```

---

## AIRTABLE FIELD NAME REFERENCE

These are the EXACT field names in each table (case-sensitive):

**PO_Log:** po_number, vendor_name, po_date, total_amount, items_json, status, notes, vendor_email, department, gl_account, source, requester, approved_by

**Invoice Log:** seller_name, invoice_number, invoice_date, invoice_amount, currency, po_number, seller_address, seller_email, subtotal, total_tax, total_tax_%, match_status, match_details_json, gl_account, approved

**Sample Inventory with Par Levels:** Name, Notes, Category, Unit, Par Level, Reorder Point, Current Stock, Unit Cost, Preferred Vendor

**Sample Vendors:** Name, Notes, Category, Contact Email, Payment Terms

**Vendor_Contracts:** contract_id, vendor_name, contract_type, start_date, end_date, total_value, status, key_terms, auto_renew, alert_90_sent, alert_60_sent, alert_30_sent

**Sample Occupancy Data:** Name, Date, Occupancy %, Rooms Sold, Arrivals, Departures, Events

**Sample GL Account Mapping:** Name, Department, Item Category, GL Code, GL Name, Monthly Budget

**Audit_Trail:** reference_id, timestamp, event_type, actor, details, amount

**Receiving_Log:** receiving_id, po_number, vendor_name, date_received, received_by, items_received_json, status, notes

**Requisition_Log:** requisition_id, department, item_name, quantity_requested, unit, urgency, requester, justification, status, ai_decision, submitted_at

**Contract_Line_Items:** item_name, vendor_name, contracted_price, unit_of_measure, contract_start, contract_end, category, notes

---

---

## PO STATUS LIFECYCLE (for interface display)

The complete PO status flow the interface should expect:

```
Pending Approval → Approved → Sent to Vendor → Partially Received → Fully Received → Closed
                 ↘ Cancelled
```

**Dashboard "Pending Approvals" section:** Filter PO_Log where status = "Pending Approval"
**Approve button action:** PATCH status to "Approved", then optionally call WF06 webhook to send vendor email (which changes status to "Sent to Vendor")
**Reject button action:** PATCH status to "Cancelled"

---

## ENVIRONMENT VARIABLES NEEDED

```
AIRTABLE_PAT=your_airtable_personal_access_token
N8N_WEBHOOK_BASE=http://localhost:5678
```

---

## CURRENCY FORMAT

All amounts are in EUR. Display as: `€1.850,00` (European format — dot for thousands, comma for decimals).

## TIMESTAMPS

All timestamps in Central European Time (CET/CEST). The hotel is in Budva, Montenegro.
