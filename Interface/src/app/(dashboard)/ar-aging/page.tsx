"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getDataService } from "@/services/sample-data-service";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn, formatEUR, formatDate } from "@/lib/utils";
import type { ARLedgerEntry } from "@/types";

type Bucket = "all" | "current" | "1-30" | "31-60" | "61-90" | "90+";

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "current", label: "Current" },
  { id: "1-30", label: "1–30" },
  { id: "31-60", label: "31–60" },
  { id: "61-90", label: "61–90" },
  { id: "90+", label: "90+" },
];

function bucketOf(days: number): Exclude<Bucket, "all"> {
  if (days <= 0) return "current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

function daysOverdueColor(days: number): string {
  if (days <= 0) return "text-zinc-400 border-zinc-700 bg-zinc-800/50";
  if (days <= 30) return "text-yellow-300 border-yellow-500/40 bg-yellow-500/10";
  if (days <= 60) return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (days <= 90) return "text-orange-300 border-orange-500/40 bg-orange-500/10";
  return "text-red-300 border-red-500/40 bg-red-500/10";
}

function DunningDots({ entry }: { entry: ARLedgerEntry }) {
  const dots: Array<{ label: string; sent: boolean; tone: string; tooltip: string }> = [
    {
      label: "30",
      sent: entry.alert_30_sent,
      tone: "bg-yellow-400 border-yellow-400",
      tooltip: entry.alert_30_sent
        ? `30-day alert sent${entry.last_contact_date ? ` (last contact ${formatDate(entry.last_contact_date)})` : ""}`
        : "30-day alert not yet sent",
    },
    {
      label: "60",
      sent: entry.alert_60_sent,
      tone: "bg-amber-500 border-amber-500",
      tooltip: entry.alert_60_sent ? "60-day alert sent" : "60-day alert not yet sent",
    },
    {
      label: "90",
      sent: entry.alert_90_sent,
      tone: "bg-red-500 border-red-500",
      tooltip: entry.alert_90_sent ? "90-day alert sent" : "90-day alert not yet sent",
    },
  ];
  return (
    <div className="inline-flex items-center gap-1">
      {dots.map((d) => (
        <span
          key={d.label}
          title={d.tooltip}
          className={cn(
            "inline-block w-2.5 h-2.5 rounded-full border",
            d.sent ? d.tone : "border-zinc-600"
          )}
        />
      ))}
    </div>
  );
}

export default function ARAgingPage() {
  const dataService = getDataService();
  const [entries, setEntries] = useState<ARLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>("all");
  const [clientType, setClientType] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ARLedgerEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await dataService.getARLedger();
        if (!cancelled) setEntries(data);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dataService]);

  const clientTypes = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => e.client_type && set.add(e.client_type));
    return ["All", ...Array.from(set).sort()];
  }, [entries]);

  const summary = useMemo(() => {
    const buckets = {
      current: { count: 0, total: 0 },
      "1-30": { count: 0, total: 0 },
      "31-60": { count: 0, total: 0 },
      "61-90": { count: 0, total: 0 },
      "90+": { count: 0, total: 0 },
    } satisfies Record<Exclude<Bucket, "all">, { count: number; total: number }>;

    entries.forEach((e) => {
      if (e.balance <= 0) return;
      const b = bucketOf(e.days_overdue);
      buckets[b].count += 1;
      buckets[b].total += e.balance;
    });
    return buckets;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries
      .filter((e) => e.balance > 0 || bucket === "all")
      .filter((e) => {
        if (bucket === "all") return true;
        return bucketOf(e.days_overdue) === bucket;
      })
      .filter((e) => clientType === "All" || e.client_type === clientType)
      .filter((e) => {
        if (!q) return true;
        return (
          e.client_name.toLowerCase().includes(q) ||
          e.invoice_number.toLowerCase().includes(q)
        );
      })
      .slice()
      .sort((a, b) => b.days_overdue - a.days_overdue);
  }, [entries, bucket, clientType, query]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">AR Aging</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Receivables aging from WF15 (AR Ledger). Read-only view — dunning emails
            are triggered automatically by the workflow.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
          Failed to load AR ledger: {error}
        </div>
      )}

      {/* Aging bucket summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard
          label="Current"
          count={summary.current.count}
          total={summary.current.total}
          tone="neutral"
          loading={loading}
        />
        <SummaryCard
          label="1–30 days"
          count={summary["1-30"].count}
          total={summary["1-30"].total}
          tone="yellow"
          loading={loading}
        />
        <SummaryCard
          label="31–60 days"
          count={summary["31-60"].count}
          total={summary["31-60"].total}
          tone="amber"
          loading={loading}
        />
        <SummaryCard
          label="61–90 days"
          count={summary["61-90"].count}
          total={summary["61-90"].total}
          tone="orange"
          loading={loading}
        />
        <SummaryCard
          label="90+ days"
          count={summary["90+"].count}
          total={summary["90+"].total}
          tone="red"
          loading={loading}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-zinc-800 bg-zinc-900/50">
          {BUCKETS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBucket(b.id)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                bucket === b.id
                  ? "bg-violet-600/20 text-violet-200 border border-violet-500/30"
                  : "text-zinc-400 hover:text-zinc-200"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>

        <select
          value={clientType}
          onChange={(e) => setClientType(e.target.value)}
          className="px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 focus:outline-none focus:border-zinc-600"
        >
          {clientTypes.map((t) => (
            <option key={t} value={t}>
              {t === "All" ? "All client types" : t}
            </option>
          ))}
        </select>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client or invoice #…"
            className="pl-8 pr-3 py-1.5 w-64 rounded-md border border-zinc-800 bg-zinc-900 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        <span className="ml-auto text-[11px] text-zinc-500 mono">
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </span>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-zinc-900/70 border-b border-zinc-800">
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Client</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Invoice #</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Invoice Date</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Due Date</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Days Overdue</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Balance</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Dunning</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Last Contact</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-zinc-500">
                    No receivables match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr
                  key={e._recordId || e.ar_id}
                  onClick={() => setSelected(e)}
                  className="border-b border-zinc-800/60 hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2 text-zinc-200">
                    <div className="font-medium">{e.client_name}</div>
                    <div className="text-[10px] text-zinc-500">{e.client_type}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-300 mono">{e.invoice_number}</td>
                  <td className="px-3 py-2 text-zinc-400">{formatDate(e.invoice_date)}</td>
                  <td className="px-3 py-2 text-zinc-400">{formatDate(e.due_date)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold mono",
                        daysOverdueColor(e.days_overdue)
                      )}
                    >
                      {e.days_overdue === 0 ? "—" : `${e.days_overdue}d`}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-100 mono font-medium">
                    {formatEUR(e.balance)}
                  </td>
                  <td className="px-3 py-2">
                    <DunningDots entry={e} />
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {e.last_contact_date ? formatDate(e.last_contact_date) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.client_name} — ${selected.invoice_number}` : ""}
        wide
      >
        {selected && <ARDetail entry={selected} />}
      </Modal>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  count: number;
  total: number;
  tone: "neutral" | "yellow" | "amber" | "orange" | "red";
  loading: boolean;
}

function SummaryCard({ label, count, total, tone, loading }: SummaryCardProps) {
  const toneClass = {
    neutral: "border-zinc-800 bg-zinc-900/50",
    yellow: "border-yellow-500/30 bg-yellow-500/5",
    amber: "border-amber-500/30 bg-amber-500/5",
    orange: "border-orange-500/30 bg-orange-500/5",
    red: "border-red-500/40 bg-red-500/10",
  }[tone];
  return (
    <div className={cn("rounded-lg border p-4 flex flex-col gap-1", toneClass)}>
      <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</span>
      <span className="text-2xl font-bold mono text-zinc-100">
        {loading ? "…" : count}
      </span>
      <span className="text-xs text-zinc-500 mono">
        {loading ? "" : formatEUR(total)}
      </span>
    </div>
  );
}

function ARDetail({ entry }: { entry: ARLedgerEntry }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Field label="AR ID" value={entry.ar_id} mono />
        <Field label="Client" value={entry.client_name} />
        <Field label="Client type" value={entry.client_type} />
        <Field label="Email" value={entry.client_email} mono />
        <Field label="Invoice #" value={entry.invoice_number} mono />
        <Field label="Invoice date" value={formatDate(entry.invoice_date)} />
        <Field label="Due date" value={formatDate(entry.due_date)} />
        <Field label="Payment terms" value={entry.payment_terms || "—"} />
        <Field label="Status" value={entry.status} />
        <Field label="Department" value={entry.department || "—"} />
        <Field label="GL account" value={entry.gl_account || "—"} mono />
        <Field label="Linked POs" value={entry.po_numbers || "—"} mono />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Amount" value={formatEUR(entry.amount)} />
        <Metric label="Paid" value={formatEUR(entry.amount_paid)} />
        <Metric
          label="Balance"
          value={formatEUR(entry.balance)}
          highlight={entry.balance > 0}
        />
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500">Dunning status</p>
        <div className="flex items-center gap-3">
          <DunningDots entry={entry} />
          <span className="text-xs text-zinc-400">
            Last contact: {entry.last_contact_date ? formatDate(entry.last_contact_date) : "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold mono ml-auto",
              daysOverdueColor(entry.days_overdue)
            )}
          >
            {entry.days_overdue === 0 ? "Current" : `${entry.days_overdue} days overdue`}
          </span>
        </div>
      </div>

      {entry.notes && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Notes</p>
          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{entry.notes}</p>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-zinc-900 border border-zinc-800 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</p>
      <p className={cn("text-xs text-zinc-200 truncate", mono && "mono")}>{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        highlight ? "border-red-500/30 bg-red-500/10" : "border-zinc-800 bg-zinc-900"
      )}
    >
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
      <p className={cn("text-lg font-bold mono", highlight ? "text-red-300" : "text-zinc-100")}>
        {value}
      </p>
    </div>
  );
}
