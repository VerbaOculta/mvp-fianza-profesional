// src/components/DocumentUploader.tsx
"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DocumentUploaderProps {
  label?: string;
  description?: string;
  accept?: string;
  onFileSelected: (file: File | null) => void;
}

export function DocumentUploader({
  label = "Documento de Identidad (PNG, JPG)",
  description = "Selecciona la imagen. Se subirá en el servidor al registrar.",
  accept = "image/*",
  onFileSelected,
}: DocumentUploaderProps) {
  const [fileName, setFileName] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFileName(f?.name || "");
    onFileSelected(f);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="file" accept={accept} onChange={handleChange} />
      {fileName ? (
        <p className="text-xs text-muted-foreground">Seleccionado: {fileName}</p>
      ) : null}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
