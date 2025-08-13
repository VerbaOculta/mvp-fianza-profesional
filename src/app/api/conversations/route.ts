import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { applicantId } = (await req.json()) as { applicantId: string }
  if (!applicantId) return NextResponse.json({ error: "Missing applicantId" }, { status: 400 })

  const exists = await prisma.applicant.findUnique({ where: { id: applicantId } })
  if (!exists) return NextResponse.json({ error: "Applicant not found" }, { status: 404 })

  const sessionId = randomUUID()
  await prisma.conversation.create({
    data: { id: sessionId, applicantId, meta: { source: "web-mvp" } },
  })

  return NextResponse.json({ sessionId })
}
