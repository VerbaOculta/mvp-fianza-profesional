"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Props = {
  id: string;
  url: string;           // URL pública del archivo en S3
  type: string;          // enum como string (DocumentType)
  uploadedAt: Date | string;
};

function fmtDate(d: Date | string) {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString();
}

export function DocumentItem({ id, url, type, uploadedAt }: Props) {
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);

  const onProcess = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "web" }),
      });

      const data: { ok?: boolean; text?: string; message?: string; error?: string } =
        await res.json().catch(() => ({}));

      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      const snippet = (data.text || "")
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 140);

      // Mostrar toast y guardar texto para renderizar debajo de la imagen
      toast.success("Documento procesado", {
        description:
          snippet && snippet.length > 0
            ? `Texto detectado: ${snippet}${data.text && data.text.length > 140 ? "…" : ""}`
            : data.message || "Se inició el procesamiento.",
      });

      setOcrText((data.text || "").trim() || "");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("No se pudo procesar", { description: msg });
      setOcrText(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 items-start">
      {/* Columna de imagen + resultado OCR debajo */}
      <div className="shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Image
            src={url}
            alt={`Documento ${type}`}
            width={300}
            height={200}
            className="max-h-48 rounded-md border object-contain bg-muted"
            unoptimized
            loader={({ src }) => src}
          />
        </a>

        {/* Resultado del procesamiento debajo de la imagen */}
        {ocrText !== null && (
          <div className="mt-2 w-[300px] max-w-full rounded-md border bg-muted/60 p-2 text-xs whitespace-pre-wrap">
            {ocrText ? ocrText : "Sin texto detectado."}
          </div>
        )}
      </div>

      {/* Info + acciones */}
      <div className="min-w-0 flex-1">
        <div className="text-sm text-muted-foreground">Tipo</div>
        <div className="font-medium">{type}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Subido: {fmtDate(uploadedAt)}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={url}
            prefetch={false}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
          >
            Ver en nueva pestaña <ExternalLink className="w-4 h-4" />
          </Link>

          <Button
            onClick={onProcess}
            disabled={loading}
            aria-busy={loading}
            className="inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {loading ? "Procesando…" : "Procesar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
