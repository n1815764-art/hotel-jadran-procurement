# Hotel Purchasing Manager Automation

**Complete automation of hotel procurement — from POS-driven demand sensing through AI-powered vendor management.**

## 🎯 Project Goal
Replace 85-90% of the Hotel Purchasing Manager role with an integrated system of:
- POS integration (Toast/Simphony/Mews)
- OpenClaw + Claude AI (decision brain)
- n8n (workflow orchestration)
- AI OCR (invoice processing)
- ElevenLabs voice (vendor calls)

## 📋 Implementation Phases

### Phase 1 — Foundation (Weeks 1-4)
- [ ] Deploy n8n self-hosted
- [ ] Set up OpenClaw with persistent memory
- [ ] Configure email monitoring (invoices@hotel.com)
- [ ] Airtable databases: vendor master, contracts, GL mapping
- [ ] Connect POS API to inventory platform
- [ ] Digital requisition intake form
- [ ] Nanonets/Rossum OCR setup

**Deliverables:**
- `n8n-workflows/01-email-monitor.json`
- `airtable-schemas/vendors.json`
- `claude-prompts/requisition-validator.md`
- `scripts/setup-n8n.sh`

### Phase 2 — Core Automation (Weeks 5-8)
- [ ] PO creation workflow
- [ ] Tiered approval routing ($500/$2K/$5K thresholds)
- [ ] POS-driven auto-reorder for F&B
- [ ] Three-way matching logic
- [ ] Automated GL coding
- [ ] Digital receiving app
- [ ] Daily flash report

**Deliverables:**
- `n8n-workflows/02-po-creation.json`
- `n8n-workflows/03-three-way-match.json`
- `src/api/receiving-app/`
- `claude-prompts/gl-coder.md`

### Phase 3 — Intelligence Layer (Weeks 9-12)
- [ ] Claude-powered vendor comparison
- [ ] Automated vendor scorecards
- [ ] POS + PMS demand forecasting
- [ ] Anomaly detection
- [ ] Variance reporting
- [ ] Contract expiry monitoring

**Deliverables:**
- `claude-prompts/vendor-comparison.md`
- `n8n-workflows/04-scorecards.json`
- `src/api/forecasting/`

### Phase 4 — Voice & Advanced (Weeks 13-16)
- [ ] ElevenLabs Conversational AI
- [ ] Twilio integration
- [ ] Competitive quote sourcing
- [ ] Market price intelligence
- [ ] Seasonal par adjustments

**Deliverables:**
- `src/integrations/elevenlabs/`
- `claude-prompts/voice-agent.md`
- `n8n-workflows/05-voice-calls.json`

## 🏗️ Architecture

```
POS System (Toast/Simphony)
    ↓
Inventory Intelligence (MarketMan/xtraCHEF/WISK)
    ↓
n8n Workflow Engine ←→ OpenClaw + Claude API
    ↓
Vendor Systems ←→ Accounting (M3/Sage)
```

## 📁 Project Structure

```
.
├── n8n-workflows/          # Exported n8n workflow JSONs
├── claude-prompts/         # System prompts for Claude API calls
├── airtable-schemas/       # Airtable base schemas
├── docs/                   # Documentation
├── scripts/                # Setup and utility scripts
└── src/                    # Custom code
    ├── api/                # REST APIs
    ├── integrations/       # Third-party connectors
    └── web/                # Dashboard UI
```

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   ./scripts/setup-n8n.sh
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Import n8n workflows:**
   ```bash
   n8n import:workflow --input ./n8n-workflows/
   ```

## 💰 Expected ROI

- **Monthly automation cost:** $738-$1,418
- **Human cost replaced:** $5,208-$7,042/month
- **Net monthly savings:** $3,790-$5,624
- **Annual savings:** $45,480-$67,488
- **Additional indirect savings:** $15,000-$60,000/year

---

*Based on the Hotel Purchasing Manager Automation Blueprint, February 2026*
