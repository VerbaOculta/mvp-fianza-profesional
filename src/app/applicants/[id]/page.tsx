// src/app/applicants/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DocumentItem } from "@/components/DocumentItem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  // 👇 en Next 14.2+/15 params viene como Promise
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // 👈 hay que await

  const applicant = await prisma.applicant.findUnique({
    where: { id },
    include: { documents: { orderBy: { uploadedAt: "desc" } } },
  });

  if (!applicant) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {applicant.firstName} {applicant.lastName}
        </h1>
        <div className="text-sm text-muted-foreground">
          Código: <span className="font-mono">{applicant.requestCode ?? "—"}</span>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {applicant.documents.length === 0 ? (
            <div className="text-sm text-muted-foreground">Sin documentos.</div>
          ) : (
            applicant.documents.map((d) => (
              <DocumentItem
                key={d.id}
                id={d.id}
                url={d.url}
                type={String(d.type)}
                uploadedAt={d.uploadedAt}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
