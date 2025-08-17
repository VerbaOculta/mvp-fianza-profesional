// src/app/applicants/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Phone, IdCard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { PrecalificarButton } from "@/components/PrecalificarButton";
import { DocType, Rol } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_TYPE_LABEL: Record<DocType, string> = {
  CC: "Cédula de ciudadanía",
  CE: "Cédula de extranjería",
  PA: "Pasaporte",
};
const ROL_LABEL: Record<Rol, string> = {
  Inquilino: "Inquilino",
  DeudorSolidario: "Deudor Solidario",
};

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
}

export default async function ApplicantViewPage({
  params,
}: {
  params: { id: string };
}) {
  const applicant = await prisma.applicant.findUnique({
    where: { id: params.id },
    include: {
      documents: {
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!applicant) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      {/* Datos del solicitante */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitante</CardTitle>
          <CardDescription>
            Creado el {fmtDate(applicant.createdAt)} — Código:{" "}
            <span className="font-mono">{applicant.requestCode ?? "—"}</span>{" "}
            · N° interno:{" "}
            <span className="font-mono">{applicant.requestNo ?? "—"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Nombres</div>
            <div className="font-medium">{applicant.firstName}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Apellidos</div>
            <div className="font-medium">{applicant.lastName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <div className="truncate">{applicant.phoneE164}</div>
          </div>
          <div className="flex items-center gap-2">
            <IdCard className="w-4 h-4 text-muted-foreground" />
            <div className="truncate">
              {applicant.docType
                ? `${DOC_TYPE_LABEL[applicant.docType]} · ${applicant.docNumber ?? "—"}`
                : "Documento no informado"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Rol</div>
            <div className="font-medium">{ROL_LABEL[applicant.rol]}</div>
          </div>
        </CardContent>
        <CardFooter>
          {/* Botón de acción */}
          <PrecalificarButton applicantId={applicant.id} />
        </CardFooter>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Haz clic para abrirlos en una nueva pestaña.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {applicant.documents.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sin documentos.</div>
          ) : (
            <ul className="divide-y">
              {applicant.documents.map((doc) => (
                <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{doc.type}</div>
                    <div className="text-xs text-muted-foreground">
                      Subido: {fmtDate(doc.uploadedAt)}
                    </div>
                  </div>
                  <Link
                    href={doc.url}
                    prefetch={false}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
                  >
                    Ver documento
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
