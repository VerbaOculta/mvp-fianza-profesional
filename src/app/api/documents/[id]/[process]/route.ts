// src/app/api/documents/[id]/process/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VISION_URL = "https://vision.googleapis.com/v1/images:annotate";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // 👈 params es un Promise
) {
  try {
    const { id } = await ctx.params; // 👈 hay que await
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_VISION_API_KEY" },
        { status: 500 }
      );
    }

    const doc = await prisma.document.findUnique({
      where: { id },
      select: { id: true, applicantId: true, type: true, url: true },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Descargar imagen (si el bucket es privado, usa AWS SDK GetObject)
    const imgRes = await fetch(doc.url, { cache: "no-store" });
    if (!imgRes.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar la imagen (${imgRes.status})` },
        { status: 502 }
      );
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    const contentBase64 = Buffer.from(arrayBuffer).toString("base64");

    // Cuerpo para Vision
    const body = {
      requests: [
        {
          image: { content: contentBase64 },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    };

    // Llamada a Vision
    const visionRes = await fetch(`${VISION_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const visionJson = await visionRes.json().catch(() => ({}));
    if (!visionRes.ok) {
      const err = visionJson?.error?.message || `Vision HTTP ${visionRes.status}`;
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const resp = visionJson?.responses?.[0] ?? {};
    const text: string =
      resp?.fullTextAnnotation?.text ??
      resp?.textAnnotations?.[0]?.description ??
      "";

    return NextResponse.json({
      ok: true,
      documentId: doc.id,
      applicantId: doc.applicantId,
      text,
      message: text ? undefined : "Sin texto detectado",
    });
  } catch (e) {
    console.error("[process document] ERROR:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
