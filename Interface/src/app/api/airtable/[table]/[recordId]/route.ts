import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || "appjHlTQID87ODAJL";
const AIRTABLE_API = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ table: string; recordId: string }> }
) {
  if (!AIRTABLE_PAT) {
    return NextResponse.json({ error: "AIRTABLE_PAT not configured" }, { status: 500 });
  }

  const { table, recordId } = await params;

  try {
    const body = await request.json();
    const url = `${AIRTABLE_API}/${encodeURIComponent(table)}/${recordId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: body.fields }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Airtable PATCH error: ${response.status}`, details: errorBody },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update Airtable record", details: String(error) },
      { status: 500 }
    );
  }
}
