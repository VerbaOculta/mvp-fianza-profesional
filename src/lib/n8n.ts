// src/lib/n8n.ts

type Payload = {
  sessionId: string;
  applicantId: string;
  nombres: string;
  apellidos: string;
  telefono: string; // E.164 con '+'
  estado: string;
  docType: "CC" | "CE" | "PA" | null;
  docNumber: string;
  rol: "Inquilino" | "DeudorSolidario";
  messageId?: string;
  channel?: string; // default: 'web'
};

type SendResult =
  | { ok: true; status?: number; body?: string }
  | { ok: false; reason: "no_url" | "timeout" | "fetch_error" | "client"; status?: number; body?: string };

/**
 * Notifica a n8n. Diseñado para usarse en el SERVIDOR.
 * Si se llama en el cliente, hace no-op silencioso.
 */
export async function sendToN8N(payload: Payload): Promise<SendResult> {
  const isServer = typeof window === "undefined";
  if (!isServer) return { ok: false, reason: "client" };

  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return { ok: false, reason: "no_url" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, channel: payload.channel ?? "web" }),
      signal: ctrl.signal,
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, status: res.status, body: text, reason: "fetch_error" };
    return { ok: true, status: res.status, body: text };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    return { ok: false, reason: isAbort ? "timeout" : "fetch_error" };
  } finally {
    clearTimeout(timer);
  }
}
