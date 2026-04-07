import type { WorkflowStatus, IntegrationStatus } from "@/types";

export const sampleWorkflows: WorkflowStatus[] = [
  { id: "WF-01", name: "Email Monitor", last_run: "2026-03-25T12:00:00+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-02", name: "OCR Processing", last_run: "2026-03-25T10:30:00+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-03", name: "Requisition Intake", last_run: "2026-03-25T09:00:00+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-04", name: "AI Validation", last_run: "2026-03-25T09:00:05+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-05", name: "Receiving Update", last_run: "2026-03-23T10:00:00+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-06", name: "PO Creation & Approval", last_run: "2026-03-25T09:00:10+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-07", name: "Three-Way Match", last_run: "2026-03-25T10:30:05+02:00", status: "active", next_scheduled: null, trigger_type: "webhook" },
  { id: "WF-08", name: "Auto-Reorder Scan", last_run: "2026-03-25T06:00:00+02:00", status: "active", next_scheduled: "2026-03-26T06:00:00+02:00", trigger_type: "cron" },
  { id: "WF-09", name: "Daily Flash Report", last_run: "2026-03-25T07:00:00+02:00", status: "active", next_scheduled: "2026-03-26T07:00:00+02:00", trigger_type: "cron" },
  { id: "WF-10", name: "Vendor Scorecard", last_run: "2026-03-01T08:00:00+02:00", status: "active", next_scheduled: "2026-04-01T08:00:00+02:00", trigger_type: "cron" },
  { id: "WF-11", name: "Contract Expiry Monitor", last_run: "2026-03-25T09:00:00+02:00", status: "active", next_scheduled: "2026-03-26T09:00:00+02:00", trigger_type: "cron" },
  { id: "WF-12", name: "Anomaly Detection", last_run: "2026-03-24T22:00:00+02:00", status: "active", next_scheduled: "2026-03-25T22:00:00+02:00", trigger_type: "cron" },
  { id: "WF-13", name: "Demand Forecast", last_run: "2026-03-22T18:00:00+02:00", status: "active", next_scheduled: "2026-03-29T18:00:00+02:00", trigger_type: "cron" },
];

export const sampleIntegrations: IntegrationStatus[] = [
  { name: "n8n", status: "connected", last_check: "2026-03-25T12:00:00+02:00", details: "Running on OrbStack (localhost:5678). 13 workflows active." },
  { name: "Airtable", status: "connected", last_check: "2026-03-25T12:00:00+02:00", details: "Connected. 10 tables populated with sample data." },
  { name: "Nanonets (OCR)", status: "connected", last_check: "2026-03-25T11:00:00+02:00", details: "OCR model trained. Processing invoices." },
  { name: "Kimi K2.5 (Moonshot)", status: "connected", last_check: "2026-03-25T09:00:00+02:00", details: "API active. Prompts not yet tested." },
  { name: "Slack", status: "pending", last_check: "2026-03-25T12:00:00+02:00", details: "Not yet set up. Channels need to be created." },
  { name: "Abacus POS2 API", status: "pending", last_check: "2026-03-25T12:00:00+02:00", details: "Waiting for Bencom quote and development timeline." },
  { name: "Protel PMS API", status: "pending", last_check: "2026-03-25T12:00:00+02:00", details: "Not yet contacted Protel developer team." },
];
