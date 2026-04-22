import { AirtableDataService } from "./airtable-data-service";
import { setDataService } from "./sample-data-service";

let initialized = false;

export function initDataService(): void {
  if (initialized) return;
  initialized = true;
  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "airtable") return;
  setDataService(new AirtableDataService());
}
