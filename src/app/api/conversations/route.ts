// src/app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

// Reusar Prisma en Vercel
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

export async function POST(req: NextRequest) {
  try {
    const { applicantId } = (await req.json()) as { applicantId?: string };
    if (!applicantId) {
      return NextResponse.json({ error: "Missing applicantId" }, { status: 400 });
    }

    const applicant = await prisma.applicant.findUnique({ where: { id: applicantId } });
    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    const sessionId = randomUUID();
    const remoteJid = `web:${sessionId}`; // temporal hasta conocer el JID real

    await prisma.conversation.create({
      data: {
        id: sessionId,
        applicantId,
        remoteJid,
        channel: "web",
        state: "awaiting_opt_in",
        meta: { source: "web-mvp" },
      },
    });

    return NextResponse.json({ sessionId });
  } catch (e) {
    console.error("[/api/conversations] Error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
