# HOTEL PROCUREMENT AUTOMATION — Project Knowledge Base

**Last Updated:** March 23, 2026
**Project Lead:** Martin Cupic
**Pilot Property:** Hotel Jadran (200 rooms)
**Status:** Phase 1B — Workflows built, connected to Airtable + Nanonets, prompt testing not yet started

---

## 1. PROJECT OVERVIEW

### What We're Building
An AI-powered system that fully automates the Hotel Purchasing Manager role across multiple hotel properties. The system handles: demand sensing from POS sales data, automated requisition validation, purchase order creation with tiered approvals, vendor invoice OCR and three-way matching, receiving verification, daily/weekly/monthly reporting, vendor scorecards, contract monitoring, anomaly detection, and recipe error detection.

### Business Case
| Item | Cost |
|------|------|
| Automation system (monthly) | €738–€1,418 |
| Human Purchasing Manager (monthly) | €5,208–€7,042 |
| **Net savings (monthly)** | **€3,790–€5,624** |
| **Net savings (annual)** | **€45,480–€67,488** |
| Additional indirect savings (duplicate prevention, waste detection, price compliance, demand forecasting) | €15,000–€60,000/year |

### Hotel Portfolio
- **Pilot property:** Hotel Jadran, 200 rooms
- **Total properties:** Multiple hotels
- **Systems:** Most properties run Abacus POS2 + Protel PMS; some have different systems
- **Currency:** EUR
- **Language:** All AI-generated outputs (reports, alerts, vendor emails, Slack messages) must be in Bosnian/Croatian/Serbian (BCS)
- **Rollout plan:** Prove at Hotel Jadran first, then deploy to other Abacus+Protel properties (2–3 weeks per additional property once pilot is stable)

### Team
- **Martin Cupic** — sole builder, project lead, handles all development, vendor communication, and system architecture
- **Hotel staff (advisory):** Finance Director provides expertise on hotel finance procedures, chart of accounts, approval workflows, and vendor contract terms. Chef provides recipe data and par levels. Other department heads will be onboarded as the system goes live.
- **No dedicated IT team** — Martin handles all technical implementation

---

## 2. SYSTEM ARCHITECTURE

### The Exact Stack

```
┌─────────────────────────────────────────────────┐
│              HOTEL OPERATIONS                    │
│                                                 │
│  Protel PMS          Abacus POS2                │
│  (occupancy,         (inventory, recipes,        │
│   events,             stock levels, supplier     │
│   revenue)            orders "Porudžba           │
│                       dobavljaču", auto-posts    │
│  [Separate provider]  to Abacus ERP Finance)    │
│                       [Provider: Bencom Ltd.]    │
└────────┬──────────────────────┬─────────────────┘
         │                      │
    [API TBD]            [API being built
     via Protel I/O       by Bencom — waiting
     — not yet started]   for quote]
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────┐
│              AUTOMATION LAYER                    │
│                                                 │
│  n8n (self-hosted on OrbStack, local machine)   │
│  13 workflows orchestrating everything          │
│                                                 │
│  Kimi K2.5 (Moonshot API) — LLM for all AI     │
│  decision nodes (NOT Claude API)                │
│                                                 │
│  Nanonets — invoice OCR                         │
│  Airtable — mock database (testing) + permanent │
│             audit trail, scorecards, decision log│
└────────┬──────────────────────┬─────────────────┘
         │                      │
         ▼                      ▼
┌──────────────────┐  ┌──────────────────────────┐
│  Slack            │  │  Future (Phase 3-4)      │
│  (approvals,      │  │  OpenClaw (autonomous    │
│   alerts,         │  │   monitoring agent)      │
│   reports)        │  │  ElevenLabs + Twilio     │
│  [NOT YET SET UP] │  │   (voice vendor calls)   │
└──────────────────┘  └──────────────────────────┘
```

### Component Details

