"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { controlClasses, Select, TextField } from "@/components/ui/field";
import { ACCEPT_ATTR, problemWith, sendFile } from "@/components/reprocann/upload-client";
import { cn } from "@/lib/cn";
import { fileSizeLabel } from "@/lib/file-size";
import { discardUploadsAction } from "../../reprocann/actions";
import { adminUploadAction } from "./reprocann-actions";

type Option = { value: string; label: string };
type Duplicate = { page: number; documentId: string; memberId: string; sameMember: boolean };

/**
 * Loads documentation the association already received: a new document or the files of one already
 * recorded without them, one file per page. The DNI printed on the document is checked against the
 * register; the files are checked again on the server. The document stays pending review.
 */
export function UploadDialog({
  open,
  onClose,
  memberId,
  mode,
  kinds,
  attachable,
}: {
  open: boolean;
  onClose: () => void;
  memberId: string;
  mode: "local" | "blob";
  kinds: Option[];
  /** Documents of this member still without files, not replaced and not verified. */
  attachable: Option[];
}) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState("nuevo");
  const [kind, setKind] = useState("credencial");
  const [expiresOn, setExpiresOn] = useState("");
  const [dni, setDni] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<Duplicate[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTarget("nuevo");
    setKind("credencial");
    setExpiresOn("");
    setDni("");
    setFiles([]);
    setError("");
    setDuplicates([]);
  };

  function add(list: FileList | null) {
    if (!list) return;
    const chosen = [...list];
    const problem = chosen.map((f) => problemWith(f) && `${f.name}: ${problemWith(f)}`).find(Boolean);
    setError(problem || "");
    if (!problem) setFiles((fs) => [...fs, ...chosen]);
    if (picker.current) picker.current.value = "";
  }

  async function save() {
    setError("");
    setDuplicates([]);
    if (!files.length) return setError("Elegí al menos un archivo.");
    if (!dni.trim()) return setError("Escribí el DNI que figura en el documento.");
    setBusy(true);
    const keys: string[] = [];
    try {
      for (const f of files) {
        const key = `reprocann/${memberId}/${crypto.randomUUID()}`;
        await sendFile({ mode, route: "/admin/reprocann/subida" }, key, f);
        keys.push(key);
      }
    } catch (e) {
      // A page did not arrive: the ones that did are removed, so nothing is half loaded.
      await discardUploadsAction({ memberId, keys }).catch(() => {});
      setBusy(false);
      return setError(`${files.length > 1 ? `Hoja ${keys.length + 1}: ` : ""}${(e as Error).message} No se guardó ninguna hoja.`);
    }
    let r: Awaited<ReturnType<typeof adminUploadAction>>;
    try {
      r = await adminUploadAction(memberId, { target, kind, expiresOn, dni, pages: keys });
    } catch {
      // Unknown result: whatever was not recorded is removed; a recorded document stays.
      await discardUploadsAction({ memberId, keys }).catch(() => {});
      setBusy(false);
      router.refresh();
      return setError("No pudimos confirmar la carga. Revisá la documentación del socio antes de volver a cargarla.");
    }
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      setDuplicates(r.duplicates ?? []);
      return;
    }
    reset();
    onClose();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Cargar documentación recibida"
      description="Queda pendiente de revisión: cargarla no la verifica. Se registra quién la cargó y cuándo."
      confirmLabel={busy ? "Cargando…" : files.length > 1 ? `Cargar ${files.length} hojas` : "Cargar"}
      confirmDisabled={busy || !files.length}
      onConfirm={() => void save()}
      wide
    >
      {error && (
        <Alert tone="error" live>
          {error}
          {duplicates.length > 0 && (
            <span className="mt-1 block">
              {duplicates.map((d) => (
                <span key={`${d.page}-${d.documentId}`} className="block">
                  Hoja {d.page}: ya está en{" "}
                  <Link href={`/admin/socios/${d.memberId}#reprocann`} className="!text-forest underline underline-offset-2">
                    {d.sameMember ? "un documento de este socio" : "la ficha de otro socio"}
                  </Link>
                  .
                </span>
              ))}
            </span>
          )}
        </Alert>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Select
          id="up-target"
          label="Documento"
          options={[{ value: "nuevo", label: "Documento nuevo" }, ...attachable]}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          hint={target === "nuevo" ? undefined : "Se adjuntan los archivos al registro existente; conserva su fecha y su estado."}
        />
        {target === "nuevo" ? <Select id="up-kind" label="Tipo de documento" options={kinds} value={kind} onChange={(e) => setKind(e.target.value)} /> : <span />}
        <TextField
          id="up-dni"
          label="DNI que figura en el documento"
          inputMode="numeric"
          autoComplete="off"
          hint="Se compara con el DNI del socio en el padrón. No se guarda."
          value={dni}
          onChange={(e) => setDni(e.target.value)}
          maxLength={12}
        />
        {target === "nuevo" ? (
          <TextField id="up-expires" type="date" label="Vencimiento" optional hint="El que figura en el documento. Queda sin verificar hasta la revisión." value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        ) : (
          <span />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-label text-foreground">Hojas</p>
        {files.length > 0 && (
          <ol className="space-y-1.5">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 !rounded-control border border-border px-3 py-2 text-small">
                <span className="min-w-0 truncate">
                  Hoja {i + 1}: {f.name} · {fileSizeLabel(f.size)}
                </span>
                <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="inline-flex shrink-0 items-center gap-1 text-text-muted hover:text-foreground" aria-label={`Quitar la hoja ${i + 1}`}>
                  <X aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <input ref={picker} id="up-files" type="file" multiple accept={ACCEPT_ATTR} className="peer sr-only" onChange={(e) => add(e.target.files)} />
        <label htmlFor="up-files" className={cn(controlClasses, "flex cursor-pointer items-center justify-center py-2 text-[0.9375rem] text-forest peer-focus-visible:outline-2 peer-focus-visible:outline-forest")}>
          {files.length ? "Agregar otra hoja" : "Elegir archivos"}
        </label>
        <p className="text-small text-text-muted">PDF, JPG o PNG de hasta 10 MB cada uno. Si el documento tiene varias hojas, elegilas en orden: forman un solo documento.</p>
      </div>
    </Dialog>
  );
}
