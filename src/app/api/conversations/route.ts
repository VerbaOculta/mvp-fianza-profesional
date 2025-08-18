// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHANNEL_WEB = "web" as const;
const STATE_AWAITING = "awaiting_opt_in" as const;

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
      applicantId?: string;
      phoneE164?: string | null;
      remoteJid?: string | null;
      messageId?: string | null;
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
    //    ✔ Siempre deja state = "awaiting_opt_in"
    const conversation = await prisma.conversation.upsert({
      where: { remoteJid },
      create: {
        remoteJid,
        applicantId,
        channel: CHANNEL_WEB,
        state: STATE_AWAITING,
        lastMessageId: body.messageId ?? null,
      },
      update: {
        applicantId,
        channel: CHANNEL_WEB,
        state: STATE_AWAITING,
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

    return NextResponse.json({ ok: true, reqId, conversation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    console.error("[/api/conversations] ERROR", reqId, e);
    return NextResponse.json({ ok: false, error: msg, reqId }, { status: 500 });
  }
}
