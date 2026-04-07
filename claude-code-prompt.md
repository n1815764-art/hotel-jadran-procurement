# PROMPT FOR CLAUDE CODE: Hotel Jadran Procurement Interface

Copy everything below this line and paste it as your prompt to Claude Code. The prompt includes all context needed — no external documents required.

---

## PROJECT CONTEXT

I'm building an AI-powered hotel procurement automation system for Hotel Jadran (200 rooms, pilot property). The backend is already built: 13 n8n workflows handle everything from auto-reorder to invoice matching to anomaly detection, all orchestrated through Airtable (testing phase) and Kimi K2.5 LLM for AI decisions. What's missing is the front-end interface layer.

I need you to build **two applications** that share a codebase and design system:

1. **Procurement Command Center** — a desktop-first web dashboard for me (system admin) and the Finance Controller to monitor, approve, and override AI decisions
2. **Receiving Tablet App** — a tablet-optimized PWA for warehouse/kitchen staff to record deliveries against purchase orders

Both apps run on **sample data now** (hardcoded JSON + local state) but are architected so I can later swap in real API calls to Airtable (testing) and eventually Abacus POS2 + Protel PMS (production) without rewriting the UI.

---

## APP 1: PROCUREMENT COMMAND CENTER

### Users
- **Martin (me):** System admin. Sees everything, can override any AI decision, access config.
- **Finance Controller:** Approves POs €500–€5,000, reviews invoice disputes, reads daily flash reports, monitors vendor scorecards.
- Future: GM (approves POs >€5,000), Department Heads (approve POs €500–€2,000 for their department).