| Component | Product | Provider | Status | Purpose |
|-----------|---------|----------|--------|---------|
| PMS | Protel PMS | Separate provider (not Bencom) | Production — no API access yet | Occupancy forecasts, group bookings, events, revenue data |
| POS / Inventory | Abacus POS2 | Bencom Ltd. IT | Production — API being scoped | Stock levels, recipes, ingredient depletion, supplier orders, vendor/item master data |
| Accounting | Abacus ERP Finance | Bencom Ltd. IT | Production | Receives automatic postings from POS2. We do NOT touch ERP directly. |
| Workflow Engine | n8n | Self-hosted (OrbStack, local) | Running — 13 workflows imported | Orchestrates all automation workflows |
| LLM | Kimi K2.5 (Moonshot AI) | Moonshot API | Account active — prompts not yet tested | AI decisions: validation, matching, GL coding, reporting, anomaly detection |
| Invoice OCR | Nanonets | Nanonets SaaS | Connected to n8n | Extracts structured data from vendor invoice PDFs |
| Database (test) | Airtable | Airtable SaaS | Connected to n8n, populated with sample data | Mock database for all testing; some tables permanent |
| Messaging | Slack | — | NOT YET SET UP | Approval workflows, alerts, daily reports |
| Voice Agent | ElevenLabs + Twilio | — | NOT YET STARTED (Phase 4) | Phone calls to vendors who don't use email |
| Autonomous Agent | OpenClaw | — | NOT YET STARTED (Phase 3-4) | Proactive monitoring, cron-based alerting via Slack/WhatsApp |

---

## 3. THE ABACUS API SITUATION

### Architecture Clarification (from Bencom)
Through email correspondence with Bencom (Abacus provider), the following was confirmed about Hotel Jadran's specific configuration:
- **Abacus POS2** handles ALL material/inventory tracking (not ERP Goods/Materials module — that module is NOT used at Hotel Jadran)
- **Protel PMS** is the property management system (not Abacus RMS — that is NOT used)
- **POS2 → ERP Finance** auto-posts all financial data (sales, supplier invoices at goods receipt)
- **POS2 → Protel PMS** auto-posts restaurant charges to guest folios
- **Protel PMS → ERP Finance** posts on a semi-automatic basis
- **Supplier purchase orders** ("Porudžba dobavljaču") were used in POS2 last season
- **Abacus ERP Goods/Materials module is NOT active** at Hotel Jadran

### Email Exchange Timeline

**Email 1 (us → Bencom):** Initial API access request.

**Email 2 (Bencom → us):** Confused — clarified they don't understand the need. Explained the real architecture (POS2 not ERP for materials, Protel not Abacus for PMS). Asked for more details.

**Email 3 (us → Bencom):** Detailed explanation with practical example (chicken at 15kg, minimum 30kg, occupancy 92% + wedding → AI calculates 80kg → system creates "Porudžba dobavljaču" in POS2). Listed exact data needs:
- READ from POS2: a) current stock, b) par levels, c) item master data, d) purchase prices + vendor data, e) consumption history, f) order history
- READ from Protel: g) occupancy forecast 7–14 days, h) group bookings and events
- WRITE to POS2: i) create "Porudžba dobavljaču" with line items

**Email 4 (Bencom → us):** No API exists for ANY of the above. However, they sent 7 scoping questions to evaluate building a custom API:
1. Sync frequency: real-time or intervals?
2. Consumption definition: POS sales only or including internal (izdatnice, kalo, rastur, reprezentacija)?
3. Stock by warehouse or aggregate?
4. UOM: tracking unit vs. selling unit differences?
5. Par levels: per item or per item/warehouse?
6. Price method: last price per item or per item/vendor?
7. History depth: how many months?

**Email 5 (us → Bencom):** Our answers:
1. **6-hour intervals** (4x daily: 06:00, 12:00, 18:00, 00:00)
2. **Total consumption** including internal usage (izdatnice, kalo, rastur, reprezentacija)
3. **Per warehouse** (centralni magacin, kuhinja, šank, etc.)
4. **Both UOM** with conversion factor (nabavna + prodajna jedinica)
5. **Per item/warehouse** (not just per item)
6. **Per item/vendor** (not just per item)
7. **12 months** (6 months acceptable as starting point if 12 is significantly more expensive)
8. **Additional request:** Include write endpoint for creating "Porudžba dobavljaču"

