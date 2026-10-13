"use client";

import { useRef, useState, type FormEvent } from "react";
import { Leaf, Search } from "lucide-react";
import { CertificatePreview, LotCard } from "@/components/lots/lot-card";
import { Button } from "@/components/ui/button";
import { Alert, DevTag, EmptyState, LoadingBlock } from "@/components/ui/display";
import { TabbedCard } from "@/components/ui/technical";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField } from "@/components/ui/field";
import { findLotByCode, lots, products, type Lot } from "@/demo/fixtures";

export type LookupState = "default" | "lote" | "invalido" | "loading" | "error" | "sin-certificado" | "certificado";

const CODE_FOR: Partial<Record<LookupState, string>> = {
  lote: "AD-2025-08-01",
  certificado: "AD-2025-08-01",
  "sin-certificado": "AD-2025-11-02",
  invalido: "AD-0000-00-00",
};

type Result = { kind: "idle" } | { kind: "loading" } | { kind: "error" } | { kind: "invalid" } | { kind: "lot"; lot: Lot };

function initialResult(state: LookupState): Result {
  if (state === "loading") return { kind: "loading" };
  if (state === "error") return { kind: "error" };
  if (state === "invalido") return { kind: "invalid" };
  const lot = CODE_FOR[state] ? findLotByCode(CODE_FOR[state]) : undefined;
  return lot ? { kind: "lot", lot } : { kind: "idle" };
}

export default function LotLookup({ initial }: { initial: LookupState }) {
  const preset = CODE_FOR[initial] ? lots.find((l) => l.code === CODE_FOR[initial]) : undefined;
  const [product, setProduct] = useState(preset ? (products.find((p) => p.name === preset.product)?.id ?? "") : "");
  const [code, setCode] = useState(CODE_FOR[initial] ?? "");
  const [errors, setErrors] = useState<{ product?: string; code?: string }>({});
  const [result, setResult] = useState<Result>(initialResult(initial));
  const [certOpen, setCertOpen] = useState(initial === "certificado");
  const resultRef = useRef<HTMLDivElement>(null);

  function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e: typeof errors = {};
    if (!product) e.product = "Elegí el producto.";
    if (!code.trim()) e.code = "Escribí el código del envase.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setResult({ kind: "loading" });
    // Demo only: looks up the fixtures. The real lookup is rate-limited server side.
    window.setTimeout(() => {
      const lot = findLotByCode(code);
      const name = products.find((p) => p.id === product)?.name;
      setResult(lot && lot.product === name && lot.status === "publicado" ? { kind: "lot", lot } : { kind: "invalid" });
      requestAnimationFrame(() => resultRef.current?.focus());
    }, 700);
  }

  return (
    <div className="space-y-8">
      <TabbedCard tab="Tu envase">
        <form noValidate onSubmit={onSubmit} className="grid gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start" aria-busy={result.kind === "loading"}>
          <Select
            id="producto"
            label="Producto"
            placeholder="Elegí un producto"
            options={products.filter((p) => p.status === "activo").map((p) => ({ value: p.id, label: p.name }))}
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            error={errors.product}
          />
          <TextField
            id="codigo"
            label="Código del envase"
            placeholder="AD-0000-00-00"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={errors.code}
            className="font-mono uppercase tracking-wide placeholder:normal-case"
          />
          <Button type="submit" size="md" loading={result.kind === "loading"} loadingLabel="Buscando…" className="sm:mt-[1.85rem]">
            <Search aria-hidden className="size-4" strokeWidth={1.5} /> Consultar
          </Button>
        </form>
        <p className="mt-4">
          <DevTag>Demo · códigos AD-2025-08-01 y AD-2025-11-02</DevTag>
        </p>
      </TabbedCard>

      <div ref={resultRef} tabIndex={-1} aria-live="polite" className="outline-none">
        {result.kind === "idle" && (
          <EmptyState
            icon={<Leaf aria-hidden className="size-10" strokeWidth={1.25} />}
            title="Todavía no consultaste ningún lote"
            description="El código está impreso en la etiqueta del envase, debajo del nombre del producto."
          />
        )}
        {result.kind === "loading" && <LoadingBlock label="Buscando el lote…" lines={5} />}
        {result.kind === "error" && (
          <Alert tone="error" title="No pudimos hacer la consulta">
            Probá de nuevo en unos minutos.
          </Alert>
        )}
        {result.kind === "invalid" && (
          <Alert tone="warning" title="No encontramos ese código">
            Revisá que el producto y el código coincidan con la etiqueta del envase. Si el problema sigue, escribinos.
          </Alert>
        )}
        {result.kind === "lot" && <LotCard lot={result.lot} onCertificate={() => setCertOpen(true)} />}
      </div>

      {result.kind === "lot" && (
        <Dialog open={certOpen} onClose={() => setCertOpen(false)} title="Certificado de análisis" description={`Lote ${result.lot.code}`} wide shape="pill">
          <CertificatePreview lot={result.lot} />
        </Dialog>
      )}
    </div>
  );
}
