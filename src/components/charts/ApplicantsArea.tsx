// src/components/charts/ApplicantsArea.tsx
"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Point = { day: string; count: number };
type Range = 90 | 30 | 7;

export function ApplicantsAreaChart({ data }: { data: Point[] }) {
  const [range, setRange] = useState<Range>(90);

  const filtered = useMemo<Point[]>(() => {
    if (!data?.length) return [];
    const take = range;
    return data.slice(-take);
  }, [data, range]);

  const total = useMemo<number>(
    () => filtered.reduce((acc, p) => acc + (p.count || 0), 0),
    [filtered]
  );

  // ✅ Tipos compatibles sin 'any' ni tipos de recharts:
  const valueFormatter: (
    value: number | string,
    name: unknown,
    item: unknown,
    index: number
  ) => [number, string] = (value) => [Number(value ?? 0), "Casos"];

  const labelFormatter: (label: string | number) => string = (label) =>
    new Date(String(label)).toLocaleDateString();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-muted-foreground min-w-0">
          Total en rango: <span className="font-medium text-foreground">{total}</span>
        </div>
        <div className="inline-flex rounded-md border p-0.5 flex-wrap">
          <RangeBtn current={range} value={90} onClick={setRange}>
            Últimos 90 días
          </RangeBtn>
          <RangeBtn current={range} value={30} onClick={setRange}>
            Últimos 30 días
          </RangeBtn>
          <RangeBtn current={range} value={7} onClick={setRange}>
            Últimos 7 días
          </RangeBtn>
        </div>
      </div>

      <div className="w-full h-56 sm:h-64 md:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filtered} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopOpacity={0.35} />
                <stop offset="95%" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickMargin={8} minTickGap={18} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={valueFormatter}
              labelFormatter={labelFormatter}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="currentColor"
              fill="url(#fill)"
              strokeWidth={2}
              dot={false}
              className="text-foreground"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeBtn({
  current,
  value,
  onClick,
  children,
}: {
  current: Range;
  value: Range;
  onClick: (v: Range) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "rounded-[6px] px-2.5 h-8 text-xs",
        active ? "bg-muted" : "hover:bg-muted"
      )}
      onClick={() => onClick(value)}
    >
      {children}
    </Button>
  );
}