**Current status:** Waiting for Bencom's timeline and financial quote for custom API development.

### Protel PMS API
- Protel is a **separate provider** from Bencom
- Protel has an existing integration platform called **Protel I/O** with APIs based on HTNG/OTA standards
- Developer portal exists at **developer.protel.io**
- **We have NOT yet contacted Protel's developer team** — this is an open action item
- We need READ access only: occupancy forecasts and group/event bookings

---

## 4. WORKFLOW REGISTRY

### All 13 Workflows

| # | Name | Trigger | Key Nodes | Prompts Used | Status |
|---|------|---------|-----------|-------------|--------|
| 01 | Email Monitor | IMAP poll (invoices@hotel.com) | Email trigger → attachment extract → route by subject keywords | None | Imported, not fully tested |
| 02 | OCR Processing | Webhook from 01 | Send PDF to Nanonets → parse response → write to Airtable Invoice Log | None | Connected to Nanonets |
| 03 | Requisition Intake | Webhook (form submission) | Receive form → normalize data → read inventory from Airtable → route to 04 | None | Imported, not fully tested |
| 04 | AI Validation | Called from 03 | Kimi K2.5 validates requisition → route decision → Slack notify → Airtable audit | Prompt 1 | Imported, prompts not tested |
| 05 | Receiving Update | Webhook (tablet app) | Receive delivery data → compare to PO → update inventory → flag discrepancies → Kimi analyzes | Prompt 9 | Imported, not fully tested |
| 06 | PO Creation & Approval | Webhook from 03/08 | Generate PO → Airtable write → tiered Slack approval → Kimi drafts email → send to vendor → audit trail | Prompt 11 | Imported, prompts not tested |
| 07 | Three-Way Match | Webhook from 02 | Duplicate check → PO lookup → receiving lookup → contracted prices → GL mapping → Kimi match → 4-way route → dispute email | Prompts 2, 3 | Imported, prompts not tested |
| 08 | Auto-Reorder Scan | Cron 6:00 AM daily | Read below-par items → **NEGATIVE STOCK CHECK** → occupancy forecast → Kimi optimizes qty → trigger 06 for POs → summary | Prompts 10, 13 (safety) | Imported, prompts not tested |
| 09 | Daily Flash Report | Cron 7:00 AM daily | Aggregate POs + invoices + inventory + occupancy + budgets → Kimi generates report → email + Slack | Prompt 5 | Imported, prompts not tested |
| 10 | Vendor Scorecard | Cron 1st of month 8:00 AM | Loop active vendors → aggregate 30-day performance → Kimi scores → update Airtable → email vendor + Controller | Prompt 6 | Imported, prompts not tested |
| 11 | Contract Expiry Monitor | Cron 9:00 AM daily | Check Airtable contracts → 90-day alert → 60-day Kimi drafts renewal → 30-day GM escalation | Prompt 11 | Imported, prompts not tested |
| 12 | Anomaly Detection | Cron 10:00 PM nightly | Aggregate all data → **TWO parallel Kimi calls**: Prompt 8 (general anomalies) + Prompt 13 (recipe errors) → combine → Slack alert | Prompts 8, 13 | Imported, prompts not tested |
| 13 | Demand Forecast | Cron Sunday 6:00 PM | Occupancy + inventory + 4-week PO history → Kimi forecasts → color-coded urgency report → email + Slack | Prompt 7 | Imported, prompts not tested |

### Workflow Interconnections
```
03 Requisition Intake → 04 AI Validation → 06 PO Creation
08 Auto-Reorder Scan → 06 PO Creation (via webhook)
01 Email Monitor → 02 OCR Processing → 07 Three-Way Match
05 Receiving Update → feeds data for 07 and 12
09 Daily Flash Report ← reads from all Airtable tables
12 Anomaly Detection ← reads from all Airtable tables
```

