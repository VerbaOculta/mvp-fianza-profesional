"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ModeToggle } from "@/components/mode-toggle";

const WEBHOOK_ENV = process.env.NEXT_PUBLIC_N8N_PAY_WEBHOOK || "";
const AUTH_ENV = process.env.NEXT_PUBLIC_N8N_PAY_TOKEN || "";

/** Convierte a número de forma segura */
function toNumberSafe(v: string | null, fallback = 0) {
  if (!v) return fallback;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

/** ID aleatorio estable solo en cliente (evita hydration mismatch) */
function randId(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

export default function PagoDemoPage() {
  const sp = useSearchParams();

  const webhookUrl = useMemo(() => sp.get("webhook") || WEBHOOK_ENV, [sp]);
  const requestCode = sp.get("sol") || "SOL-000001";
  const amount = toNumberSafe(sp.get("monto"), 150000);
  const currency = (sp.get("moneda") || "COP").toUpperCase();
  const remoteJid = sp.get("jid") || "";
  const name = sp.get("nombre") || "Cliente";

  // Estado generado en cliente para evitar desalineación con SSR
  const [txId, setTxId] = useState<string>("");

  // Formateo estable entre server/cliente
  const amountLabel = useMemo(
    () => new Intl.NumberFormat("es-CO").format(amount),
    [amount]
  );

  const [loading, setLoading] = useState(false);
  const canPay = Boolean(webhookUrl);

  useEffect(() => {
    setTxId(randId());
  }, []);

  async function pagar() {
    if (!webhookUrl) {
      toast.error("No se configuró el webhook de n8n");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        event: "demo.payment",
        status: "paid",
        requestCode,
        amount,
        currency,
        paidAt: new Date().toISOString(),
        transactionId: txId || randId(),
        remoteJid: remoteJid || null,
        meta: { source: "web-demo" },
        name,
      };

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(AUTH_ENV ? { Authorization: `Bearer ${AUTH_ENV}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Pago registrado correctamente ✅");
    } catch (err) {
      toast.error("No se pudo notificar el pago", {
        description: err instanceof Error ? err.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 grid place-items-center">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-center flex-1">
            Pago de Equifax
          </h1>
          <ModeToggle />
        </div>

        <Card className="border">
          <CardHeader>
            <CardTitle>Confirmar pago</CardTitle>
            <CardDescription>
              Página de demo para disparar el webhook de pago hacia n8n.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Solicitud</span>
              <span className="font-medium">{requestCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-medium">
                {amountLabel} {currency}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono">{txId || "—"}</span>
            </div>

            {!canPay && (
              <p className="text-xs text-amber-600">
                Configura{" "}
                <code className="font-mono">
                  NEXT_PUBLIC_N8N_PAY_WEBHOOK
                </code>{" "}
                o pasa{" "}
                <code className="font-mono">?webhook=https://…</code> en la URL
                para habilitar el botón.
              </p>
            )}
          </CardContent>

          <CardFooter>
            <Button className="w-full" disabled={!canPay || loading} onClick={pagar}>
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando pago…
                </span>
              ) : (
                "Pagar Ahora"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
