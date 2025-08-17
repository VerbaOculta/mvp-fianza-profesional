import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { uploadToS3 } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";
import type { DocumentType } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file || !type) {
      return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
    }

    const allowedTypes: DocumentType[] = [
      "CEDULA_FRENTE",
      "CEDULA_REVERSO",
      "CONTRATO",
      "RECIBO",
      "OTRO",
    ];
    if (!allowedTypes.includes(type as DocumentType)) {
      return NextResponse.json(
        { error: "Tipo de documento inválido." },
        { status: 400 }
      );
    }

    const applicantId = params.id;
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return NextResponse.json(
        { error: "Applicant no encontrado." },
        { status: 404 }
      );
    }

    // Subir archivo a S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileExtension = file.name.split(".").pop();
    const fileName = `documents/${applicantId}/${uuidv4()}.${fileExtension}`;
    const s3Url = await uploadToS3(buffer, fileName, file.type);

    // Guardar referencia en la base de datos
    const document = await prisma.document.create({
      data: {
        type: type as DocumentType,
        url: s3Url, // campo correcto en tu schema
        applicantId,
      },
    });

    return NextResponse.json({ success: true, document });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error en upload-document:", error.message);
    } else {
      console.error("Error desconocido en upload-document:", error);
    }

    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