---

## 5. PROMPT LIBRARY

All prompts target **Kimi K2.5** via Moonshot API. All must output BCS language. All must respond in valid JSON (except Prompt 5 which outputs plain text for email).

| # | Name | Workflow | Purpose |
|---|------|---------|---------|
| 1 | Requisition Validation | 04 | Evaluates purchase requisitions: APPROVE / REDUCE / REJECT / FLAG. Includes negative stock safety check. |
| 2 | Three-Way Invoice Match | 07 | Compares invoice ↔ PO ↔ receiving report. Classifies: PERFECT_MATCH / MINOR / MAJOR / DISPUTE. Drafts dispute emails. |
| 3 | GL Account Coding | 07 | Assigns GL account codes to invoice line items based on item category and department. |
| 4 | Vendor Quote Comparison | 06 | Compares multiple vendor quotes with weighted scoring: Price 50%, Delivery 25%, Reliability 25%. |
| 5 | Daily Flash Report | 09 | Generates concise daily procurement summary (<200 words) for Controller and GM. Plain text output. |
| 6 | Vendor Scorecard | 10 | Scores vendor performance 1–10 on delivery, accuracy, quality, pricing, responsiveness. Recommends MAINTAIN/WATCH/REPLACE. |
| 7 | Demand Forecast | 13 + 08 | Predicts ingredient/supply demand for coming week using occupancy + historical sales + events. |
| 8 | Anomaly Detection | 12 | Scans for 12 anomaly types including duplicates, price spikes, budget overruns, unauthorized vendors, negative stock, ghost surplus, recipe mismatches. |
| 9 | Receiving Discrepancy | 05 | Analyzes delivery discrepancies. Decides: ACCEPT_SHORT / REQUEST_CREDIT / REQUEST_REDELIVERY / REJECT. Drafts vendor email. |
| 10 | PO Quantity Optimizer | 08 | Calculates optimal order quantity factoring occupancy, events, perishability, MOQs. **CRITICAL: blocks orders for negative stock items (data_error: true).** |
| 11 | Vendor Email Drafter | 06, 07, 11 | Drafts professional vendor emails: RFQs, disputes, renewal proposals, delivery confirmations, onboarding requests. |
| 12 | Variance Analysis | OpenClaw/manual | Compares theoretical inventory (from POS recipes × sales) vs. actual physical counts. Identifies waste, theft, over-portioning. |
| 13 | Recipe Error Detection | 12, 08 | Detects POS2 recipe configuration errors: NEGATIVE_STOCK, PHANTOM_DEPLETION, GHOST_SURPLUS, COST_DISTORTION, ORPHAN_INGREDIENT, DUPLICATE_INGREDIENT. Provides POS2 Admin fix steps. |

### Prompt Testing Status
**None of the 13 prompts have been tested yet.** They are embedded in the n8n workflow HTTP Request nodes but have not been executed against Kimi K2.5 with sample data. This is the current priority.

### Critical Prompt Behaviors
- **Prompt 1** FLAGs (does not approve/reject) any item with negative stock
- **Prompt 10** returns `data_error: true` and `optimal_qty: 0` for negative stock items — this BLOCKS auto-reorder
- **Prompt 13** runs in parallel with Prompt 8 in Workflow 12, only when negative stock items are detected
- **Prompt 5** is the only prompt that outputs plain text (for email body); all others output JSON

---

## 6. RECIPE ERROR DETECTION SYSTEM

### The Real-World Scenario
At Hotel Jadran, a fish dish "Orada na žaru" had its POS2 recipe incorrectly configured with "Piletina 200g" (chicken) instead of the actual fish ingredient. This caused:
- Every sale of grilled sea bream depleted chicken stock instead of fish
- Chicken (piletina) stock went to -12 kg (physically impossible)
- Fish (orada) stock stayed unchanged at 25 kg despite 35 orders sold
- Average purchase cost of chicken became distorted
- Auto-reorder would have ordered chicken that wasn't actually needed
- Fish would have run out without any system warning

