"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { controlClasses, Select, TextField } from "@/components/ui/field";
import { removeCertificate, uploadCertificate } from "@/components/products/photo-client";
import { cn } from "@/lib/cn";
import { saveProductSheetAction, type SheetFormValues } from "./actions";

export type SheetRow = {
  id: string;
  name: string;
  type: string;
  sheet: SheetFormValues & { hasCertificate: boolean };
};

const UNITS = [
  { value: "porcentaje", label: "% (flores)" },
  { value: "mg_ml", label: "mg/ml (aceites)" },
  { value: "mg_g", label: "mg/g (cremas)" },
];
const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

/**
 * The product's technical sheet, as members see it under Origen, Composición and Análisis.
 * The fields save together; the certificate is uploaded or removed on its own, right away.
 */
export function SheetDialog({ row, onClose, onSaved }: { row: SheetRow | null; onClose: () => void; onSaved: (message: string) => void }) {
  const router = useRouter();
  const picker = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<SheetFormValues>(() => {
    const s = row?.sheet;
    return {
      harvestedOn: s?.harvestedOn ?? "",
      labName: s?.labName ?? "",
      analyzedOn: s?.analyzedOn ?? "",
      compositionUnit: s?.compositionUnit ?? (row?.type === "aceite" ? "mg_ml" : row?.type === "crema" ? "mg_g" : row ? "porcentaje" : ""),
      thc: s?.thc ?? "",
      cbd: s?.cbd ?? "",
      dropsPerMl: s?.dropsPerMl ?? "",
      cannabinoids: s?.cannabinoids.length ? s.cannabinoids : [{ compound: "", value: "" }],
    };
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SheetFormValues, string>>>({});
  const [formError, setFormError] = useState("");
  const [certificate, setCertificate] = useState<{ has: boolean; busy: "" | "subiendo" | "quitando"; error: string; notice: string }>({ has: !!row?.sheet.hasCertificate, busy: "", error: "", notice: "" });
  const [pending, start] = useTransition();

  const set = (k: keyof SheetFormValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const setRow = (i: number, k: "compound" | "value", value: string) => setValues((v) => ({ ...v, cannabinoids: v.cannabinoids.map((r, j) => (j === i ? { ...r, [k]: value } : r)) }));

  const save = () =>
    start(async () => {
      if (!row) return;
      setFormError("");
      const r = await saveProductSheetAction(row.id, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        return;
      }
      onSaved(`Ficha técnica de «${row.name}» guardada.`);
      router.refresh();
    });

  async function upload(file: File | undefined) {
    if (!row || !file) return;
    setCertificate((c) => ({ ...c, busy: "subiendo", error: "", notice: "" }));
    try {
      await uploadCertificate(row.id, file);
      setCertificate({ has: true, busy: "", error: "", notice: "Certificado guardado." });
      router.refresh();
    } catch (e) {
      setCertificate((c) => ({ ...c, busy: "", error: (e as Error).message }));
    } finally {
      if (picker.current) picker.current.value = "";
    }
  }
  async function remove() {
    if (!row) return;
    setCertificate((c) => ({ ...c, busy: "quitando", error: "", notice: "" }));
    try {
      await removeCertificate(row.id);
      setCertificate({ has: false, busy: "", error: "", notice: "Certificado quitado." });
      router.refresh();
    } catch (e) {
      setCertificate((c) => ({ ...c, busy: "", error: (e as Error).message }));
    }
  }

  const section = "space-y-3 border-t border-border pt-5 first:border-t-0 first:pt-0";
  return (
    <Dialog
      open={row !== null}
      onClose={onClose}
      title={row ? `Ficha técnica de ${row.name}` : ""}
      description="Los socios la ven en la ficha del producto: Origen, Composición y Análisis. Lo que quede vacío figura como pendiente."
      confirmLabel={pending ? "Guardando…" : "Guardar ficha"}
      confirmDisabled={pending}
      onConfirm={save}
      wide
    >
      {formError && (
        <Alert tone="error" live>
          {formError}
        </Alert>
      )}
      <div className="space-y-5">
        <section className={section} aria-labelledby="ficha-origen">
          <h3 id="ficha-origen" className="text-h3 text-forest">
            Origen
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField id="sheet-harvested" type="date" label="Cosecha" optional max={todayInArgentina()} value={values.harvestedOn} onChange={set("harvestedOn")} error={errors.harvestedOn} />
            <TextField id="sheet-analyzed" type="date" label="Fecha de análisis" optional max={todayInArgentina()} value={values.analyzedOn} onChange={set("analyzedOn")} error={errors.analyzedOn} />
            <TextField id="sheet-lab" label="Laboratorio" optional value={values.labName} onChange={set("labName")} error={errors.labName} maxLength={80} autoComplete="off" />
          </div>
        </section>

        <section className={section} aria-labelledby="ficha-composicion">
          <h3 id="ficha-composicion" className="text-h3 text-forest">
            Composición
          </h3>
          <div className={cn("grid gap-4", row?.type === "aceite" ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
            <Select id="sheet-unit" label="Unidad" optional placeholder="Elegí la unidad" options={UNITS} value={values.compositionUnit} onChange={set("compositionUnit")} error={errors.compositionUnit} />
            <TextField id="sheet-thc" label="THC" optional inputMode="decimal" placeholder="Ej.: 18,5" value={values.thc} onChange={set("thc")} error={errors.thc} />
            <TextField id="sheet-cbd" label="CBD" optional inputMode="decimal" placeholder="Ej.: 0,8" value={values.cbd} onChange={set("cbd")} error={errors.cbd} />
            {row?.type === "aceite" && <TextField id="sheet-drops" label="Gotas por ml" optional inputMode="numeric" placeholder="Ej.: 30" value={values.dropsPerMl} onChange={set("dropsPerMl")} error={errors.dropsPerMl} />}
          </div>
        </section>

        <section className={section} aria-labelledby="ficha-analisis">
          <h3 id="ficha-analisis" className="text-h3 text-forest">
            Perfil de cannabinoides
          </h3>
          <p className="text-small text-text-muted">Como figura en el análisis del laboratorio, por ejemplo «THC» y «18,2 %».</p>
          {errors.cannabinoids && <p className="text-small text-error-fg">{errors.cannabinoids}</p>}
          <ul className="space-y-2">
            {values.cannabinoids.map((r, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)_auto] items-center gap-2">
                <input aria-label={`Compuesto, fila ${i + 1}`} value={r.compound} onChange={(e) => setRow(i, "compound", e.target.value)} maxLength={40} placeholder="Compuesto" className={cn(controlClasses, "py-2")} />
                <input aria-label={`Concentración, fila ${i + 1}`} value={r.value} onChange={(e) => setRow(i, "value", e.target.value)} maxLength={30} placeholder="Concentración" className={cn(controlClasses, "py-2 tabular-nums")} />
                <button
                  type="button"
                  aria-label={`Quitar la fila ${i + 1}`}
                  onClick={() => setValues((v) => ({ ...v, cannabinoids: v.cannabinoids.length > 1 ? v.cannabinoids.filter((_, j) => j !== i) : [{ compound: "", value: "" }] }))}
                  className="flex size-10 items-center justify-center !rounded-control text-text-muted hover:bg-surface-sunken hover:text-error-fg"
                >
                  <X aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
          {values.cannabinoids.length < 20 && (
            <Button type="button" variant="ghost" shape="admin" className="-ml-1 min-h-9" onClick={() => setValues((v) => ({ ...v, cannabinoids: [...v.cannabinoids, { compound: "", value: "" }] }))}>
              <Plus aria-hidden className="size-4" strokeWidth={1.5} /> Agregar fila
            </Button>
          )}
        </section>

        <section className={section} aria-labelledby="ficha-certificado">
          <h3 id="ficha-certificado" className="text-h3 text-forest">
            Certificado de análisis
          </h3>
          {certificate.error && (
            <Alert tone="error" live>
              {certificate.error}
            </Alert>
          )}
          {certificate.notice && (
            <p role="status" className="text-small text-success-fg">
              {certificate.notice}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {certificate.has && row && (
              <a href={`/admin/productos/${row.id}/certificado`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center gap-1.5 font-medium !text-forest underline-offset-4 hover:underline">
                Ver el certificado <ExternalLink aria-hidden className="size-4" strokeWidth={1.5} />
              </a>
            )}
            <input ref={picker} id="sheet-certificate" type="file" accept="application/pdf" className="peer sr-only" onChange={(e) => void upload(e.target.files?.[0])} disabled={certificate.busy !== ""} />
            <label
              htmlFor="sheet-certificate"
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 !rounded-control border border-forest px-5 !text-forest hover:bg-forest-soft peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
            >
              <FileUp aria-hidden className="size-4" strokeWidth={1.5} /> {certificate.busy === "subiendo" ? "Subiendo…" : certificate.has ? "Reemplazar PDF" : "Subir PDF"}
            </label>
            {certificate.has && (
              <Button variant="ghost" shape="admin" onClick={() => void remove()} disabled={certificate.busy !== ""} loading={certificate.busy === "quitando"} loadingLabel="Quitando…">
                <Trash2 aria-hidden className="size-4" strokeWidth={1.5} /> Quitar
              </Button>
            )}
          </div>
          <p className="text-small text-text-muted">PDF de hasta 8 MB. Se guarda en el momento y los socios lo abren desde la ficha del producto.</p>
        </section>
      </div>
    </Dialog>
  );
}
