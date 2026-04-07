import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appjHlTQID87ODAJL";
const AIRTABLE_API = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  if (!AIRTABLE_PAT) {
    return NextResponse.json({ error: "AIRTABLE_PAT not configured" }, { status: 500 });
  }

  const { table } = await params;
  const { searchParams } = new URL(request.url);

  // Build Airtable API URL with query params
  const url = new URL(`${AIRTABLE_API}/${encodeURIComponent(table)}`);
  searchParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  try {
    const records: Record<string, unknown>[] = [];
    let offset: string | undefined;

    // Paginate through all records
    do {
      if (offset) {
        url.searchParams.set("offset", offset);
      }

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return NextResponse.json(
          { error: `Airtable API error: ${response.status}`, details: errorBody },
          { status: response.status }
        );
      }

      const data = await response.json();
      records.push(...data.records);
      offset = data.offset;
    } while (offset);

    return NextResponse.json({ records });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from Airtable", details: String(error) },
      { status: 500 }
    );
  }
}
