"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { PhoneInput } from "react-international-phone";
import { sendToN8N } from "@/lib/n8n"; // 👈 importa tu servicio
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type DocType = "CC" | "CE" | "PA";

type FormState = {
  nombres: string;
  apellidos: string;
  telefono: string; // E.164
  docType: DocType;
  docNumber: string;
};

// const isColombiaE164 = (phone: string) => /^\+57(3\d{9})$/.test(phone);

function validateDoc(type: DocType, value: string) {
  const v = value.trim();
  if (type === "CC" || type === "CE") {
    const digits = v.replace(/\D/g, "");
    return {
      ok: /^\d{6,12}$/.test(digits),
      normalized: digits,
      error: "El número debe tener solo dígitos (6–12).",
    };
  }
  const alnum = v.replace(/\s+/g, "").toUpperCase();
  return {
    ok: /^[A-Z0-9]{6,15}$/.test(alnum),
    normalized: alnum,
    error: "Use 6–15 caracteres alfanuméricos (sin espacios).",
  };
}

export function Form() {
  const [form, setForm] = useState<FormState>({
    nombres: "",
    apellidos: "",
    telefono: "",
    docType: "CC",
    docNumber: "",
  });
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!form.nombres.trim() || !form.apellidos.trim()) {
      toast.error("Faltan datos", {
        description: "Completa Nombres y Apellidos.",
      });
      return;
    }
    const doc = validateDoc(form.docType, form.docNumber);
    if (!doc.ok) {
      toast.error("Documento inválido", { description: doc.error });
      return;
    }

    setLoading(true);
    try {
      // 1) Tu API interna
      const res = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.nombres.trim(),
          lastName: form.apellidos.trim(),
          phoneE164: form.telefono,
          docType: form.docType,
          docNumber: doc.normalized,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const sessionId: string = data.sessionId; // 👈 viene de tu API

      // 2) Notificar a n8n (integraremos docType/docNumber en el siguiente paso)
      try {
        await sendToN8N({
          sessionId,
          nombres: form.nombres.trim(),
          apellidos: form.apellidos.trim(),
          telefono: form.telefono,
          estado: "registrado",
          docType: form.docType,
          docNumber: doc.normalized,
        });
      } catch (e) {
        console.warn("[n8n] No se pudo notificar:", e);
        toast.warning("Registrado, pero hubo un aviso", {
          description: "No se pudo notificar a n8n.",
        });
      }

      toast.success(`Solicitud creada: ${data.requestCode}`, {
        description: `Número interno: ${data.requestNo}`,
      });
      setForm({
        nombres: "",
        apellidos: "",
        telefono: "",
        docType: "CC",
        docNumber: "",
      });
    } catch (e: unknown) {
      toast.error("Error al enviar", {
        description: e instanceof Error ? e.message : "Error desconocido",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border">
      <CardHeader>
        <CardTitle>Datos del Solicitante</CardTitle>
        <CardDescription>
          Ingresa la información y registraremos tu solicitud.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Tipo de documento */}
        <div className="grid gap-2">
          <Label htmlFor="docType">Tipo de documento*</Label>
          <Select
            value={form.docType}
            onValueChange={(v: DocType) =>
              setForm((p) => ({ ...p, docType: v, docNumber: "" }))
            }
          >
            <SelectTrigger id="docType" className="w-full h-10">
              <SelectValue placeholder="Selecciona un tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CC">Cédula de ciudadanía</SelectItem>
              <SelectItem value="PA">Pasaporte</SelectItem>
              <SelectItem value="CE">Cédula de extranjería</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Número de documento */}
        <div className="grid gap-2">
          <Label htmlFor="docNumber">Número de documento*</Label>
          <Input
            id="docNumber"
            name="docNumber"
            value={form.docNumber}
            onChange={(e) =>
              setForm((p) => ({ ...p, docNumber: e.target.value }))
            }
            inputMode={form.docType === "PA" ? "text" : "numeric"}
            placeholder={form.docType === "PA" ? "AB123456" : "123456789"}
          />
          <p className="text-xs text-muted-foreground">
            {form.docType === "PA"
              ? "Usa 6–15 caracteres alfanuméricos (sin espacios)."
              : "Solo dígitos (6–12)."}
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="nombres">Nombres</Label>
          <Input
            id="nombres"
            name="nombres"
            value={form.nombres}
            onChange={(e) =>
              setForm((p) => ({ ...p, nombres: e.target.value }))
            }
            placeholder="Juan"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="apellidos">Apellidos</Label>
          <Input
            id="apellidos"
            name="apellidos"
            value={form.apellidos}
            onChange={(e) =>
              setForm((p) => ({ ...p, apellidos: e.target.value }))
            }
            placeholder="Pérez"
          />
        </div>
        <div className="grid gap-2">
          <Label>Teléfono Celular</Label>
          <PhoneInput
            defaultCountry="co"
            value={form.telefono}
            onChange={(phone) => setForm((p) => ({ ...p, telefono: phone }))}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Se envía en formato internacional E.164 (ej.{" "}
            <code>+573001234567</code>).
          </p>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={onSubmit} disabled={loading}>
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </span>
          ) : (
            "Registrar solicitud"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
