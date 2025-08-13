// src/lib/n8n.ts
export type Payload = {
    sessionId: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    estado?: string;
    docType?: "CC" | "CE" | "PA";
    docNumber?: string;
  };
  
  export async function sendToN8N(data: Payload) {
    const url = "/api/n8n/inicia"; // ← llama a tu proxy interno
  
    console.log("[sendToN8N] Enviando a:", url);
    console.log("[sendToN8N] Payload:", data);
  
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  
    console.log("[sendToN8N] Status:", res.status);
  
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sendToN8N] Error:", text);
      throw new Error(`n8n error ${res.status}: ${text}`);
    }
  
    // trata de parsear, si no es JSON devuelve true
    try {
      return await res.json();
    } catch {
      return true;
    }
  }
  