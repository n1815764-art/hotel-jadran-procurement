#!/usr/bin/env node
// Airtable connection test — run from repo root: node scripts/test-airtable.js
// Reads credentials from Interface/.env.local automatically, or set env vars directly:
//   AIRTABLE_PAT=... AIRTABLE_BASE_ID=... node scripts/test-airtable.js

const { readFileSync } = require("fs");
const { resolve } = require("path");

function loadEnv() {
  try {
    const envPath = resolve(__dirname, "../Interface/.env.local");
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  } catch {
    // .env.local not found — fall back to process.env
  }
}
loadEnv();

const PAT  = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID || "appjHlTQID87ODAJL";

if (!PAT) {
  console.error("Error: AIRTABLE_PAT not set. Add it to Interface/.env.local or set the env var.");
  process.exit(1);
}
const API  = `https://api.airtable.com/v0/${BASE}`;

const TABLES = {
  "Audit Trail":       "Audit_Trail",
  "Purchase Orders":   "PO_Log",
  "Invoice Log":       "Invoice Log",
  "Inventory":         "Sample Inventory with Par Levels",
  "Vendors":           "Sample Vendors",
};

const results = [];

function pass(label, detail = "") {
  results.push({ status: "PASS", label, detail });
  console.log(`  ✓  ${label}${detail ? "  —  " + detail : ""}`);
}

function fail(label, detail = "") {
  results.push({ status: "FAIL", label, detail });
  console.log(`  ✗  ${label}${detail ? "  —  " + detail : ""}`);
}

async function atFetch(table, opts = {}) {
  const url = new URL(`${API}/${encodeURIComponent(table)}`);
  Object.entries(opts).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error)}`);
  return body;
}

async function atCreate(table, fields) {
  const res = await fetch(`${API}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error)}`);
  return body;
}

async function atDelete(table, recordId) {
  const res = await fetch(`${API}/${encodeURIComponent(table)}/${recordId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${PAT}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body.error)}`);
  return body;
}

async function run() {
  console.log("\n━━━  Airtable Connection Test  ━━━\n");
  console.log(`Base:  ${BASE}`);
  console.log(`PAT:   ${PAT.slice(0, 14)}…\n`);

  // ── 1. Fetch each table ──────────────────────────────────────
  console.log("[ 1 ] Fetching records from each table\n");
  for (const [label, tableName] of Object.entries(TABLES)) {
    try {
      const data = await atFetch(tableName, { maxRecords: "100" });
      const count = data.records?.length ?? 0;
      pass(`${label} (${tableName})`, `${count} record${count !== 1 ? "s" : ""} found`);
    } catch (err) {
      fail(`${label} (${tableName})`, err.message);
    }
  }

  // ── 2. Create test record in Audit Trail ─────────────────────
  console.log("\n[ 2 ] Creating test record in Audit_Trail\n");
  let createdId = null;
  try {
    // event_type is a single-select — must use an existing option
    const data = await atCreate("Audit_Trail", {
      event_type:   "REQUISITION_REVIEWED",
      details:      "CONNECTION_TEST — automated connection test, safe to delete",
      actor:        "test-script",
      reference_id: `TEST-${Date.now()}`,
      timestamp:    new Date().toISOString(),
    });
    createdId = data.id;
    if (createdId) {
      pass("Create test record", `Record ID: ${createdId}`);
    } else {
      fail("Create test record", "No ID returned");
    }
  } catch (err) {
    fail("Create test record", err.message);
  }

  // ── 3. Verify the record exists ──────────────────────────────
  console.log("\n[ 3 ] Verifying test record exists\n");
  if (createdId) {
    try {
      const data = await atFetch("Audit_Trail", {
        filterByFormula: `RECORD_ID() = "${createdId}"`,
        maxRecords: "1",
      });
      const found = data.records?.length === 1;
      if (found) {
        const details = data.records[0].fields.details;
        const marker = typeof details === "string" && details.includes("CONNECTION_TEST");
        pass("Verify test record", marker ? `details contains CONNECTION_TEST marker` : `record found (details: "${details}")`);
      } else {
        fail("Verify test record", "Record not found after creation");
      }
    } catch (err) {
      fail("Verify test record", err.message);
    }
  } else {
    fail("Verify test record", "Skipped — record was not created");
  }

  // ── 4. Delete the test record ────────────────────────────────
  console.log("\n[ 4 ] Deleting test record\n");
  if (createdId) {
    try {
      const data = await atDelete("Audit_Trail", createdId);
      if (data.deleted) {
        pass("Delete test record", `Record ${createdId} deleted`);
      } else {
        fail("Delete test record", "API did not confirm deletion");
      }
    } catch (err) {
      fail("Delete test record", err.message);
    }
  } else {
    fail("Delete test record", "Skipped — no record to delete");
  }

  // ── Summary ──────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log("\n━━━  Summary  ━━━\n");
  console.log(`  Passed:  ${passed}`);
  console.log(`  Failed:  ${failed}`);
  console.log(`  Total:   ${results.length}`);
  if (failed === 0) {
    console.log("\n  All checks passed.\n");
  } else {
    console.log("\n  Some checks failed — see details above.\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("\nUnhandled error:", err.message);
  process.exit(1);
});
