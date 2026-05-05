import type { POLineItem } from "@/types";
import { formatEUR } from "./utils";

export interface POItemChange {
  item_name: string;
  unit: string;
  unit_price: number;
  before: number;
  after: number;
  delta_amount: number;
}

export function totalFor(items: ReadonlyArray<POLineItem>): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

function indexByName(items: ReadonlyArray<POLineItem>): Map<string, POLineItem> {
  const map = new Map<string, POLineItem>();
  for (const item of items) {
    map.set(item.item_name, item);
  }
  return map;
}

export function diffItems(
  original: ReadonlyArray<POLineItem>,
  modified: ReadonlyArray<POLineItem>
): POItemChange[] {
  const originalByName = indexByName(original);
  const changes: POItemChange[] = [];
  for (const next of modified) {
    const prev = originalByName.get(next.item_name);
    if (!prev) continue;
    if (prev.quantity === next.quantity) continue;
    const delta_amount = (next.quantity - prev.quantity) * next.unit_price;
    changes.push({
      item_name: next.item_name,
      unit: next.unit,
      unit_price: next.unit_price,
      before: prev.quantity,
      after: next.quantity,
      delta_amount,
    });
  }
  return changes;
}

function formatSignedEUR(amount: number): string {
  if (amount === 0) return formatEUR(0);
  const sign = amount > 0 ? "+" : "−"; // U+2212 minus sign for visual parity
  return `${sign}${formatEUR(Math.abs(amount))}`;
}

/**
 * BCS diff summary written to Audit_Trail.details and forwarded as the
 * webhook `notes` so WF16 can echo it downstream. Lists only changed items.
 */
export function buildBcsDiffSummary(
  original: ReadonlyArray<POLineItem>,
  modified: ReadonlyArray<POLineItem>
): string {
  const changes = diffItems(original, modified);
  if (changes.length === 0) {
    return "PO odobrena bez izmjena količina.";
  }
  const oldTotal = totalFor(original);
  const newTotal = totalFor(modified);
  const totalDelta = newTotal - oldTotal;

  const itemSegments = changes.map((c) => {
    const deltaStr = formatSignedEUR(c.delta_amount);
    return `${c.item_name} ${c.before} ${c.unit} → ${c.after} ${c.unit} (${deltaStr})`;
  });

  const totalsSegment = `Ukupno: ${formatEUR(oldTotal)} → ${formatEUR(newTotal)} (${formatSignedEUR(totalDelta)})`;

  return `PO modificirana prije odobrenja. Promjene: ${itemSegments.join("; ")}. ${totalsSegment}.`;
}
