// src/app/api/documents/[id]/[process]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoogleAuth } from "@/lib/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROJECT_ID = "5826537004";
const LOCATION = "us";
const PROCESSOR_ID = "bb3d81a7fbe13a2f";
const DOCAI_URL = `https://us-documentai.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/processors/${PROCESSOR_ID}:process`;

// ---------- helpers de tipos / util -----------
function inferMimeType(url: string, fallback = "application/pdf"): string {
  const u = url.toLowerCase();
  if (u.endsWith(".png")) return "image/png";
  if (u.endsWith(".jpg") || u.endsWith(".jpeg")) return "image/jpeg";
  if (u.endsWith(".tif") || u.endsWith(".tiff")) return "image/tiff";
  if (u.endsWith(".gif")) return "image/gif";
  if (u.endsWith(".bmp")) return "image/bmp";
  if (u.endsWith(".webp")) return "image/webp";
  if (u.endsWith(".pdf")) return "application/pdf";
  return fallback;
}

type StringMap = Record<string, string>;

/** Obtiene el valor del header Authorization ya sea de Headers o de un objeto simple */
function getAuthFromHeaders(h: Headers | StringMap): string | undefined {
  if (h instanceof Headers) return h.get("Authorization") ?? undefined;
  const key = Object.keys(h).find((k) => k.toLowerCase() === "authorization");
  return key ? h[key] : undefined;
}

/** Type guard para el posible retorno de getAccessToken() */
function isTokenObject(v: unknown): v is { token?: string | null } {
  return typeof v === "object" && v !== null && "token" in (v as Record<string, unknown>);
}

type DocAIResponse = {
  document?: { text?: string };
  error?: { message?: string; status?: string };
};
// ----------------------------------------------

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; process: string }> } // tu carpeta es [process]
) {
  try {
    const { id } = await ctx.params; // 👈 hay que await

    // 1) Buscar el documento
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, url: true, applicantId: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // 2) Descargar archivo desde S3
    const fileRes = await fetch(doc.url, { cache: "no-store" });
    if (!fileRes.ok) {
      return NextResponse.json(
        { error: `Cannot fetch document (${fileRes.status})` },
        { status: 502 }
      );
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    const contentBase64 = buf.toString("base64");

    // 3) Auth Google → headers/tokens sin 'any'
    const auth = getGoogleAuth();
    const client = await auth.getClient();

    const hdrs = (await client.getRequestHeaders()) as Headers | StringMap;
    let authHeader = getAuthFromHeaders(hdrs);

    if (!authHeader) {
      // Fallback defensivo
      const got = await client.getAccessToken(); // string | null | { token?: string | null }
      let tokenStr: string | undefined;
      if (typeof got === "string") tokenStr = got;
      else if (isTokenObject(got)) tokenStr = got.token ?? undefined;

      if (tokenStr) authHeader = `Bearer ${tokenStr}`;
    }
    if (!authHeader) {
      return NextResponse.json({ error: "No Google access token" }, { status: 500 });
    }

    // 4) Llamada a Document AI
    const body = {
      rawDocument: {
        content: contentBase64,
        mimeType: inferMimeType(doc.url),
      },
      // fieldMask: "document.text",
      // processOptions: { enableNativePdfParsing: true },
    };

    const resp = await fetch(DOCAI_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const json = (await resp.json().catch(() => ({}))) as DocAIResponse;

    if (!resp.ok) {
      const errMsg =
        json?.error?.message || json?.error?.status || `Document AI HTTP ${resp.status}`;
      return NextResponse.json({ error: errMsg, details: json }, { status: 502 });
    }

    const text = json?.document?.text ?? "";

    return NextResponse.json({
      ok: true,
      documentId: doc.id,
      applicantId: doc.applicantId,
      text,
      message: text ? undefined : "Sin texto detectado",
    });
  } catch (err) {
    console.error("[docai process] ERROR:", err);
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
