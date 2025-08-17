// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deriva el remoteJid a partir de un E.164: +569... -> 569...@s.whatsapp.net
function jidFromPhone(phoneE164?: string | null): string | null {
  return phoneE164 ? `${phoneE164.replace(/\D/g, "")}@s.whatsapp.net` : null;
}

// Aserción para que TS sepa que tenemos un string no-vacío
function assertString(val: unknown, msg: string): asserts val is string {
  if (typeof val !== "string" || !val.trim()) throw new Error(msg);
}

export async function POST(req: NextRequest) {
  const reqId = randomUUID().slice(0, 8);

  try {
    const body = (await req.json()) as {
      applicantId?: string;         // requerido en web
      phoneE164?: string | null;    // opcional: para derivar JID
      remoteJid?: string | null;    // opcional: si ya lo tienes
      messageId?: string | null;    // opcional
    };

    // 1) Validaciones de entrada (este endpoint es para WEB)
    assertString(body.applicantId, "Missing applicantId");
    const applicantId = body.applicantId;

    const remoteJid =
      (body.remoteJid ?? "").trim() || jidFromPhone(body.phoneE164);
    assertString(remoteJid, "Need remoteJid or phoneE164");

    // Garantiza que el applicant exista (evita FK rota)
    const exists = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    // 2) Upsert por remoteJid (clave única)
    const conversation = await prisma.conversation.upsert({
      where: { remoteJid },
      create: {
        remoteJid,
        applicantId,                // ← string garantizado
        channel: "web",
        state: "awaiting_opt_in",   // ← regla de negocio para la web
        lastMessageId: body.messageId ?? null,
      },
      update: {
        applicantId,                // ← re-vincula por si estaba con otro
        channel: "web",
        state: "awaiting_opt_in",
        lastMessageId: body.messageId ?? undefined, // undefined = no tocar si no vino
      },
      select: {
        id: true,
        applicantId: true,
        remoteJid: true,
        channel: true,
        state: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      reqId,
      conversation,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    // Log útil en server
    console.error("[/api/conversations] ERROR", reqId, e);
    return NextResponse.json({ ok: false, error: msg, reqId }, { status: 500 });
  }
}
