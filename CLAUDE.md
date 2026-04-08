# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hotel Jadran Procurement Automation — an AI-powered procurement system for a 200-room hotel. Replaces manual procurement workflows using n8n, Kimi K2.5 LLM (not Claude), Nanonets OCR, Airtable, and a Next.js dashboard.

The **master documentation** is in `/PROJECT_KNOWLEDGE_BASE.md` (494 lines) — read it first for deep context. `/COMMAND_CENTER_CONNECTION_SPEC.md` covers the frontend-backend API integration spec.

## Commands

### Frontend (Next.js)
```bash
cd Interface
npm run dev        # Dev server on port 3000 (Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npm start          # Production server
```

### n8n / Docker
```bash
./scripts/setup-n8n.sh             # One-command n8n + PostgreSQL setup
cd docker/n8n && docker compose up -d   # Start containers
docker compose logs -f n8n              # Follow n8n logs
```

n8n runs on `http://localhost:5678`.

## Architecture

```
Abacus POS2 ──→ n8n (13 workflows) ──→ Airtable (8 tables)
                    │                        ↑
                Kimi K2.5 LLM          Next.js frontend
                Nanonets OCR           (API routes proxy Airtable)
                    │
                PostgreSQL (workflow state)
                Slack (approvals/alerts)
```

**Two frontend apps** share the same Next.js codebase via route groups:
- `app/(dashboard)/` — Procurement Command Center (KPIs, POs, invoices, inventory, vendors, reports, audit)
- `app/(receiving)/prijem/` — Receiving Tablet App (PIN login, delivery wizard, quantity confirmation)

**Airtable API proxy** at `app/api/airtable/[table]/route.ts` — all CRUD routes forward to Airtable REST API using `AIRTABLE_PAT`. Base ID: `appjHlTQID87ODAJL`.

**Global state** managed by Zustand in `src/stores/app-store.ts` (filters, modals, receiving wizard steps).

**Sample/mock data** lives in `src/data/sample/` — used for development while real API integrations are pending.

## Critical: Kimi K2.5 LLM (NOT Claude API)

All AI decisions use **Kimi K2.5** via Moonshot API — format differs from Anthropic:

- Endpoint: `https://api.moonshot.ai/v1/chat/completions`
- System prompt goes **inside the `messages` array** (not top-level)
- Response path: `response.choices[0].message.content` (not `response.content[0].text`)
- Always set `thinking: {type: disabled}` and request raw JSON output
- All prompt outputs must be in **Bosnian/Croatian/Serbian (BCS)**

## Key Constants & Business Rules

- **Currency:** EUR (€) throughout
- **Approval tiers** (from `src/lib/constants.ts`):
  - < €500 → auto-approved
  - €500–€2,000 → Department Head (Slack)
  - €2,000–€5,000 → Controller (Slack)
  - > €5,000 → Controller + GM (sequential)
- **Airtable Base ID:** `appjHlTQID87ODAJL`
- **GL codes**, staff names, warehouse IDs, department codes all defined in `src/lib/constants.ts`

## n8n Workflows

13 workflows in `/n8n-workflows/` (exported JSON, importable into n8n UI):

| File | Purpose | Trigger |
|------|---------|---------|
| `01-email-monitor.json` | IMAP → attachment extraction | Cron |
| `02-ocr-processing.json` | PDF → Nanonets → Airtable | Webhook from WF01 |
| `03-requisition-intake.json` | Form submission → validation | Webhook |
| `04-ai-validation.json` | Kimi K2.5 requisition decision | Webhook from WF03 |
| `05-receiving-update.json` | Tablet delivery receipt → inventory | Webhook |

Workflows 06–13 cover PO creation, three-way match, auto-reorder, daily flash report, vendor scorecards, contract expiry, anomaly detection, and demand forecasting.

## Airtable Schema

8 tables defined in `/airtable-schemas/*.json`. Key tables:
- `purchase-orders` — POs with line items, status, approval chain
- `invoice-log` — OCR-extracted invoices with match status
- `requisitions` — pending approval requests
- `inventory` — stock levels + par levels (negative stock triggers auto-reorder)
- `vendor-master`, `contract-tracker`, `deliveries`, `gl-mapping`

Field names are **case-sensitive** — refer to `/COMMAND_CENTER_CONNECTION_SPEC.md` for exact field names.

## Environment Variables

**Frontend** (`.env.local` in `Interface/`):
```
AIRTABLE_PAT=
AIRTABLE_BASE_ID=appjHlTQID87ODAJL
NEXT_PUBLIC_RECEIVING_WEBHOOK_URL=http://localhost:5678/webhook/receiving
```

**n8n** (`.env` in `docker/n8n/`, see `.env.example`):
```
POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB
N8N_ENCRYPTION_KEY          # openssl rand -hex 32
N8N_BASIC_AUTH_USER / N8N_BASIC_AUTH_PASSWORD
MOONSHOT_API_KEY            # Kimi K2.5
WEBHOOK_URL                 # Public URL for n8n webhooks
```

## Current Status

**Done:** n8n self-hosted, Airtable schemas (8 tables), all 13 workflows imported, Nanonets OCR connected, Next.js dashboard + receiving app built, 13 AI prompts written.

**Pending:** Prompt testing against live Kimi K2.5, Slack integration, end-to-end test cycle, Abacus POS2 API (waiting on vendor quote), Protel PMS API.
