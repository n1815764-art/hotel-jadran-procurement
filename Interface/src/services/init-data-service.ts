"use client";

import { AirtableDataService } from "./airtable-data-service";
import { setDataService } from "./sample-data-service";

let initialized = false;

export function initDataService(): void {
  if (initialized) return;
  initialized = true;
  setDataService(new AirtableDataService());
}
