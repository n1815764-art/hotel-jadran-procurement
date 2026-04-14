import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages, context } = await req.json();

    const apiKey = process.env.MOONSHOT_CHATBOT_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const systemPrompt = `You are a procurement assistant for Hotel Jadran, a 200-room hotel in Croatia. You help procurement staff understand their data and answer questions about purchase orders, inventory, vendors, invoices, and alerts.

Current dashboard data snapshot:
${JSON.stringify(context, null, 2)}

Guidelines:
- Detect the user's language and respond in the same language (English or Croatian/Bosnian/Serbian)
- All monetary amounts are in EUR (€)
- Approval tiers: <€500 auto-approved, €500–€2,000 Department Head, €2,000–€5,000 Controller, >€5,000 Controller + GM (sequential)
- Be concise, accurate, and reference specific data from the context when answering
- If asked something not in the data, say so clearly`;

    const response = await fetch("https://api.moonshot.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "kimi-k2.5",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        temperature: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Moonshot API error:", response.status, errorText);
      return NextResponse.json({ error: "AI service unavailable" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chatbot route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
