// src/app/api/precalificar/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { applicantId } = (await req.json()) as { applicantId?: string };
    if (!applicantId) {
      return NextResponse.json({ error: "Missing applicantId" }, { status: 400 });
    }

    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!applicant) {
      return NextResponse.json({ error: "Applicant not found" }, { status: 404 });
    }

    // TODO: aquí luego conectamos la precalificación real
    const sessionId = randomUUID();

    return NextResponse.json({
      ok: true,
      sessionId,
      message: `Precalificación encolada para ${applicant.firstName} ${applicant.lastName}.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