### UI Language
- **Interface labels, navigation, buttons:** English
- **AI-generated content (alerts, reports, AI reasoning, vendor emails):** Bosnian/Croatian/Serbian (BCS). This is how the backend produces it — the UI just displays it as-is.
- **Data fields (item names, vendor names, categories):** BCS (these come from the hotel's systems)

### Pages & Features

#### 1. Dashboard (Home)
The nerve center. Shows today's snapshot at a glance.

**KPI Cards (top row):**
- Pending Approvals (count, links to approval queue)
- Today's POs (count + total EUR value)
- 3-Way Match Rate (% perfect matches this week)
- Monthly Budget Used (% of F&B budget consumed MTD)
- Data Integrity Issues (count of negative stock + ghost surplus items — RED alert styling)
- Occupancy Today (% + rooms sold / total)

**Active Alerts Section:**
Real-time alerts from the automation system, styled by severity:
- 🚨 CRITICAL (red): Negative stock detected, system errors, blocked auto-reorders
- ⚠️ WARNING (amber): Price disputes, ghost surplus, budget thresholds
- 📋 APPROVAL (blue): POs awaiting human approval
- ℹ️ INFO (neutral): Reports generated, contracts expiring, forecasts ready

Each alert shows: icon, title, BCS message body, timestamp, originating workflow ID (e.g., "WF-08").

**Pending Approvals Section (inline quick actions):**
Cards for each PO needing approval. Each card shows:
- PO number, vendor name, department, total EUR
- AI reasoning (why the system created this PO — e.g., "Occupancy 87% + vjenčanje subota 120 pax. Količine +30% iznad par nivoa.")
- Three buttons: ✓ Approve | ✕ Reject | Details →
- Approve/Reject work immediately (update state), Details opens full PO detail view

#### 2. Purchase Orders
Full PO lifecycle management.

**Table view** with columns: PO #, Date, Vendor, Department, Total (EUR), Source (Auto-Reorder / Manual / Emergency), Status, Approver.

**Status filter tabs:** All | Pending Approval | Approved | Sent to Vendor | Partially Received | Fully Received | Closed | Cancelled

**PO Detail Modal/Page** (click any row):
- All header fields (vendor, dept, date, GL code, source, approver, status)
- AI Recommendation box (highlighted, shows the AI's reasoning in BCS)
- Line items table: Item name, Qty, Unit, Unit Price, Subtotal
- Action buttons (if Pending): Approve / Reject / Edit Quantities / Add Note
- Activity log / audit trail for this PO

**Create PO form** (manual/emergency orders):
- Select vendor (from vendor master), department, GL code
- Add line items (item name, qty, unit, price)
- System auto-calculates total and determines approval tier
- Submit triggers the approval flow

**PO Number Format:** PO-YYYY-NNNN (e.g., PO-2026-0047)

**Approval Tiers (EUR):**
| Amount | Approver | Behavior |
|--------|----------|----------|
| < €500 | Auto-approved | Sent to vendor immediately |
| €500–€2,000 | Department Head | Approval required |
| €2,000–€5,000 | Controller | Approval required |
| > €5,000 | Controller + GM | Sequential approval |

#### 3. Invoices & Three-Way Matching
Shows all vendor invoices processed by OCR (Nanonets) and matched by AI.

**Table view** with columns: Vendor Invoice #, Date, Vendor, Linked PO #, Invoice Total, PO Total, Match Status.

**Match Status badges** (color-coded):
- PERFECT MATCH (green): Everything lines up
- MINOR (amber): Small discrepancy (<5% or <€50), auto-accepted with note
- MAJOR (red-orange): Significant discrepancy, needs Controller review
- DISPUTED (red): AI has drafted a dispute email to vendor
- PENDING REVIEW (blue): Awaiting processing

**Invoice Detail Modal/Page:**
- All header fields + OCR confidence score
- Side-by-side comparison: Invoice line items vs PO line items vs Receiving report
- AI match analysis (BCS text explaining what matched and what didn't)
- For disputes: show the AI-drafted dispute email (BCS), with Send / Edit / Dismiss actions
- GL account assignment (auto-assigned by AI, editable)

#### 4. Inventory & Reorder
Shows current stock levels with AI flags.

**Negative Stock / Recipe Error Banner** (always visible when issues exist):
Full-width red banner explaining the detected recipe error in BCS. For the chicken/orada scenario:
"Piletina (PROT-001) shows -12 kg — physically impossible. POS2 recipe 'Orada na žaru' is depleting chicken instead of fish. Auto-reorder SUSPENDED for this item. Do not order manually. Fix in POS2 Admin."

**Table view** with columns: SKU, Item Name (+ warehouse subtitle), Category, Current Stock (with unit), Par Level, Stock Level Bar (visual %), Preferred Vendor, Flag.

**Flags:** NEGATIVE (red), GHOST (amber), LOW (amber, at or below reorder point), OK (grey)

**Category filter buttons** + search box

**AI Flags Detail Section** (below table):
Expandable cards for each flagged item showing the full AI analysis in BCS.

**Stock Level Bar:**
Visual bar showing current/par ratio. Color: red <30%, amber 30-60%, green >60%. For negative stock items: empty bar, red 0%.

#### 5. Vendors & Contracts
**Vendor list** with: name, category, performance score (1-10), status (Active/Probation/Suspended), contract expiry date.

**Vendor Detail:**
- Contact info, payment terms, certifications
- Performance scorecard (AI-generated monthly): Delivery 1-10, Accuracy 1-10, Quality 1-10, Pricing 1-10, Responsiveness 1-10
- Recommendation badge: MAINTAIN / WATCH / REPLACE
- Order history (linked POs)
- Contract details with expiry countdown

**Contract Expiry Timeline:**
Visual timeline or list showing contracts approaching expiry with 90/60/30-day color coding.

#### 6. Reports
**Daily Flash Report:** Display the AI-generated daily summary (plain text in BCS, <200 words). Shows today's + last 7 days archived.

**Weekly Demand Forecast:** Color-coded urgency table:
- 🔴 Red: Order within 24h or stockout likely
- 🟡 Amber: Order within 3 days
- 🟢 Green: Adequate for the week

**Monthly Variance Analysis:** Theoretical vs actual inventory comparison (when data available).

#### 7. Audit Trail
Chronological log of every system action: AI decisions, approvals, rejections, PO creation, invoice matches, alerts fired. Each entry shows: timestamp, event type, actor (System/AI/Controller/etc.), reference ID, details, amount.

Filterable by: event type, actor, date range, reference ID.

#### 8. System Status / Settings
- Connection status for all integrations: n8n (green/red), Airtable (green/red), Nanonets (green/red), Slack (amber — not set up), Abacus API (amber — waiting), Protel API (amber — not started)
- Workflow status: list all 13 workflows with last run time, status, next scheduled run
- Cron schedule display

---

## APP 2: RECEIVING TABLET APP

### Users
Kitchen porters, warehouse staff, sous-chef — the person physically receiving a delivery at the loading dock or kitchen door.

### UI Language
**Entirely BCS.** These staff members may not speak English. Every label, button, instruction, placeholder — all in BCS.

### Key Design Requirements
- **Tablet-optimized:** 10" tablet in landscape or portrait, held in one hand. Large touch targets (min 48px), big text, simple flows.
- **PWA:** Installable, works offline (queue submissions for when connection returns). Deliveries happen at a loading dock — WiFi may be spotty.
- **No login complexity:** Shared device. User selects their name from a list or enters a simple 4-digit PIN at start of shift. No email/password auth.
- **Camera integration:** Staff can photograph delivery (quality issues, damaged goods, temperature display on delivery vehicle).

### Flow

**Step 1 — Select Today's Expected Deliveries:**
Screen shows a list of POs with status "Sent to Vendor" or "Approved" expected today. Each card shows: PO #, vendor name, expected item count, total EUR. Staff taps the one that just arrived.

If an unexpected delivery arrives (no matching PO), there's a "Neočekivana dostava" (Unexpected Delivery) button that lets them record it against a vendor without a PO.

**Step 2 — Record Line Items:**
For each line item on the PO:
- Item name (pre-filled from PO)
- Expected quantity (shown from PO, read-only)
- **Received quantity** (large number input, staff enters what they actually got)
- Unit (pre-filled)
- **Quality check** (dropdown or toggle): OK ✓ | Issue ⚠️
- If Issue: text field for notes + camera button for photo
- **Temperature** (for perishables): number input in °C

Big prominent "Sljedeći artikal →" (Next Item) button to advance through items.

**Step 3 — Summary & Discrepancy Review:**
Shows all items with any discrepancies highlighted:
- Items where received qty ≠ ordered qty (YELLOW)
- Items with quality issues (RED)
- Temperature out of range (RED)

Staff can go back and edit any item.

**Step 4 — Sign & Submit:**
- Staff name (pre-selected from Step 0)
- Delivery driver name (text input, optional)
- Timestamp (automatic)
- "Potvrdi prijem" (Confirm Receipt) button

On submit: data is sent as webhook payload to n8n Workflow 05 (Receiving Update). If offline, queued in IndexedDB and synced when connection returns. Visual confirmation: "✅ Prijem zabilježen — PO-2026-0047"

---

## TECHNICAL ARCHITECTURE

### Tech Stack
- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand (lightweight, simple)
- **Data Layer:** Abstract all data access behind a service layer / repository pattern so the data source can be swapped:
  ```
  // services/data.ts
  interface DataService {
    getPurchaseOrders(filters?): Promise<PO[]>
    getInventory(): Promise<InventoryItem[]>
    getInvoices(): Promise<Invoice[]>
    getVendors(): Promise<Vendor[]>
    // ... etc
  }
  
  // Current implementation:
  class SampleDataService implements DataService { /* returns hardcoded JSON */ }
  
  // Future:
  class AirtableDataService implements DataService { /* calls Airtable API */ }
  class AbacusDataService implements DataService { /* calls Abacus POS2 API */ }
  ```
- **PWA:** next-pwa for the receiving app (service worker, offline support, installable)
- **Camera:** Web API (navigator.mediaDevices) for the receiving app photo feature
- **Charts:** Recharts for any dashboard visualizations

### Project Structure
```
/src
  /app
    /(dashboard)           # Command Center (desktop layout)
      /page.tsx            # Dashboard home
      /purchase-orders/
      /invoices/
      /inventory/
      /vendors/
      /reports/
      /audit/
      /settings/
      /layout.tsx          # Sidebar nav layout
    /(receiving)           # Receiving Tablet App (tablet layout)
      /prijem/             # BCS URL paths
      /layout.tsx          # Tablet-optimized layout, no sidebar
  /components
    /ui                    # Shared design system components
    /dashboard             # Command Center specific
    /receiving             # Receiving App specific
  /services
    /data.ts               # DataService interface
    /sample-data.ts        # SampleDataService with hardcoded data
    /airtable.ts           # Future: AirtableDataService
  /data
    /sample/               # All sample data JSON files
      vendors.json
      purchase-orders.json
      invoices.json
      inventory.json
      receiving-log.json
      contracts.json
      gl-mapping.json
      occupancy.json
      audit-trail.json
  /types
    /index.ts              # All TypeScript interfaces
  /lib
    /utils.ts              # Formatting (EUR currency, dates, percentages)
    /constants.ts          # Approval tiers, GL codes, status enums
```

### TypeScript Types (core)
```typescript
interface Vendor {
  vendor_id: string;           // "V-001"
  vendor_name: string;         // BCS names
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  category: string[];          // ["Meso"], ["Riba"], ["Voće/Povrće"], etc.
  payment_terms: string;
  tax_id: string;
  approved_status: "Active" | "Probation" | "Suspended" | "Inactive";
  performance_score: number;   // 1-10
  onboarding_date: string;
}

interface VendorScorecard {
  vendor_id: string;
  month: string;               // "2026-03"
  delivery_score: number;      // 1-10
  accuracy_score: number;
  quality_score: number;
  pricing_score: number;
  responsiveness_score: number;
  overall_score: number;
  recommendation: "MAINTAIN" | "WATCH" | "REPLACE";
  ai_commentary: string;       // BCS
}

interface PurchaseOrder {
  po_number: string;           // "PO-2026-0047"
  date_created: string;
  vendor_id: string;
  vendor_name: string;
  department: string;
  total_amount: number;        // EUR
  status: "Pending Approval" | "Approved" | "Sent to Vendor" | "Partially Received" | "Fully Received" | "Closed" | "Cancelled";
  approved_by: string | null;
  approval_date: string | null;
  gl_account: string;          // "4010"
  items: POLineItem[];
  source: "Auto-Reorder" | "Manual" | "Emergency";
  requester: string;
  ai_note: string;             // BCS — AI's reasoning for this PO
}

interface POLineItem {
  item_name: string;           // BCS
  quantity: number;
  unit: string;                // "kg", "L", "kom" (pieces)
  unit_price: number;          // EUR
}

interface Invoice {
  invoice_id: string;          // "INV-2026-0091"
  vendor_invoice_number: string;
  vendor_id: string;
  vendor_name: string;
  po_number: string | null;
  invoice_date: string;
  received_date: string;
  total_amount: number;
  match_status: "Perfect Match" | "Minor" | "Major" | "Disputed" | "Pending Review";
  match_details: string;       // BCS — AI analysis
  gl_account: string;
  duplicate_flag: boolean;
  dispute_email_draft?: string; // BCS — AI-drafted email
}

interface InventoryItem {
  item_id: string;             // "PROT-001"
  item_name: string;           // BCS
  category: string;
  department: string;
  warehouse: string;           // "Kuhinja", "Centralni magacin", "Šank", "Housekeeping"
  unit_of_measure: string;
  par_level: number;
  reorder_point: number;
  reorder_quantity: number;
  current_stock: number;       // CAN BE NEGATIVE (recipe errors)
  preferred_vendor_id: string;
  preferred_vendor_name: string;
  unit_cost: number;
  ai_flag: string | null;      // BCS — AI's analysis if flagged
  negative_stock: boolean;
  ghost_surplus: boolean;
}

interface ReceivingRecord {
  receiving_id: string;
  po_number: string;
  vendor_id: string;
  date_received: string;
  received_by: string;         // Staff name
  items: ReceivingLineItem[];
  has_discrepancy: boolean;
  photos: string[];            // Base64 or URLs
}

interface ReceivingLineItem {
  item_name: string;
  expected_qty: number;
  received_qty: number;
  unit: string;
  quality_ok: boolean;
  quality_notes?: string;
  temperature_c?: number;
}

interface Contract {
  contract_id: string;
  vendor_id: string;
  vendor_name: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  status: "Active" | "Expiring" | "Expired" | "Renewed";
  days_until_expiry: number;
  total_value: number;
  key_terms: string;
}

interface AuditEntry {
  event_id: string;
  timestamp: string;
  event_type: string;
  actor: string;               // "System" | "AI" | "Controller" | person name
  reference_id: string;
  details: string;
  amount?: number;
}

interface OccupancyForecast {
  date: string;
  occupancy_pct: number;
  rooms_sold: number;
  total_rooms: 200;
  arrivals: number;
  departures: number;
  events: string[];            // BCS event names
}
```

---

## SAMPLE DATA REQUIREMENTS

Generate realistic sample data for Hotel Jadran. This data must feel real — use BCS for item names, vendor names that sound like real Balkan companies, realistic prices in EUR, and actual hotel procurement scenarios.

### Vendors (6-8 vendors)
Include a mix of categories: meat supplier, fish supplier, produce, dairy, beverages, cleaning/housekeeping supplies, dry goods. One vendor should be on "Probation" status with a lower performance score.

### Purchase Orders (12-15 POs)
Mix of statuses across the full lifecycle. Include:
- 2-3 POs pending approval (one >€2,000 needing Controller+GM, one €500-2,000 needing Dept Head)
- Several approved and sent to vendor
- Some partially and fully received
- 1 cancelled
- Mix of Auto-Reorder (most common), Manual, and 1 Emergency
- AI notes in BCS explaining reasoning (mention occupancy %, events like weddings/conferences, par levels)

### Invoices (8-10 invoices)
- 4-5 Perfect Match
- 1-2 Minor (small quantity discrepancies)
- 1 Major (price deviation from contract — like the Velpro butter example: contracted €5.50/kg, invoiced €6.90/kg)
- 1 Disputed (invoice with no matching PO — vendor claims phone order)
- Match details in BCS

### Inventory (15-20 items)
Across all warehouses (Kuhinja, Centralni magacin, Šank, Housekeeping).
**MUST include the recipe error scenario:**
- Piletina (PROT-001): stock at -12 kg, negative_stock: true, with full AI flag in BCS explaining the orada/chicken recipe error
- Orada svježa (FISH-003): stock at 25 kg (unchanged despite 35 portions sold), ghost_surplus: true, with AI flag
- Several items below reorder point
- Most items healthy

### Occupancy Forecast (14 days)
Varying between 60-95%. Include 2-3 events:
- "Vjenčanje Marković — 120 pax" on a Saturday
- "IT Konferencija — 80 pax" midweek
- Normal weekday/weekend variation

### Contracts (4-5 contracts)
One expiring in <30 days (urgent), one in 30-60 days, one in 60-90 days, rest safe.

### Audit Trail (20-30 entries)
Mix of: PO_CREATED, PO_APPROVED, PO_REJECTED, INVOICE_MATCHED, INVOICE_DISPUTED, REORDER_TRIGGERED, REORDER_BLOCKED, ANOMALY_DETECTED, REPORT_GENERATED, RECEIVING_CONFIRMED.

### GL Codes
```
4010 — Food Cost (Kitchen)
4020 — Beverage Cost (Bar)
4030 — Non-Alcoholic Beverage (Bar)
5020 — Guest Room Supplies (Rooms)
5030 — Housekeeping Supplies (Housekeeping)
5040 — Linen & Laundry (Rooms)
6010 — Repairs & Maintenance (Maintenance)
6500 — Office Supplies (Admin)
7010 — Spa Supplies (Spa)
```

---

## DESIGN DIRECTION

### Command Center (Desktop)
- **Dark theme** — this runs in an office/back-office environment, often on a secondary monitor
- **Professional, data-dense** — not consumer-friendly, this is an ops tool. Think Bloomberg terminal meets modern SaaS dashboard
- **Color semantics matter:** Red = critical/error/negative, Amber = warning/attention, Green = healthy/approved, Blue = info/pending, Purple = AI-generated content/decisions
- **Purple accent for AI** — whenever the system shows AI reasoning, AI recommendations, or AI-generated content, use a subtle purple tint/border to distinguish it from human-entered data
- **Typography:** Clean, professional. Monospace for IDs and numbers. Good hierarchy.
- **No rounded-everything cutesy design** — crisp, structured, grid-based

### Receiving Tablet App
- **Light theme** — used in bright kitchen/warehouse environments
- **BIG everything** — large buttons, large text, large touch targets
- **Step-by-step wizard** — never show the whole form at once, guide staff through one step at a time
- **High contrast** — needs to be readable in harsh kitchen lighting
- **Traffic light colors** for status: green = OK, yellow = discrepancy, red = quality issue
- **Minimal text input** — prefer taps, toggles, number pads over typing

---

## CRITICAL IMPLEMENTATION NOTES

1. **Data Service Abstraction is non-negotiable.** Every data read/write must go through the DataService interface. The sample data implementation should be the default, but the architecture must support swapping to Airtable or Abacus with zero UI changes. Use dependency injection or a simple factory pattern.

2. **EUR currency formatting everywhere.** Use `€` prefix, European number format (€1.850,00 — dot for thousands, comma for decimals). Helper function: `formatEUR(amount: number): string`.

3. **Offline support for receiving app.** Use IndexedDB (via idb or Dexie.js) to queue receiving records when offline. Show a sync indicator. Auto-submit when connection returns.

4. **Webhook format for receiving submissions.** When the receiving app submits, it should POST to a configurable webhook URL (environment variable). The payload format:
```json
{
  "receiving_id": "REC-2026-0001",
  "po_number": "PO-2026-0047",
  "vendor_id": "V-001",
  "date_received": "2026-03-26T14:30:00+02:00",
  "received_by": "Marko Petrović",
  "items": [
    {
      "item_name": "Pileća prsa",
      "expected_qty": 40,
      "received_qty": 38.5,
      "unit": "kg",
      "quality_ok": true,
      "temperature_c": 2.1
    }
  ],
  "has_discrepancy": true,
  "discrepancy_notes": "Pileća prsa — 1.5 kg manje od naručenog",
  "photos": ["base64..."]
}
```

5. **No authentication system needed yet.** The command center is used by 2-3 trusted people. The receiving app uses name selection (list of staff names). Full auth comes later.

6. **Responsive but not mobile-first for the command center.** Minimum 1024px width assumed. The receiving app IS tablet-first (768px-1024px optimized).

7. **All timestamps in Central European Time (CET/CEST).** The hotel is in the Balkans.

---

## WHAT TO BUILD FIRST

Start with the Command Center, get all 8 pages working with sample data and full interactivity (approve/reject POs, filter tables, open detail modals, navigate between pages). Then build the Receiving Tablet App as a separate route group sharing the same data layer.

Build it production-grade from the start — proper TypeScript types, proper component structure, proper state management. This is going to production at a real hotel.
