// components/MetricsRow.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

type MetricCard = {
  title: string;
  value: number | string;
  subtitle?: string;      // texto secundario para desktop
  subtitleMobile?: string; // texto secundario alterno para mobile
};

type MetricsRowProps = {
  items: [MetricCard, MetricCard, MetricCard];
  className?: string;
};

/**
 * Muestra tres tarjetas métricas:
 * - En móviles: una fila horizontal con scroll y snap.
 * - En >= sm: grid de 3 columnas sin scroll.
 */
export function MetricsRow({ items, className = "" }: MetricsRowProps) {
  return (
    <div
      className={`
        flex gap-3 overflow-x-auto px-1 -mx-1
        snap-x snap-mandatory
        sm:overflow-visible sm:grid sm:grid-cols-3 sm:gap-4 sm:mx-0 sm:px-0
        ${className}
      `}
      aria-label="Resumen últimos 30 días"
    >
      {items.map((m, i) => (
        <Card key={i} className="min-w-[220px] snap-start sm:min-w-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm sm:text-lg">{m.title}</CardTitle>

            {/* Desktop: subtítulo completo */}
            {m.subtitle && (
              <p className="hidden text-sm text-muted-foreground sm:block">
                {m.subtitle}
              </p>
            )}

            {/* Mobile: subtítulo compacto */}
            {m.subtitleMobile && (
              <p className="mt-0.5 text-[11px] text-muted-foreground sm:hidden">
                {m.subtitleMobile}
              </p>
            )}
          </CardHeader>

          <CardContent className="pt-0">
            <div className="text-4xl font-semibold leading-none sm:text-5xl">
              {m.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
