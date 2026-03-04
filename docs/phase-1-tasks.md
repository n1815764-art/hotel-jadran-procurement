# Phase 1 Implementation Tasks

## Week 1: Infrastructure Setup

### Task 1.1: n8n Self-Hosted Deployment
**Complexity:** Medium  
**Model:** Sonnet 4.6

Create Docker Compose setup for n8n with:
- PostgreSQL database
- Persistent volume for workflows
- Environment configuration
- Reverse proxy (optional)

**Files to create:**
- `scripts/setup-n8n.sh` - One-command setup
- `docker/n8n/docker-compose.yml`
- `docker/n8n/.env.example`

---

### Task 1.2: Airtable Database Schema
**Complexity:** Medium  
**Model:** Sonnet 4.6

Create schema definitions for:

1. **Vendor Master Table**
   - Vendor ID, Name, Contact Info
   - Contract pricing by SKU
   - Payment terms
   - Insurance/certification expiry dates
   - Performance scores

2. **Contract Tracker**
   - Contract ID, Vendor reference
   - Start date, End date
   - Auto-renewal flag
   - Pricing terms (JSON)

3. **GL Mapping Table**
   - Department + Category → GL Code
   - Budget targets

4. **Purchase Orders**
   - PO number, Vendor, Items, Status
   - Approval workflow state

5. **Invoice Log**
   - Invoice number, Vendor, Amount
   - Match status, GL codes

**Files to create:**
- `airtable-schemas/vendor-master.json`
- `airtable-schemas/contract-tracker.json`
- `airtable-schemas/gl-mapping.json`
- `airtable-schemas/purchase-orders.json`
- `airtable-schemas/invoice-log.json`
- `scripts/create-airtable-bases.js`

---

### Task 1.3: Email Ingestion System
**Complexity:** High  
**Model:** Opus 4.6

Build n8n workflow that:
1. Monitors invoices@hotel.com via IMAP
2. Extracts PDF attachments
3. Stores to temporary storage
4. Triggers OCR processing
5. Creates initial invoice record in Airtable
6. Handles multiple attachment types (PDF, image, email body)
7. Error handling and retry logic

**Files to create:**
- `n8n-workflows/01-email-monitor.json`
- `src/api/email-parser/index.js`
- `scripts/test-email-ingestion.js`

---

## Week 2: Core Integrations

### Task 2.1: Nanonets OCR Integration
**Complexity:** High  
**Model:** Opus 4.6

Build invoice OCR pipeline:
1. Send PDF to Nanonets API
2. Extract structured data:
   - Vendor name, Invoice number, Date
   - Line items (description, qty, unit price, total)
   - Subtotal, Tax, Total
   - Payment terms
3. Validate extraction confidence scores
4. Handle multi-page invoices
5. Fallback to Claude for low-confidence fields

**Files to create:**
- `src/integrations/nanonets/client.js`
- `src/integrations/nanonets/invoice-parser.js`
- `n8n-workflows/02-ocr-processing.json`
- `claude-prompts/ocr-fallback.md`

---

### Task 2.2: Requisition Intake Form
**Complexity:** Medium  
**Model:** Sonnet 4.6

Create web form for non-F&B requisitions:
- Department dropdown
- Item name/SKU
- Quantity requested
- Urgency level (routine/urgent/emergency)
- Date needed
- Justification
- Requester info

Form submits to n8n webhook → Airtable

**Files to create:**
- `src/web/requisition-form/index.html`
- `src/web/requisition-form/app.js`
- `n8n-workflows/03-requisition-intake.json`

---

## Week 3: AI Validation Layer

### Task 3.1: Claude Requisition Validator
**Complexity:** High  
**Model:** Opus 4.6

Build AI validation system:
1. Query current inventory from Airtable
2. Query par levels
3. Query 7-day usage average
4. Query occupancy forecast (PMS integration stub)
5. Send to Claude with structured prompt
6. Parse JSON response: APPROVE/REDUCE/REJECT
7. Log decision with reasoning

**Files to create:**
- `src/api/validator/index.js`
- `claude-prompts/requisition-validator.md`
- `n8n-workflows/04-ai-validation.json`
- `scripts/test-validator.js`

---

### Task 3.2: Digital Receiving App
**Complexity:** Medium  
**Model:** Sonnet 4.6

Tablet-friendly web app for receiving:
1. Scan delivery ticket barcode or photo
2. Pull up matching PO
3. Confirm/modify received quantities
4. Flag quality issues with photos
5. Bluetooth temperature probe integration (optional)
6. Digital signature capture
7. Auto-update inventory

**Files to create:**
- `src/web/receiving-app/index.html`
- `src/web/receiving-app/app.js`
- `src/api/receiving/index.js`
- `n8n-workflows/05-receiving-update.json`

---

## Week 4: POS Integration Foundation

### Task 4.1: POS API Connector (Stub)
**Complexity:** High  
**Model:** Opus 4.6

Create abstraction layer for POS APIs:
- Toast POS API client
- Oracle Simphony API client (stub)
- Mews API client (stub)
- Unified interface for:
  - Sales data retrieval
  - Ingredient depletion calculation
  - Recipe costing
  - Inventory levels

**Files to create:**
- `src/integrations/pos/base-client.js`
- `src/integrations/pos/toast-client.js`
- `src/integrations/pos/simphony-client.js`
- `src/integrations/pos/mews-client.js`
- `src/integrations/pos/index.js`

---

### Task 4.2: Inventory Intelligence Layer
**Complexity:** High  
**Model:** Opus 4.6

Connect POS to par-level monitoring:
1. Receive POS sales webhook
2. Calculate ingredient depletion by recipe
3. Update current stock in Airtable
4. Check against par levels
5. Trigger auto-reorder webhook when below threshold
6. Factor in pending POs

**Files to create:**
- `src/api/inventory/index.js`
- `src/api/inventory/recipe-calculator.js`
- `n8n-workflows/06-par-monitor.json`
- `scripts/setup-pos-webhook.sh`

---

## Phase 1 Completion Checklist

- [ ] n8n running locally with PostgreSQL
- [ ] Airtable bases created with all schemas
- [ ] Email monitoring workflow active
- [ ] OCR extraction working end-to-end
- [ ] Requisition form deployed
- [ ] AI validation responding correctly
- [ ] Receiving app functional on tablet
- [ ] POS connector tested with sample data
- [ ] Par-level monitoring triggering alerts

## Next: Phase 2

After Phase 1 completion, proceed to:
- PO creation and approval workflows
- Three-way matching
- Automated GL coding
- Daily flash reports
