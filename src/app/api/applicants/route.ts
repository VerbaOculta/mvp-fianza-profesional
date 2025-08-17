import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { DocType, Rol, DocumentType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const s3 = new S3Client({
  region: process.env.S3_REGION!,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});

function getExt(filename?: string | null): string {
  if (!filename) return "bin";
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop() : "";
  return (ext || "bin").toLowerCase();
}

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 7 * 1024 * 1024;

async function generateUniqueRequestNo(): Promise<number> {
  for (let i = 0; i < 5; i++) {
    const n = Math.floor(Math.random() * 1_000_000);
    const exists = await prisma.applicant.findUnique({ where: { requestNo: n } });
    if (!exists) return n;
  }
  return Number(String(Date.now()).slice(-6));
}

async function generateUniqueRequestCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = `REQ-${Math.floor(Math.random() * 1_000_000)}`;
    const exists = await prisma.applicant.findUnique({ where: { requestCode: code } });
    if (!exists) return code;
  }
  return `REQ-${String(Date.now()).slice(-6)}`;
}

async function notifyN8N(payload: Record<string, unknown>) {
  const url = process.env.N8N_WEBHOOK_URL; // ¡solo server-side!
  if (!url) {
    console.warn("[n8n] N8N_WEBHOOK_URL no definido; se omite.");
    return { ok: false, reason: "no_url" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Si tu n8n está en la misma red y tarda, puedes bajar el timeout con AbortController
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true };
  } catch (err) {
    console.warn("[n8n] notify failed:", err);
    return { ok: false, reason: "fetch_failed" };
  }
}

export async function POST(req: NextRequest) {
  console.log("[/api/applicants] START", {
    region: process.env.S3_REGION,
    bucket: process.env.S3_BUCKET,
    hasKey: !!process.env.S3_ACCESS_KEY_ID,
    hasSecret: !!process.env.S3_SECRET_ACCESS_KEY,
  });

  try {
    const form = await req.formData();

    const rol = String(form.get("rol") ?? "") as Rol;
    const firstName = String(form.get("nombres") ?? "");
    const lastName = String(form.get("apellidos") ?? "");
    const phoneE164 = String(form.get("telefono") ?? "");
    const docTypeStr = String(form.get("docType") ?? "");
    const docNumber = String(form.get("docNumber") ?? "");
    const file = form.get("documentFile") as File | null;

    const documentTypeStr = String(form.get("documentKind") ?? "CEDULA_FRENTE");
    const documentType = (Object.values(DocumentType) as string[]).includes(documentTypeStr)
      ? (documentTypeStr as DocumentType)
      : DocumentType.CEDULA_FRENTE;

    // Validaciones básicas
    if (!firstName || !lastName) return NextResponse.json({ error: "Nombres y apellidos son obligatorios" }, { status: 400 });
    if (!rol || !Object.values(Rol).includes(rol)) return NextResponse.json({ error: "Rol inválido" }, { status: 400 });

    let docType: DocType | null = null;
    if (docTypeStr) {
      if (!Object.values(DocType).includes(docTypeStr as DocType))
        return NextResponse.json({ error: "DocType inválido" }, { status: 400 });
      docType = docTypeStr as DocType;
      if (!docNumber)
        return NextResponse.json({ error: "docNumber es obligatorio cuando envías docType" }, { status: 400 });
    }

    if (!phoneE164) return NextResponse.json({ error: "phoneE164 es obligatorio" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Falta documentFile" }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: `Tipo de archivo no permitido: ${file.type}` }, { status: 415 });

    // Narrow para TS
    type RuntimeFile = File & { size: number; name: string; type: string };
    const f = file as RuntimeFile;
    const size: number | undefined = typeof f.size === "number" ? f.size : undefined;
    if (typeof size === "number" && size > MAX_SIZE_BYTES)
      return NextResponse.json({ error: `Archivo demasiado grande: ${size} bytes` }, { status: 413 });

    // Reuse/Create Applicant
    let applicant = await prisma.applicant.findUnique({ where: { phoneE164 } });
    if (!applicant && docType && docNumber) {
      applicant = await prisma.applicant.findFirst({ where: { docType, docNumber } });
    }
    if (applicant) {
      await prisma.applicant.update({
        where: { id: applicant.id },
        data: {
          firstName: applicant.firstName || firstName,
          lastName: applicant.lastName || lastName,
          rol: applicant.rol || rol,
          docType: applicant.docType ?? docType,
          docNumber: applicant.docNumber ?? (docNumber || null),
        },
      });
    } else {
      const [requestNo, requestCode] = await Promise.all([
        generateUniqueRequestNo(),
        generateUniqueRequestCode(),
      ]);
      applicant = await prisma.applicant.create({
        data: {
          requestNo,
          requestCode,
          firstName,
          lastName,
          phoneE164,
          rol,
          docType: docType ?? null,
          docNumber: docNumber || null,
        },
      });
    }

    // Subir a S3 y crear Document
    const arrayBuffer = await f.arrayBuffer();
    const Body = Buffer.from(arrayBuffer);
    const ext = getExt(f.name);
    const key = `applicants/${Date.now()}-${randomUUID()}.${ext}`;
    const contentType = f.type || "application/octet-stream";

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body,
        ContentType: contentType,
      })
    );

    const fileUrl = `https://${process.env.S3_BUCKET!}.s3.${process.env.S3_REGION!}.amazonaws.com/${key}`;
    const document = await prisma.document.create({
      data: { applicantId: applicant.id, type: documentType, url: fileUrl },
    });

    // Asegurar requestNo/requestCode
    let ensured = applicant;
    if (!applicant.requestNo || !applicant.requestCode) {
      const [requestNo, requestCode] = await Promise.all([
        generateUniqueRequestNo(),
        generateUniqueRequestCode(),
      ]);
      ensured = await prisma.applicant.update({
        where: { id: applicant.id },
        data: { requestNo, requestCode },
      });
    }

    // Notificar a n8n (no bloqueante de la respuesta)
    const sessionId = randomUUID();
    void notifyN8N({
      sessionId,
      applicantId: applicant.id,
      nombres: firstName,
      apellidos: lastName,
      telefono: phoneE164,
      estado: "registrado",
      docType: docType ?? null,
      docNumber,
      rol,
      channel: "web",
    });

    return NextResponse.json({
      sessionId,
      requestCode: ensured.requestCode,
      requestNo: ensured.requestNo,
      applicantId: applicant.id,
      documentId: document.id,
      document: { url: fileUrl, key, type: documentType },
      reused: true,
      n8nNotified: true, // "best-effort"
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    console.error("[/api/applicants] ERROR", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
