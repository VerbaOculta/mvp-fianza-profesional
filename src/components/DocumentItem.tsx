// src/components/DocumentItem.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type ApiResponse = {
  ok?: boolean;
  text?: string;
  error?: string;
  message?: string;
  documentId?: string;
  applicantId?: string;
};

type Props = {
  id: string;
  url: string;
  type: string;
  uploadedAtISO: string; // SIEMPRE ISO (desde el server)
};

const isImage = (u: string) => /\.(jpeg|jpg|png|gif|webp|bmp)$/i.test(u);
const isPdf = (u: string) => /\.pdf$/i.test(u);

// Determinístico y con guardas
function formatISO(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(d) + " UTC"
  );
}

export function DocumentItem({ id, url, type, uploadedAtISO }: Props) {
  const [loading, setLoading] = useState(false);
  const [ocrText, setOcrText] = useState<string | null>(null);

  const onProcess = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/${id}/process`, { method: "POST" });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);

      const text = (data.text ?? "").trim();
      const snippet = text.replace(/\s+/g, " ").slice(0, 140);
      toast.success("Documento procesado", {
        description: snippet
          ? `Texto detectado: ${snippet}${text.length > 140 ? "…" : ""}`
          : data.message || "Sin texto",
      });
      setOcrText(text || "");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error("No se pudo procesar", { description: msg });
      setOcrText(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 items-start">
      {/* Preview */}
      <div className="shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {isImage(url) ? (
            <Image
              src={url}
              alt={`Documento ${type}`}
              width={300}
              height={200}
              className="max-h-48 rounded-md border object-contain bg-muted"
              unoptimized
              loader={({ src }) => src}
            />
          ) : isPdf(url) ? (
            <iframe
              src={url}
              className="rounded-md border bg-muted"
              width={300}
              height={200}
            />
          ) : (
            <div className="w-[300px] h-[200px] grid place-items-center rounded-md border bg-muted text-xs text-muted-foreground">
              Vista previa no disponible
            </div>
          )}
        </a>

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
          Subido: {formatISO(uploadedAtISO)}
        </div>

        <div className="mt-3 flex flex-wrap gap-3">
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
