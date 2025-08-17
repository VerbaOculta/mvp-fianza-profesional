// src/components/ApplicantsSearch.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ApplicantsSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = useState(initialQuery);
  const router = useRouter();
  const params = useSearchParams();

  // Mantén el input en sync si el usuario navega entre páginas
  useEffect(() => {
    setQ(params.get("q") || "");
  }, [params]);

  const go = () => {
    const qs = new URLSearchParams();
    if (q.trim()) qs.set("q", q.trim());
    qs.set("page", "1"); // resetear paginación al buscar
    router.push(`/applicants${qs.toString() ? `?${qs}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        placeholder="Buscar por nombre, teléfono, doc, código…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        className="max-w-md"
      />
      <Button onClick={go}>Buscar</Button>
    </div>
  );
}
