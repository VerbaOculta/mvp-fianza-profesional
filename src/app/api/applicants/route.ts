// src/app/api/applicants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client"; // La importación de Prisma se mantiene por si es necesaria en otras partes del código
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

const toRequestCode = (n: number) => `SOL-${String(n).padStart(6, "0")}`;
const toRemoteJid = (phoneE164: string) =>
  phoneE164.replace(/\D/g, "") + "@s.whatsapp.net";

/** Normaliza número de documento según tipo */
function normalizeDoc(
  docType?: "CC" | "CE" | "PA",
  value?: string | null
): string | null {
  if (!docType || !value) return null;
  const v = String(value).trim();
  if (docType === "PA") return v.replace(/\s+/g, "").toUpperCase(); // pasaporte: alfanumérico
  return v.replace(/\D/g, ""); // CC/CE: solo dígitos
}

type PostBody = {
  firstName: string;
  lastName: string;
  phoneE164: string;
  docType?: "CC" | "CE" | "PA";
  docNumber?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as PostBody | null;
    if (!body) return NextResponse.json({ error: "Bad JSON" }, { status: 400 });

    const { firstName, lastName, phoneE164, docType, docNumber } = body;
    if (!firstName || !lastName || !phoneE164) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const normalizedDoc = normalizeDoc(docType, docNumber);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Applicant por teléfono (evita unique violation en phoneE164)
      const applicant = await tx.applicant.upsert({
        where: { phoneE164 },
        update: {
          firstName,
          lastName,
          ...(docType && normalizedDoc
            ? { docType, docNumber: normalizedDoc }
            : {}),
        },
        create: {
          id: randomUUID(),
          firstName,
          lastName,
          phoneE164,
          requestCode: "PENDING",
          ...(docType && normalizedDoc
            ? { docType, docNumber: normalizedDoc }
            : {}),
        },
        select: { id: true, requestNo: true, requestCode: true },
      });

      // 2) Generar/asegurar requestCode legible
      let requestCode = applicant.requestCode;
      if (requestCode === "PENDING") {
        requestCode = toRequestCode(applicant.requestNo);
        await tx.applicant.update({
          where: { id: applicant.id },
          data: { requestCode },
        });
      }

      // 3) Conversation por remoteJid (upsert por UNIQUE)
      const remoteJid = toRemoteJid(phoneE164);
      const conv = await tx.conversation.upsert({
        where: { remoteJid },
        update: {
          applicantId: applicant.id,
          channel: "web",
          state: "awaiting_opt_in",
          meta: { source: "web-mvp" },
        },
        create: {
          id: randomUUID(),
          applicantId: applicant.id,
          remoteJid,
          channel: "web",
          state: "awaiting_opt_in",
          meta: { source: "web-mvp" },
        },
        select: { id: true },
      });

      return {
        applicantId: applicant.id,
        requestNo: applicant.requestNo,
        requestCode,
        sessionId: conv.id,
      };
    });

    const res = NextResponse.json(result);
    res.cookies.set({
      name: "agent_session_id",
      value: result.sessionId,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
    return res;
  } catch (e: unknown) {
    console.error("[/api/applicants] Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}