### Three-Layer Detection

| Layer | Workflow | Time | What Happens |
|-------|----------|------|-------------|
| Immediate block | 08 Auto-Reorder Scan | 6:00 AM | Sees chicken at -12 kg → `IF Negative Stock` node → BLOCKS auto-order → Slack alert: "NEGATIVE STOCK DETECTED — do not order manually" |
| Full forensic diagnosis | 12 Anomaly Detection | 10:00 PM | `IF Has Negative Stock` → triggers Prompt 13 → cross-references sales data + recipe config + stock movement → identifies exact recipe error → provides POS2 Admin fix steps |
| Morning report inclusion | 09 Daily Flash Report | 7:00 AM | Includes negative stock items and data integrity alerts in daily summary to Controller |

### Slack Alert Format (BCS)
```
🚨 NEGATIVAN STOK DETEKTOVAN — Piletina (PROT-001)

Trenutno stanje: -12 kg (fizički nemoguće)
Ovo NIJE stvarni manjak — ne naručivati ručno.

Vjerovatni uzrok: Greška u konfiguraciji recepta u POS2.
Auto-narudžba je SUSPENDOVANA za ovaj artikal.

@controller @chef
```

---

## 7. AIRTABLE DATABASE SCHEMA

### Tables and Key Fields

**Vendor Master**
vendor_id, vendor_name, contact_name, contact_email, contact_phone, address, category (multi-select), payment_terms, tax_id, w9_received, insurance_received, insurance_expiry, food_safety_cert, approved_status (Active/Probation/Suspended/Inactive), brand_approved, performance_score (1-10), onboarding_date, documents (attachments)

**Vendor Contracts**
contract_id, vendor (link), contract_type, start_date, end_date, auto_renew, renewal_notice_days, total_value, price_escalation, key_terms, document, alert_90_sent, alert_60_sent, alert_30_sent, status (Active/Expiring/Expired/Renewed)

**Contract Line Items (Pricing)**
line_id, contract (link), vendor (link), item_name, item_sku, unit_of_measure, contracted_price, effective_date, expiry_date, category

**GL Account Mapping**
mapping_id, department, item_category, gl_account_code, gl_account_name, budget_monthly

**PO Log**
po_number (PO-YYYY-NNNN), date_created, vendor (link), department, total_amount, status (Pending Approval/Approved/Sent to Vendor/Partially Received/Fully Received/Closed/Cancelled), approved_by, approval_date, gl_account, items_json, source (Auto-Reorder/Manual/Emergency), requester

**Receiving Log**
receiving_id, po_number (link), vendor (link), date_received, received_by, items_received_json, discrepancy (checkbox), discrepancy_notes, temperature_log, quality_issues, photos

**Invoice Log**
invoice_id, vendor_invoice_number, vendor (link), po_number (link), invoice_date, received_date, total_amount, match_status (Perfect Match/Minor/Major/Disputed/Pending Review), match_details_json, gl_account, approved, approved_by, posted_to_accounting, duplicate_flag, ocr_raw_json

**Audit Trail**
event_id, timestamp, event_type, actor (System/AI/Controller name/etc.), reference_id, details, amount

**Non-F&B Inventory (Par Levels)**
item_id, item_name, category, department, unit_of_measure, par_level, reorder_point, reorder_quantity, current_stock, last_counted, preferred_vendor (link), unit_cost, sku

**Occupancy Forecast**
date, occupancy_pct, rooms_sold, total_rooms, arrivals, departures, events

### Airtable Persistence Strategy
When Abacus API is delivered, most Airtable tables will be replaced by live Abacus data reads. **Tables that REMAIN permanently in Airtable:**
- Audit Trail (Abacus has no procurement-specific audit log)
- Vendor Scorecards (AI-generated scores, not standard ERP data)
- Kimi Decision Log (every AI decision stored for review)
- Contract Expiry Tracking (unless Abacus tracks natively)

---

## 8. KIMI K2.5 API INTEGRATION

