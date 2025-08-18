// src/app/applicants/page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ApplicantsSearch } from "@/components/ApplicantsSearch";
import { Prisma, DocType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ApplicantsAreaChart } from "@/components/charts/ApplicantsArea";

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
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const qRaw = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page || "1"));
  const skip = (page - 1) * PAGE_SIZE;

  // where de búsqueda
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

  // datos
  const [rows, total, autoCount, rawChart] = await Promise.all([
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
    prisma.applicant.count({
      where: {
        AND: [
          where,
          { docType: { not: null } },
          { docNumber: { not: null } },
        ],
      },
    }),
    prisma.$queryRaw<{ day: Date; count: number }[]>`
      SELECT (date_trunc('day', "createdAt"))::date AS day,
             COUNT(*)::int AS count
      FROM "Applicant"
      WHERE "createdAt" >= NOW() - INTERVAL '90 days'
      GROUP BY day
      ORDER BY day ASC;
    `,
  ]);

  const manualCount = Math.max(0, total - autoCount);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const chartData = rawChart.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    count: Number(r.count),
  }));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-4 md:py-6 space-y-6">
      {/* KPIs: en móvil fila con scroll; en ≥sm grid de 3 */}
      <div
        className="
          flex gap-3 overflow-x-auto -mx-1 px-1
          snap-x snap-mandatory
          sm:overflow-visible sm:grid sm:grid-cols-3 sm:gap-4 sm:mx-0 sm:px-0
        "
      >
        <div className="min-w-[180px] snap-start sm:min-w-0">
          <KpiCard
            title="Total Casos Recibidos"
            value={Intl.NumberFormat().format(total)}
            trendLabel="Últimos 30 días"
          />
        </div>
        <div className="min-w-[180px] snap-start sm:min-w-0">
          <KpiCard
            title="Preaprobados Automáticos"
            value={Intl.NumberFormat().format(autoCount)}
            subtitle="Regla: tiene tipo y número de documento"
          />
        </div>
        <div className="min-w-[180px] snap-start sm:min-w-0">
          <KpiCard
            title="Preaprobados Manuales"
            value={Intl.NumberFormat().format(manualCount)}
            subtitle="Total - Automáticos"
          />
        </div>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base sm:text-lg">Casos por día</CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Totales de los últimos 90 días
          </span>
        </CardHeader>
        <CardContent className="pt-4">
          <ApplicantsAreaChart data={chartData} />
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="text-lg sm:text-2xl">Solicitantes</CardTitle>
          <ApplicantsSearch initialQuery={qRaw} />
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              {qRaw ? "Sin resultados para la búsqueda." : "Aún no hay solicitantes."}
            </div>
          ) : (
            <div className="min-w-[720px]">
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
                    <th className="text-left py-2 pr-3">Estado</th>
                    <th className="text-left py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => {
                    const isDone = Boolean(a.docType && a.docNumber);
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-mono">{a.requestNo ?? "—"}</td>
                        <td className="py-2 pr-3 font-mono break-words">{a.requestCode ?? "—"}</td>
                        <td className="py-2 pr-3">
                          <span className="block truncate max-w-[220px] sm:max-w-none">
                            {a.firstName} {a.lastName}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{a.phoneE164}</td>
                        <td className="py-2 pr-3">
                          {a.docType ? `${a.docType as DocType} · ${a.docNumber ?? "—"}` : "—"}
                        </td>
                        <td className="py-2 pr-3">{a._count.documents}</td>
                        <td className="py-2 pr-3">{fmtDate(a.createdAt)}</td>
                        <td className="py-2 pr-3">
                          <StatusBadge status={isDone ? "done" : "in_process"} />
                        </td>
                        <td className="py-2">
                          <Link
                            href={`/applicants/${a.id}`}
                            className="underline underline-offset-2"
                            prefetch={false}
                          >
                            Ver ficha
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

/** --- UI helpers --- */

function KpiCard({
  title,
  value,
  subtitle,
  trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trendLabel?: string;
}) {
  return (
    <Card className="h-full p-2 sm:p-4">
      <CardHeader className="pb-1 sm:pb-2">
        <CardTitle className="text-sm sm:text-lg">{title}</CardTitle>
        {trendLabel && (
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            {trendLabel}
          </span>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-4xl font-semibold">{value}</div>
        {subtitle && (
          <div className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "done" | "in_process" }) {
  const isDone = status === "done";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-medium",
        isDone
          ? "border-green-500/20 text-green-500 bg-green-500/10"
          : "border-muted-foreground/20 text-muted-foreground bg-muted/40"
      )}
      title={isDone ? "Done" : "In process"}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          isDone ? "bg-green-500" : "bg-muted-foreground/50"
        )}
      />
      {isDone ? "Done" : "In process"}
    </span>
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