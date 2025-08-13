// src/app/api/n8n/inicia/route.ts
import { NextResponse } from "next/server";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) {
      return NextResponse.json({ ok: false, error: "Missing N8N_WEBHOOK_URL" }, { status: 500 });
    }

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const txt = await r.text(); // puede no ser JSON
    return new NextResponse(txt, { status: r.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