### Connection Details
| Parameter | Value |
|-----------|-------|
| Endpoint | `https://api.moonshot.ai/v1/chat/completions` |
| Authentication | `Authorization: Bearer $MOONSHOT_API_KEY` |
| Model | `kimi-k2.5` |
| Content-Type | `application/json` |
| Thinking mode | `"thinking": {"type": "disabled"}` (required for clean JSON output) |
| Context window | 256K tokens |

### Request Format (OpenAI-compatible)
```json
{
  "model": "kimi-k2.5",
  "max_tokens": 1000,
  "thinking": {"type": "disabled"},
  "messages": [
    {"role": "system", "content": "System prompt here..."},
    {"role": "user", "content": "User message with {{variables}}..."}
  ]
}
```

**CRITICAL differences from Anthropic/Claude format:**
- System prompt is a message with `role: "system"` in the messages array (NOT a top-level `system` field)
- Response is at `response.choices[0].message.content` (NOT `response.content[0].text`)
- Must include `"thinking": {"type": "disabled"}` to prevent reasoning tokens from polluting JSON output
- Add explicit instruction in every system prompt: "You MUST respond with valid JSON only. No markdown code blocks, no backticks, no explanation outside the JSON. Raw JSON only."

### Nodes to Configure
**11 HTTP Request nodes** across workflows 06–13 that call Kimi K2.5:
- 06: "Claude - Draft PO Email"
- 07: "Claude - Three-Way Match (Prompt 2+3)"
- 08: "Claude - Optimize Order Qty (Prompt 10)"
- 09: "Claude - Generate Flash Report (Prompt 5)"
- 10: "Claude - Score Vendor (Prompt 6)"
- 11: "Claude - Draft Renewal Proposal (Prompt 11)"
- 12: "Claude - Anomaly Detection (Prompt 8)" AND "Claude - Recipe Error Detection (Prompt 13)"
- 13: "Claude - Demand Forecast (Prompt 7)"

**8 Code parse nodes** that extract the response — all must use:
```javascript
const content = response.choices[0].message.content;
const parsed = JSON.parse(content.replace(/```json|```/g, '').trim());
```

Note: Node names still say "Claude" — these are display names only. The actual API calls go to Moonshot/Kimi.

---

## 9. DATA ADAPTER STRATEGY

### Current State (Testing)
```
All 13 workflows → Read/Write → Airtable (sample data)
```

### Future State (Production)
```
Workflows → Read → Abacus POS2 API (stock, items, vendors, consumption, orders)
Workflows → Read → Protel PMS API (occupancy, events)
Workflows → Write → Abacus POS2 API ("Porudžba dobavljaču")
Workflows → Read/Write → Airtable (audit trail, scorecards, decision log only)
```

### The Swap Process
When Abacus delivers the API:
1. Replace Airtable GET nodes (inventory reads) with HTTP Request nodes pointing at Abacus POS2 endpoints
2. Replace Airtable GET nodes (vendor/price reads) with Abacus endpoints
3. Add HTTP Request POST node for creating "Porudžba dobavljaču" in POS2
4. Keep all Kimi K2.5 prompts, Slack nodes, OCR pipeline, and reporting logic unchanged
5. Keep Airtable for audit trail, scorecards, and decision logs

When Protel API is obtained:
1. Replace Airtable GET nodes (occupancy/events) with Protel I/O API endpoints
2. Everything else stays the same

---

