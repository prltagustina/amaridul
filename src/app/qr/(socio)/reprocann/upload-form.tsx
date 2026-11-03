"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { controlClasses, describedBy, FieldShell, TextField } from "@/components/ui/field";
import { ACCEPT_ATTR, problemWith, sendFile } from "@/components/reprocann/upload-client";
import { cn } from "@/lib/cn";
import { fileSizeLabel } from "@/lib/file-size";
import { registerUploadAction } from "./actions";

const FILE_HINT = "PDF, JPG o PNG, de hasta 10 MB. Puede ser una foto nítida de la credencial.";

export default function UploadForm({
  mode,
  folder,
  replacing,
  knownExpiry,
}: {
  mode: "local" | "blob";
  /** The member's folder in private storage; the file name is random. */
  folder: string;
  /** The member is correcting a credential they sent that is still under review. */
  replacing: boolean;
  /** The expiry the association already has for the current credential, so it is not asked again. */
  knownExpiry: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [expiresOn, setExpiresOn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [received, setReceived] = useState(false);
  const [busy, setBusy] = useState(false);

  function pick(f: File | null) {
    setReceived(false);
    setFormError(undefined);
    setFile(f);
    setFileError(f ? problemWith(f) : undefined);
  }

  async function send() {
    setReceived(false);
    setFormError(undefined);
    if (!file) return setFileError("Elegí el archivo.");
    const problem = problemWith(file);
    if (problem) return setFileError(problem);
    setBusy(true);
    const key = folder + crypto.randomUUID();
    try {
      await sendFile({ mode, route: "/api/reprocann/subida" }, key, file);
    } catch (e) {
      setFormError((e as Error).message);
      setBusy(false);
      return;
    }
    const result = await registerUploadAction({ key, expiresOn });
    setBusy(false);
    if (!result.ok) return setFormError(result.error);
    setReceived(true);
    setFile(null);
    setExpiresOn("");
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      {received && (
        <Alert tone="success" live>
          Recibimos tu documentación. Está pendiente de revisión.
        </Alert>
      )}
      {formError && (
        <Alert tone="error" live>
          {formError}
        </Alert>
      )}
      {replacing && <p className="text-small text-text-muted">El archivo nuevo reemplaza al que enviaste antes. El anterior queda en tu historial.</p>}
      <FieldShell id="doc-file" label="Archivo de tu credencial" hint={FILE_HINT} error={fileError}>
        {/* The native control, kept for keyboards and screen readers; the visible box says what was chosen. */}
        <input
          ref={input}
          id="doc-file"
          name="doc-file"
          type="file"
          accept={ACCEPT_ATTR}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={describedBy("doc-file", FILE_HINT, fileError)}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="peer sr-only"
        />
        <div
          aria-hidden
          onClick={() => input.current?.click()}
          className={cn(controlClasses, "flex cursor-pointer items-center gap-3 py-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest", fileError && "border-error-fg")}
        >
          <span className="shrink-0 !rounded-full bg-forest-soft px-4 py-1.5 font-ui text-[0.9375rem] text-forest">{file ? "Cambiar" : "Elegir archivo"}</span>
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-text-muted">{file ? `${file.name} · ${fileSizeLabel(file.size)}` : "Ningún archivo elegido"}</span>
        </div>
      </FieldShell>
      <TextField
        id="doc-expires"
        type="date"
        label="Fecha de vencimiento"
        optional
        hint={
          knownExpiry
            ? `Ya tenemos registrado el ${knownExpiry.split("-").reverse().join("/")}. Completala solo si tu credencial dice otra fecha.`
            : "Si figura en la credencial. La asociación la confirma al revisarla."
        }
        value={expiresOn}
        onChange={(e) => setExpiresOn(e.target.value)}
      />
      <Button type="submit" full loading={busy} loadingLabel="Enviando…">
        <Upload aria-hidden className="size-4" strokeWidth={1.5} /> Enviar credencial
      </Button>
      <p className="text-small text-text-muted">Solo la ven vos y el equipo de la asociación que revisa la documentación. Enviarla no la verifica: la asociación la revisa.</p>
    </form>
  );
}
