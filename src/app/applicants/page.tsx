// src/app/applicants/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ApplicantsSearch } from "@/components/ApplicantsSearch";
import { Prisma, DocType } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
}

export default async function ApplicantsIndex({
  searchParams,
}: {
  // 👇 En Next 14.2+/15, searchParams viene como Promise
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams; // 👈 hay que await
  const qRaw = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  // Tipamos explícitamente los filtros y el where
  let where: Prisma.ApplicantWhereInput = {};
  if (qRaw.length > 0) {
    const q = qRaw;
    const byNumber = Number.isFinite(Number(q)) ? Number(q) : undefined;

    const filters: Prisma.ApplicantWhereInput[] = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { phoneE164: { contains: q, mode: "insensitive" } },
      { docNumber: { contains: q, mode: "insensitive" } },
      { requestCode: { contains: q, mode: "insensitive" } },
    ];

    if (typeof byNumber === "number" && !Number.isNaN(byNumber)) {
      filters.push({ requestNo: byNumber });
    }

    where = { OR: filters };
  }

  const [rows, total] = await Promise.all([
    prisma.applicant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      select: {
        id: true,
        requestNo: true,
        requestCode: true,
        firstName: true,
        lastName: true,
        phoneE164: true,
        docType: true,
        docNumber: true,
        createdAt: true,
        _count: { select: { documents: true } },
      },
    }),
    prisma.applicant.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>Solicitantes</CardTitle>
          <ApplicantsSearch initialQuery={qRaw} />
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              {qRaw ? "Sin resultados para la búsqueda." : "Aún no hay solicitantes."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2 pr-3">#</th>
                  <th className="text-left py-2 pr-3">Código</th>
                  <th className="text-left py-2 pr-3">Nombre</th>
                  <th className="text-left py-2 pr-3">Teléfono</th>
                  <th className="text-left py-2 pr-3">Documento</th>
                  <th className="text-left py-2 pr-3">Docs</th>
                  <th className="text-left py-2 pr-3">Creado</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-mono">{a.requestNo ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{a.requestCode ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {a.firstName} {a.lastName}
                    </td>
                    <td className="py-2 pr-3">{a.phoneE164}</td>
                    <td className="py-2 pr-3">
                      {a.docType ? `${a.docType as DocType} · ${a.docNumber ?? "—"}` : "—"}
                    </td>
                    <td className="py-2 pr-3">{a._count.documents}</td>
                    <td className="py-2 pr-3">{fmtDate(a.createdAt)}</td>
                    <td className="py-2">
                      <Link href={`/applicants/${a.id}`} className="underline underline-offset-2" prefetch={false}>
                        Ver ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-muted-foreground">
                Página {page} de {totalPages} · {total} resultado{total === 1 ? "" : "s"}
              </div>
              <div className="flex gap-2">
                <PagerLink page={page - 1} disabled={page <= 1} q={qRaw}>
                  ← Anterior
                </PagerLink>
                <PagerLink page={page + 1} disabled={page >= totalPages} q={qRaw}>
                  Siguiente →
                </PagerLink>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PagerLink({
  page,
  q,
  disabled,
  children,
}: {
  page: number;
  q: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const href = `/applicants?page=${page}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  if (disabled) {
    return (
      <span className="px-3 py-1 rounded border text-muted-foreground opacity-50 cursor-not-allowed">
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className="px-3 py-1 rounded border hover:bg-muted" prefetch={false}>
      {children}
    </Link>
  );
}