## 10. IMPLEMENTATION TIMELINE & CURRENT STATUS

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Accounts, n8n deployment, Airtable setup | ✅ DONE — n8n on OrbStack, Airtable populated, Nanonets connected |
| **Phase 1A** | Prompt library (13 prompts) | ✅ WRITTEN — not yet tested against Kimi K2.5 |
| **Phase 1B** | Core workflows (13 total) | ✅ BUILT — 01-05 built by Martin, 06-13 delivered as JSON, all imported into n8n, connected to Airtable + Nanonets |
| **Phase 1C** | Receiving tablet app (React PWA) | ❌ NOT STARTED |
| **Phase 1D** | Slack integration | ❌ NOT STARTED — no channels created yet |
| **Phase 1E** | End-to-end testing with sample data | ❌ NOT STARTED — blocked by prompt testing |
| **Phase 2** | Abacus POS2 API integration | ⏳ BLOCKED — waiting for Bencom quote/timeline |
| **Phase 2B** | Protel PMS API integration | ❌ NOT STARTED — haven't contacted Protel dev team yet |
| **Phase 3** | Intelligence layer (scorecards, forecasting, anomaly detection) | Workflows BUILT, not connected to live data |
| **Phase 4** | ElevenLabs voice agent + OpenClaw autonomous monitoring | ❌ NOT STARTED |

### Immediate Priorities (in order)
1. **Test all 13 Kimi K2.5 prompts** with sample data — verify JSON format, decision accuracy, BCS language output
2. **Create Slack workspace and channels** — #procurement-alerts, #procurement-approvals, #procurement-reports — connect to n8n
3. **Run end-to-end tests** — requisition → PO → receiving → invoice → match → report cycle with sample data
4. **Contact Protel developer team** for occupancy/events API access
5. **Respond to Abacus quote** when received — negotiate multi-property pricing

---

## 11. DOCUMENTS PRODUCED

| Filename | Type | Contents |
|----------|------|----------|
| Hotel_AI_Disruption_Report_Expanded.pdf | PDF (115KB) | AI disruption analysis of 39 hotel roles across 11 departments with replacement ratings |
| Hotel_Purchasing_Manager_Automation_Blueprint.pdf | PDF (64KB) | Complete automation blueprint: 6-layer architecture, 36 tasks mapped, POS integration, cost analysis |
| Hotel_Purchasing_Manager_Automation_Blueprint.md | Markdown | Same content as PDF, markdown format |
| Hotel_PM_Automation_Development_Plan.md | Markdown (64KB) | 27 development steps across 4 phases, ~218 hours estimated, exact configs and code for each step |
| Hotel_PM_Automation_Practical_Reality_Guide.md | Markdown (30KB) | Real-world implementation guide: how to find hotel partners, get API access, what Claude Code can build |
| Hotel_PM_Automation_Protel_Implementation.md | Markdown (21KB) | Protel-specific guide (superseded by Abacus discovery — Protel is PMS only, not POS) |
| Hotel_PM_Next_Steps_Build_Now.md | Markdown (24KB) | Sample data specs, day-by-day schedule, 19-case test matrix, mock data strategy |
| Claude_API_Prompt_Library.md | Markdown | All 12 original prompts with full system prompts, user templates, expected outputs, test cases |
| Prompt_Library_Update_Recipe_Error_Detection.md | Markdown | Prompt 13 + updates to Prompts 1, 8, 10 for negative stock/recipe error handling |
| 06-PO-Creation-Approval.json | n8n JSON (12KB) | 15 nodes — PO generation, tiered Slack approval, vendor email |
| 07-Three-Way-Match.json | n8n JSON (20KB) | 22 nodes — duplicate check, PO/receiving/price lookup, Kimi match, dispute routing |
| 08-Auto-Reorder-Scan.json | n8n JSON (13KB) | 14 nodes — daily par scan, negative stock block, occupancy-adjusted quantities |
| 09-Daily-Flash-Report.json | n8n JSON (12KB) | 12 nodes — data aggregation, Kimi report generation, email + Slack distribution |
| 10-Vendor-Scorecard.json | n8n JSON (10KB) | 11 nodes — vendor loop, performance aggregation, Kimi scoring, email distribution |
| 11-Contract-Expiry-Monitor.json | n8n JSON (8KB) | 11 nodes — daily expiry check, tiered alerts (90/60/30 day), renewal proposal drafting |
| 12-Anomaly-Detection.json | n8n JSON (17KB) | 13 nodes — parallel Kimi calls (Prompt 8 + Prompt 13), combined alert output |
| 13-Demand-Forecast.json | n8n JSON (11KB) | 10 nodes — weekly forecast with occupancy + history + events, color-coded urgency |

