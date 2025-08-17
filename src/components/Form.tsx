// src/components/Form.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PhoneInput } from "react-international-phone";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Rol } from "@prisma/client";
import { DocumentUploader } from "@/components/DocumentUploader";

type DocType = "CC" | "CE" | "PA";
type RolType = Rol;

function validateDoc(type: DocType, value: string) {
  const v = value.trim();
  if (type === "CC" || type === "CE") {
    const digits = v.replace(/\D/g, "");
    return { ok: /^\d{6,12}$/.test(digits), normalized: digits, error: "El número debe tener solo dígitos (6–12)." };
  }
  const alnum = v.replace(/\s+/g, "").toUpperCase();
  return { ok: /^[A-Z0-9]{6,15}$/.test(alnum), normalized: alnum, error: "Usa 6–15 caracteres alfanuméricos (sin espacios)." };
}

export function Form() {
  const [rol, setRol] = useState<RolType>("Inquilino");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [docType, setDocType] = useState<DocType>("CC");
  const [docNumber, setDocNumber] = useState("");
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [fileResetKey, setFileResetKey] = useState(0);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setRol("Inquilino");
    setNombres("");
    setApellidos("");
    setTelefono("");
    setDocType("CC");
    setDocNumber("");
    setLocalFile(null);
    setFileResetKey((k) => k + 1);
  };

  const onSubmit = async () => {
    if (!nombres.trim() || !apellidos.trim()) {
      toast.error("Faltan datos", { description: "Completa Nombres y Apellidos." });
      return;
    }
    const doc = validateDoc(docType, docNumber);
    if (!doc.ok) {
      toast.error("Documento inválido", { description: doc.error });
      return;
    }
    if (!localFile) {
      toast.error("Falta archivo", { description: "Debes seleccionar una imagen del documento." });
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("rol", rol);
      fd.append("nombres", nombres.trim());
      fd.append("apellidos", apellidos.trim());
      fd.append("telefono", telefono);
      fd.append("docType", docType);
      fd.append("docNumber", doc.normalized);
      fd.append("documentFile", new File([localFile], localFile.name, { type: localFile.type }));

      const res = await fetch("/api/applicants", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      toast.success(`Solicitud creada: ${data.requestCode}`, {
        description: `Número interno: ${data.requestNo}`,
      });

      // 🔐 Asegura estado awaiting_opt_in en Conversation (canal web)
      const remoteJid = `${telefono.replace(/\D/g, "")}@s.whatsapp.net`;
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicantId: data.applicantId,
          messageId: data.sessionId,
          remoteJid,          // <- tocamos la fila que sueles ver en DB
          phoneE164: telefono // por si quisieras derivarlo en el server
        }),
      }).catch(() => { /* no bloquees la UX */ });

      resetForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error("Error al enviar", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Card 1: Datos */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Datos del Solicitante</CardTitle>
          <CardDescription>Ingresa la información del solicitante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="rol">Rol del Solicitante*</Label>
            <Select value={rol} onValueChange={(v: RolType) => setRol(v)}>
              <SelectTrigger id="rol" className="w-full h-10">
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inquilino">Inquilino</SelectItem>
                <SelectItem value="DeudorSolidario">Deudor Solidario</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="docType">Tipo de documento*</Label>
            <Select
              value={docType}
              onValueChange={(v: DocType) => {
                setDocType(v);
                setDocNumber("");
              }}
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

          <div className="grid gap-2">
            <Label htmlFor="docNumber">Número de documento*</Label>
            <Input
              id="docNumber"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              inputMode={docType === "PA" ? "text" : "numeric"}
              placeholder={docType === "PA" ? "AB123456" : "123456789"}
            />
            <p className="text-xs text-muted-foreground">
              {docType === "PA"
                ? "Usa 6–15 caracteres alfanuméricos (sin espacios)."
                : "Solo dígitos (6–12)."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Juan" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input id="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Pérez" />
          </div>

          <div className="grid gap-2">
            <Label>Teléfono Celular</Label>
            <PhoneInput defaultCountry="co" value={telefono} onChange={setTelefono} className="w-full" />
            <p className="text-xs text-muted-foreground">
              Se envía en formato internacional E.164 (ej. <code>+573001234567</code>).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Documento + enviar */}
      <Card className="border">
        <CardHeader>
          <CardTitle>Documento de Identidad</CardTitle>
          <CardDescription>Selecciona la imagen del documento. Se subirá al registrar la solicitud.</CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader
            key={fileResetKey}
            label="Documento (PNG, JPG)"
            description="Asegúrate de que sea legible."
            accept="image/*"
            onFileSelected={setLocalFile}
          />
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
    </div>
  );
}
