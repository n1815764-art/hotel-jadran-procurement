import { NextResponse } from "next/server";

interface SuggestQuantityRequest {
  item_id: string;
  item_name: string;
  department: string;
  current_stock: number;
  par_level: number;
  unit: string;
}

interface SuggestQuantityResponse {
  suggested_quantity: number;
  reasoning: string;
}

const PAT = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID || "appjHlTQID87ODAJL";
const AT = `https://api.airtable.com/v0/${BASE}`;

interface OccupancyRow {
  date: string;
  occupancy_pct: number;
  events: string[];
}

async function fetchOccupancySnapshot(): Promise<OccupancyRow[]> {
  if (!PAT) return [];
  const url = new URL(`${AT}/${encodeURIComponent("Sample Occupancy Data")}`);
  url.searchParams.set("sort[0][field]", "Date");
  url.searchParams.set("sort[0][direction]", "asc");
  url.searchParams.set("maxRecords", "7");
  try {
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${PAT}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.records ?? []).map((rec: { fields: Record<string, unknown> }) => {
      const f = rec.fields;
      const occRaw = typeof f["Occupancy %"] === "number" ? (f["Occupancy %"] as number) : 0;
      const eventsStr = typeof f.Events === "string" ? (f.Events as string) : "";
      return {
        date: typeof f.Date === "string" ? (f.Date as string) : "",
        occupancy_pct: occRaw > 1 ? occRaw : Math.round(occRaw * 100),
        events: eventsStr ? eventsStr.split("\n").filter(Boolean) : [],
      };
    });
  } catch {
    return [];
  }
}

function deterministicFallback(input: SuggestQuantityRequest): SuggestQuantityResponse {
  const gap = Math.max(input.par_level - input.current_stock, 0);
  const buffer = Math.ceil(input.par_level * 0.2);
  return {
    suggested_quantity: gap + buffer,
    reasoning: "Preporuka na osnovu pareva (AI nedostupan).",
  };
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function safeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export async function POST(req: Request) {
  let input: SuggestQuantityRequest;
  try {
    input = (await req.json()) as SuggestQuantityRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!input?.item_name || !input?.department || typeof input.par_level !== "number") {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const apiKey = process.env.MOONSHOT_CHATBOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(deterministicFallback(input));
  }

  const occupancy = await fetchOccupancySnapshot();

  const systemPrompt = `You are a procurement quantity advisor for Hotel Jadran (200 rooms, Croatia). Suggest a purchase quantity for a single inventory item.

Output STRICT JSON ONLY, no prose, no code fences:
{"suggested_quantity": <number>, "reasoning": "<short BCS sentence>"}

Rules:
- "reasoning" MUST be in Bosnian/Croatian/Serbian (BCS), one short sentence.
- "suggested_quantity" is a positive number using ${input.unit} as the unit.
- Bias toward par_level coverage with a small buffer for forecasted occupancy and any upcoming event in the next 7 days.
- If forecast/event data is missing, fall back to (par_level - current_stock) plus 20% of par_level.`;

  const userPrompt = `Item: ${input.item_name} (id ${input.item_id})
Department: ${input.department}
Current stock: ${input.current_stock} ${input.unit}
Par level: ${input.par_level} ${input.unit}

Occupancy forecast (next 7 days):
${occupancy.length === 0 ? "(unavailable)" : occupancy.map((d) => `- ${d.date}: ${d.occupancy_pct}% occupancy${d.events.length ? `, events: ${d.events.join(", ")}` : ""}`).join("\n")}`;

  try {
    const res = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json(deterministicFallback(input));
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return NextResponse.json(deterministicFallback(input));
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFences(content));
    } catch {
      return NextResponse.json(deterministicFallback(input));
    }
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(deterministicFallback(input));
    }
    const obj = parsed as Record<string, unknown>;
    const qty = safeNumber(obj.suggested_quantity);
    const reasoning = typeof obj.reasoning === "string" ? obj.reasoning : null;
    if (qty === null || qty <= 0 || !reasoning) {
      return NextResponse.json(deterministicFallback(input));
    }
    return NextResponse.json({ suggested_quantity: qty, reasoning });
  } catch {
    return NextResponse.json(deterministicFallback(input));
  }
}
