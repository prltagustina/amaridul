"use client";

import { useState } from "react";
import { Eye, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Card, DevTag } from "@/components/ui/display";
import { Select, TextField } from "@/components/ui/field";
import { LotCard } from "@/components/lots/lot-card";
import { products, type Cannabinoid, type Lot } from "@/demo/fixtures";

const COMPOUNDS: Cannabinoid["compound"][] = ["CBD", "CBDA", "THC", "THCA", "CBG", "CBN"];

const BLANK: Lot = {
  code: "AD-2026-",
  product: "",
  variety: "",
  chemotype: "",
  cultivated: "",
  harvested: "",
  analysed: "",
  lab: "",
  cannabinoids: [{ compound: "CBD", value: "" }],
  hasCertificate: false,
  status: "borrador",
};

export default function LotEditor({ initial }: { initial: Lot | null }) {
  const [lot, setLot] = useState<Lot>(initial ?? BLANK);
  const [notice, setNotice] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const set = <K extends keyof Lot>(k: K, v: Lot[K]) => setLot((l) => ({ ...l, [k]: v }));
  const setCompound = (i: number, patch: Partial<Cannabinoid>) => set("cannabinoids", lot.cannabinoids.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const preview = (
    <div className="space-y-3">
      <p className="text-eyebrow text-accent">Vista previa · así lo ve el socio</p>
      <LotCard lot={{ ...lot, product: lot.product || "Producto", code: lot.code || "—" }} onCertificate={() => undefined} />
    </div>
  );

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <form
        className="space-y-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setNotice(lot.status === "publicado" ? "Lote guardado y publicado." : "Borrador guardado.");
        }}
      >
        {notice && (
          <Alert tone="success" live>
            {notice} <DevTag>Demo · no se guardó</DevTag>
          </Alert>
        )}
        <Card className="space-y-5">
          <h2 className="text-h3">Identificación</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="code" label="Código de lote" className="font-mono uppercase" value={lot.code} onChange={(e) => set("code", e.target.value.toUpperCase())} hint="Es el mismo código que va impreso en el envase." />
            <Select id="product" label="Producto" placeholder="Elegí" options={products.map((p) => p.name)} value={lot.product} onChange={(e) => set("product", e.target.value)} />
            <TextField id="variety" label="Variedad" value={lot.variety} onChange={(e) => set("variety", e.target.value)} />
            <TextField id="chemotype" label="Quimiotipo" value={lot.chemotype} onChange={(e) => set("chemotype", e.target.value)} />
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-h3">Fechas y laboratorio</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="cultivated" label="Inicio de cultivo" placeholder="dd/mm/aaaa" value={lot.cultivated} onChange={(e) => set("cultivated", e.target.value)} />
            <TextField id="harvested" label="Cosecha" placeholder="dd/mm/aaaa" value={lot.harvested} onChange={(e) => set("harvested", e.target.value)} />
            <TextField id="analysed" label="Fecha de análisis" placeholder="dd/mm/aaaa" value={lot.analysed} onChange={(e) => set("analysed", e.target.value)} />
            <TextField id="lab" label="Laboratorio" value={lot.lab} onChange={(e) => set("lab", e.target.value)} />
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="text-h3">Análisis HPLC</h2>
          <ul className="space-y-3">
            {lot.cannabinoids.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <Select id={`compound-${i}`} label="Compuesto" options={COMPOUNDS} value={c.compound} onChange={(e) => setCompound(i, { compound: e.target.value as Cannabinoid["compound"] })} />
                <TextField id={`value-${i}`} label="Concentración" placeholder="0,0 %" value={c.value} onChange={(e) => setCompound(i, { value: e.target.value })} />
                <button
                  type="button"
                  onClick={() => set("cannabinoids", lot.cannabinoids.filter((_, j) => j !== i))}
                  disabled={lot.cannabinoids.length === 1}
                  className="mb-0.5 flex size-11 items-center justify-center !rounded-control text-text-muted hover:bg-error-bg hover:text-error-fg disabled:opacity-40"
                >
                  <span className="sr-only">Quitar {c.compound}</span>
                  <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
          <Button
            shape="admin"
            variant="ghost"
            disabled={lot.cannabinoids.length >= COMPOUNDS.length}
            onClick={() => set("cannabinoids", [...lot.cannabinoids, { compound: COMPOUNDS.find((x) => !lot.cannabinoids.some((c) => c.compound === x)) ?? "CBN", value: "" }])}
          >
            <Plus aria-hidden className="size-4" strokeWidth={1.5} /> Agregar compuesto
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-h3">Certificado de análisis</h2>
          <div className="flex flex-col items-center gap-3 !rounded-control border border-dashed border-border-strong/60 px-4 py-8 text-center">
            <FileUp aria-hidden className="size-8 text-accent" strokeWidth={1.25} />
            <p className="text-small text-text-muted">{lot.hasCertificate ? "Certificado cargado (PDF)." : "Subí el PDF del laboratorio. Máximo 10 MB."}</p>
            <Button shape="admin" variant="secondary" onClick={() => set("hasCertificate", !lot.hasCertificate)}>
              {lot.hasCertificate ? "Quitar certificado" : "Simular carga"}
            </Button>
            <DevTag>Sin carga real de archivos</DevTag>
          </div>
        </Card>

        <Card className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <Select
            id="status"
            label="Estado"
            options={[
              { value: "borrador", label: "Borrador (no visible)" },
              { value: "publicado", label: "Publicado" },
              { value: "retirado", label: "Retirado" },
            ]}
            value={lot.status}
            onChange={(e) => set("status", e.target.value as Lot["status"])}
          />
          <div className="flex flex-wrap gap-2">
            <Button shape="admin" variant="secondary" className="xl:hidden" onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
              <Eye aria-hidden className="size-4" strokeWidth={1.5} /> {showPreview ? "Ocultar vista previa" : "Vista previa"}
            </Button>
            <Button type="submit" shape="admin">
              Guardar
            </Button>
          </div>
        </Card>
        {showPreview && <div className="xl:hidden">{preview}</div>}
      </form>

      <div className="hidden xl:block">
        <div className="sticky top-6">{preview}</div>
      </div>
    </div>
  );
}