---

## 12. OPEN ITEMS & BLOCKERS

### Blockers
| Item | Blocked By | Impact |
|------|-----------|--------|
| Abacus POS2 API | Waiting for Bencom quote and development timeline | Cannot connect to live inventory, stock, vendor, or PO data |
| Protel PMS API | Haven't contacted Protel dev team yet | Cannot get real occupancy forecasts or event data |

### Action Items
| Priority | Task | Status |
|----------|------|--------|
| 🔴 HIGH | Test all 13 Kimi K2.5 prompts with sample data | Not started |
| 🔴 HIGH | Create Slack workspace + 3 channels + connect to n8n | Not started |
| 🔴 HIGH | Run end-to-end test: requisition → PO → receiving → invoice → match | Not started |
| 🟡 MEDIUM | Contact Protel developer team for API access (occupancy + events) | Not started |
| 🟡 MEDIUM | Build receiving tablet app (React PWA) | Not started |
| 🟡 MEDIUM | Upload real Hotel Jadran invoices to Nanonets for OCR training | Not started — still using sample PDFs |
| 🟡 MEDIUM | Configure OpenClaw with procurement persona + cron jobs | Not started |
| 🟡 MEDIUM | Respond to Abacus quote when received — negotiate multi-property pricing | Waiting on Bencom |
| 🟢 LOW | Configure ElevenLabs voice agent for vendor phone calls | Phase 4 |
| 🟢 LOW | Deploy n8n to production server (currently local OrbStack) | After testing complete |

### Known Technical Debt
- All n8n workflow AI nodes still display "Claude" in their names — these are Kimi K2.5 calls (cosmetic, not functional)
- Workflows 06–13 were generated with Anthropic API format — need to verify all 11 HTTP Request nodes and 8 parse nodes are correctly using Kimi K2.5 format (OpenAI-compatible)
- Prompts are written in English — need to add BCS language instructions to all 13 system prompts
- Approval thresholds use $ — need to convert to € across all workflows
- PO number format uses US date style — may need to adapt to European format

---

## 13. TECHNICAL CONVENTIONS

### PO Number Format
`PO-YYYY-NNNN` (e.g., PO-2026-0001)

### Approval Tiers
| Amount (EUR) | Approver | Method |
|-------------|----------|--------|
| < €500 | Auto-approved | Sent to vendor immediately |
| €500–€2,000 | Department Head | Slack one-tap approval |
| €2,000–€5,000 | Controller | Slack with full PO details |
| > €5,000 | Controller + GM | Sequential Slack approvals |

### Cron Schedule (all times local)
| Time | Workflow | Function |
|------|----------|----------|
| 6:00 AM daily | 08 Auto-Reorder Scan | Check par levels, generate POs |
| 7:00 AM daily | 09 Daily Flash Report | Generate and distribute daily summary |
| 9:00 AM daily | 11 Contract Expiry Monitor | Check for expiring contracts |
| 10:00 PM nightly | 12 Anomaly Detection | Scan for errors and anomalies |
| 6:00 PM Sunday | 13 Demand Forecast | Generate weekly demand forecast |
| 8:00 AM 1st of month | 10 Vendor Scorecard | Generate monthly vendor scores |

### GL Code Structure (Hotel Jadran)
| Code | Name | Department |
|------|------|-----------|
| 4010 | Food Cost | Kitchen |
| 4020 | Beverage Cost | Bar |
| 4030 | Non-Alcoholic Beverage | Bar |
| 5020 | Guest Room Supplies | Rooms |
| 5030 | Housekeeping Supplies | Housekeeping |
| 5040 | Linen & Laundry | Rooms |
| 6010 | Repairs & Maintenance | Maintenance |
| 6500 | Office Supplies | Admin |
| 7010 | Spa Supplies | Spa |

---

*This document is the single source of truth for the Hotel Procurement Automation project. Update it as decisions are made and systems come online.*
