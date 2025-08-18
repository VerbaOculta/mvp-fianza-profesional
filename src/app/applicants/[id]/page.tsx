import { prisma } from "@/lib/prisma";
import { DocumentItem } from "@/components/DocumentItem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>; // 👈 params es Promise
}) {
  const { id } = await params;      // 👈 hay que await

  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  });

  if (!applicant) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Applicant no encontrado</h1>
        <p className="text-sm text-muted-foreground">id: {id}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">
        {applicant.firstName} {applicant.lastName}
      </h1>
      <div className="text-sm text-muted-foreground">
        Código: <span className="font-mono">{applicant.requestCode ?? "—"}</span>
      </div>

      <h2 className="text-lg font-medium mt-6">Documentos</h2>
      {applicant.documents.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sin documentos.</div>
      ) : (
        <div className="space-y-4">
          {applicant.documents.map((d) => (
            <DocumentItem
              key={d.id}
              id={d.id}
              url={d.url}
              type={String(d.type)}
              uploadedAtISO={d.uploadedAt.toISOString()} // ISO determinístico
            />
          ))}
        </div>
      )}
    </div>
  );
}
