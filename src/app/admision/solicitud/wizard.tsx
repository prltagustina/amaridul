"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, FileText, IdCard, Pencil, Stamp } from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { Alert, Card, DevTag } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { StepIndicator, type StepStatus } from "@/components/ui/steps";
import { categoryOptions, documents, membershipFee, privacySummary, provinces, reprocannOptions } from "@/demo/content";
import { STEP_IDS, type StepId } from "./steps";


const STEP_LABELS: Record<StepId, string> = {
  A: "Datos personales",
  B: "Contacto",
  C: "Solicitud asociativa",
  D: "Acreditación de identidad",
  E: "Estatuto y reglamentos",
  F: "Cuota social",
  G: "Declaraciones",
  H: "Protección de datos",
  I: "Confirmación",
};

type Data = {
  nombres: string;
  apellidos: string;
  dni: string;
  nacimiento: string;
  nacionalidad: string;
  domicilio: string;
  localidad: string;
  provincia: string;
  cp: string;
  email: string;
  telefono: string;
  emailNotificaciones: string;
  categoria: string;
  interes: string;
  obligaciones: boolean;
  pacienteAcompanamiento: boolean;
  pacienteReprocann: string;
  pacienteInformado: boolean;
  estatuto: boolean;
  cuota: boolean;
  veracidad: boolean;
  cambios: boolean;
  datos: boolean;
  novedades: boolean;
  confirmacion: boolean;
};

const EMPTY: Data = {
  nombres: "",
  apellidos: "",
  dni: "",
  nacimiento: "",
  nacionalidad: "",
  domicilio: "",
  localidad: "",
  provincia: "",
  cp: "",
  email: "persona.ficticia04@example.com",
  telefono: "",
  emailNotificaciones: "",
  categoria: "",
  interes: "",
  obligaciones: false,
  pacienteAcompanamiento: false,
  pacienteReprocann: "",
  pacienteInformado: false,
  estatuto: false,
  cuota: false,
  veracidad: false,
  cambios: false,
  datos: false,
  novedades: false,
  confirmacion: false,
};

// Fictitious values used when the demo opens directly on a later step.
const FILLED: Data = {
  ...EMPTY,
  nombres: "Persona",
  apellidos: "Ficticia 04",
  dni: "99000004",
  nacimiento: "1990-05-12",
  nacionalidad: "Argentina",
  domicilio: "Calle Ficticia 123",
  localidad: "Localidad Ficticia",
  provincia: "Santa Fe",
  cp: "0000",
  telefono: "+54 9 000 000-0004",
  categoria: "adherente",
  interes: "Participar de las actividades comunitarias.",
  obligaciones: true,
  estatuto: true,
  cuota: true,
  veracidad: true,
  cambios: true,
  datos: true,
};

type Errors = Partial<Record<keyof Data, string>>;

function validateStep(step: StepId, d: Data): Errors {
  const e: Errors = {};
  const req = (k: keyof Data, msg: string) => {
    if (typeof d[k] === "string" ? !(d[k] as string).trim() : !d[k]) e[k] = msg;
  };
  if (step === "A") {
    req("nombres", "Escribí tu nombre o nombres.");
    req("apellidos", "Escribí tu apellido o apellidos.");
    if (!/^\d{7,8}$/.test(d.dni.replace(/\D/g, ""))) e.dni = "El DNI tiene 7 u 8 números, sin puntos.";
    req("nacimiento", "Indicá tu fecha de nacimiento.");
    req("nacionalidad", "Indicá tu nacionalidad.");
    req("domicilio", "Escribí tu domicilio real.");
    req("localidad", "Escribí tu localidad.");
    req("provincia", "Elegí tu provincia.");
    req("cp", "Escribí el código postal.");
  }
  if (step === "B") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Revisá el email.";
    if (d.telefono.replace(/\D/g, "").length < 8) e.telefono = "Escribí un teléfono con código de área.";
    if (d.emailNotificaciones && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.emailNotificaciones)) e.emailNotificaciones = "Revisá el email.";
  }
  if (step === "C") {
    req("categoria", "Elegí una categoría.");
    req("obligaciones", "Necesitamos tu aceptación para continuar.");
    if (d.categoria === "paciente") {
      req("pacienteReprocann", "Elegí una opción.");
      req("pacienteInformado", "Necesitamos tu confirmación.");
    }
  }
  if (step === "E") req("estatuto", "Necesitamos tu aceptación para continuar.");
  if (step === "F") req("cuota", "Necesitamos tu confirmación para continuar.");
  if (step === "G") {
    req("veracidad", "Necesitamos esta declaración para continuar.");
    req("cambios", "Necesitamos este compromiso para continuar.");
  }
  if (step === "H") req("datos", "Necesitamos tu conformidad para gestionar la solicitud.");
  if (step === "I") req("confirmacion", "Confirmá para pasar al resumen.");
  return e;
}

type View = StepId | "resumen" | "enviada";

export default function AdmissionWizard({ initialStep, demoState }: { initialStep: View; demoState: "default" | "error" | "loading" }) {
  const startIndex = initialStep === "resumen" || initialStep === "enviada" ? STEP_IDS.length : STEP_IDS.indexOf(initialStep);
  const [data, setData] = useState<Data>(startIndex > 0 ? { ...FILLED, confirmacion: initialStep === "resumen" || initialStep === "enviada" } : EMPTY);
  const [view, setView] = useState<View>(initialStep);
  const [visited, setVisited] = useState<Set<StepId>>(new Set(STEP_IDS.slice(0, Math.max(1, startIndex + 1))));
  const [errors, setErrors] = useState<Errors>(demoState === "error" && initialStep !== "resumen" && initialStep !== "enviada" ? validateStep(initialStep as StepId, data) : {});
  const [saving, setSaving] = useState(demoState === "loading");
  const [saved, setSaved] = useState(false);
  const [docOpen, setDocOpen] = useState<string | null>(null);
  const [editingFromSummary, setEditingFromSummary] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => setData((s) => ({ ...s, [k]: v }));

  const steps = useMemo(
    () =>
      STEP_IDS.map((id) => {
        const valid = Object.keys(validateStep(id, data)).length === 0;
        const status: StepStatus = id === view ? "current" : visited.has(id) ? (valid ? "complete" : "incomplete") : "upcoming";
        return { id, label: `${id}. ${STEP_LABELS[id]}`, status };
      }),
    [data, view, visited],
  );

  function go(next: View) {
    setErrors({});
    setSaved(false);
    setView(next);
    if (next !== "resumen" && next !== "enviada") setVisited((v) => new Set(v).add(next));
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function saveAndContinue() {
    if (view === "resumen" || view === "enviada") return;
    const e = validateStep(view, data);
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.getElementById("step-errors")?.focus());
      return;
    }
    setSaving(true);
    // Demo only: the draft lives in memory and is lost on refresh.
    window.setTimeout(() => {
      setSaving(false);
      setSaved(true);
      const i = STEP_IDS.indexOf(view);
      if (editingFromSummary || i === STEP_IDS.length - 1) {
        setEditingFromSummary(false);
        go("resumen");
      } else go(STEP_IDS[i + 1]);
    }, 450);
  }

  function back() {
    if (view === "resumen") return go("I");
    if (view === "enviada") return;
    const i = STEP_IDS.indexOf(view);
    if (i > 0) go(STEP_IDS[i - 1]);
  }

  if (view === "enviada") {
    return (
      <Card className="space-y-6 py-10 text-center sm:py-12" role="status" aria-live="polite">
        <CircleCheck aria-hidden className="mx-auto size-12 text-forest" strokeWidth={1.25} />
        <div className="space-y-3">
          <h2 className="text-h1 text-forest">Recibimos tu solicitud formal</h2>
          <p className="text-eyebrow text-accent">Referencia ADM-2026-0003</p>
          <p className="mx-auto max-w-md text-body text-text-muted">
            La Comisión Directiva va a evaluar tu solicitud. Te vamos a avisar por email cuando haya una decisión.
          </p>
        </div>
        <DevTag>Demo · no se guardó ni envió nada</DevTag>
        <div>
          <LinkButton href="/qr" variant="secondary">
            Volver
          </LinkButton>
        </div>
      </Card>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="space-y-8">
      <div className="space-y-5">
        {view !== "resumen" && <StepIndicator steps={steps} onSelect={(id) => go(id as StepId)} hideCurrentLabel />}
        <h2 ref={headingRef} tabIndex={-1} className="flex items-center gap-3 text-2xl font-title text-forest outline-none">
          {view !== "resumen" && (
            <span aria-hidden className="flex size-10 shrink-0 items-center justify-center !rounded-[10px] bg-forest text-lg text-white">
              {view}
            </span>
          )}
          <span>
            {view === "resumen" ? "Revisá tu solicitud" : STEP_LABELS[view]}
            {view !== "resumen" && <span className="sr-only">, paso {view}</span>}
          </span>
        </h2>
      </div>

      {saved && (
        <p role="status" className="text-small text-success-fg">
          Guardado. <DevTag>Demo · en memoria</DevTag>
        </p>
      )}

      {errorCount > 0 && (
        <div id="step-errors" tabIndex={-1} className="outline-none">
          <Alert tone="error" title={`Falta completar ${errorCount === 1 ? "un dato" : `${errorCount} datos`} de este paso`} live>
            Revisá los campos marcados.
          </Alert>
        </div>
      )}

      {view === "A" && (
        <Card className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="nombres" label="Nombres" autoComplete="given-name" value={data.nombres} onChange={(e) => set("nombres", e.target.value)} error={errors.nombres} />
            <TextField id="apellidos" label="Apellidos" autoComplete="family-name" value={data.apellidos} onChange={(e) => set("apellidos", e.target.value)} error={errors.apellidos} />
            <TextField
              id="dni"
              label="DNI"
              inputMode="numeric"
              hint="Sin puntos. En esta demo usá un número ficticio (por ejemplo 99000004)."
              value={data.dni}
              onChange={(e) => set("dni", e.target.value)}
              error={errors.dni}
            />
            <TextField id="nacimiento" type="date" label="Fecha de nacimiento" value={data.nacimiento} onChange={(e) => set("nacimiento", e.target.value)} error={errors.nacimiento} />
            <TextField id="nacionalidad" label="Nacionalidad" value={data.nacionalidad} onChange={(e) => set("nacionalidad", e.target.value)} error={errors.nacionalidad} />
          </div>
          <TextField id="domicilio" label="Domicilio real" hint="Calle, número, piso y departamento." autoComplete="street-address" value={data.domicilio} onChange={(e) => set("domicilio", e.target.value)} error={errors.domicilio} />
          <div className="grid gap-5 sm:grid-cols-3">
            <TextField id="localidad" label="Localidad" autoComplete="address-level2" value={data.localidad} onChange={(e) => set("localidad", e.target.value)} error={errors.localidad} />
            <Select id="provincia" label="Provincia" placeholder="Elegí" options={provinces} value={data.provincia} onChange={(e) => set("provincia", e.target.value)} error={errors.provincia} />
            <TextField id="cp" label="Código postal" autoComplete="postal-code" value={data.cp} onChange={(e) => set("cp", e.target.value)} error={errors.cp} />
          </div>
        </Card>
      )}

      {view === "B" && (
        <Card className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField id="email" type="email" label="Email" hint="El de tu preadmisión. Podés cambiarlo." value={data.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
            <TextField id="telefono" type="tel" label="Teléfono" autoComplete="tel" value={data.telefono} onChange={(e) => set("telefono", e.target.value)} error={errors.telefono} />
          </div>
          <TextField
            id="emailNotificaciones"
            type="email"
            label="Email para notificaciones formales"
            optional
            hint="Si lo dejás vacío, usamos el email de arriba."
            value={data.emailNotificaciones}
            onChange={(e) => set("emailNotificaciones", e.target.value)}
            error={errors.emailNotificaciones}
          />
        </Card>
      )}

      {view === "C" && (
        <div className="space-y-6">
          <Card className="space-y-6">
            <RadioGroup
              name="categoria"
              legend="Categoría que solicitás"
              hint="La categoría definitiva la aprueba la Comisión Directiva. La categoría honoraria la designa la asociación."
              options={categoryOptions}
              value={data.categoria}
              onChange={(v) => set("categoria", v)}
              error={errors.categoria}
            />
            <Textarea id="interes" label="¿Por qué querés asociarte?" optional value={data.interes} onChange={(e) => set("interes", e.target.value)} />
            <Checkbox
              id="obligaciones"
              label="Acepto los derechos y obligaciones que corresponden a la categoría solicitada."
              checked={data.obligaciones}
              onChange={(e) => set("obligaciones", e.target.checked)}
              error={errors.obligaciones}
            />
          </Card>
          {data.categoria === "paciente" && (
            <Card className="space-y-5 border-accent/40">
              <div className="space-y-1">
                <p className="text-eyebrow text-accent">Categoría paciente</p>
                <h3 className="text-h2 text-forest">Información adicional</h3>
              </div>
              <Checkbox
                id="pacienteAcompanamiento"
                label="Quiero recibir acompañamiento para acceder a cannabis medicinal."
                checked={data.pacienteAcompanamiento}
                onChange={(e) => set("pacienteAcompanamiento", e.target.checked)}
              />
              <RadioGroup
                name="pacienteReprocann"
                legend="Estado de tu registro REPROCANN"
                options={reprocannOptions}
                value={data.pacienteReprocann}
                onChange={(v) => set("pacienteReprocann", v)}
                error={errors.pacienteReprocann}
                inline
              />
              <Checkbox
                id="pacienteInformado"
                label="Tomo conocimiento de que el acceso requiere indicación médica y seguimiento profesional."
                checked={data.pacienteInformado}
                onChange={(e) => set("pacienteInformado", e.target.checked)}
                error={errors.pacienteInformado}
              />
              <Alert tone="info">
                La conformidad, la declaración de exclusividad y la declaración jurada del beneficiario no se firman acá: se completan como documentos individuales en la etapa sanitaria.
              </Alert>
            </Card>
          )}
        </div>
      )}

      {view === "D" && (
        <Card variant="outline" className="space-y-4 border-dashed border-border-strong/60 py-10 text-center">
          <IdCard aria-hidden className="mx-auto size-10 text-accent" strokeWidth={1.25} />
          <p className="text-h3 text-foreground">Método de acreditación pendiente de definición institucional.</p>
          <p className="mx-auto max-w-md text-small text-text-muted">
            Acá vas a ver cómo acreditar tu identidad cuando la asociación lo defina. Por ahora podés continuar.
          </p>
          <DevTag>Sin carga de archivos</DevTag>
        </Card>
      )}

      {view === "E" && (
        <Card className="space-y-5">
          <p className="text-body text-text-muted">Leé los documentos antes de aceptarlos.</p>
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 !rounded-control border border-border bg-background/60 px-4 py-3">
                <span className="flex items-center gap-3">
                  <FileText aria-hidden className="size-5 shrink-0 text-accent" strokeWidth={1.5} />
                  <span>
                    <span className="block text-base text-foreground">{doc.title}</span>
                    <span className="block text-small text-text-muted">{doc.detail}</span>
                  </span>
                </span>
                <Button variant="ghost" onClick={() => setDocOpen(doc.title)}>
                  Ver
                </Button>
              </li>
            ))}
          </ul>
          <Checkbox
            id="estatuto"
            label="Leí y acepto el estatuto y los reglamentos de Amarí Dul."
            checked={data.estatuto}
            onChange={(e) => set("estatuto", e.target.checked)}
            error={errors.estatuto}
          />
        </Card>
      )}

      {view === "F" && (
        <Card className="space-y-5">
          <div className="flex items-center gap-2">
            <h3 className="text-h3 text-foreground">Valores de referencia</h3>
            <DevTag>Valores pendientes</DevTag>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            {[
              ["Valor", membershipFee.amount],
              ["Periodicidad", membershipFee.frequency],
              ["Medio de pago", membershipFee.paymentMethod],
            ].map(([k, v]) => (
              <div key={k} className="!rounded-control bg-background/70 px-4 py-3">
                <dt className="text-eyebrow text-text-muted">{k}</dt>
                <dd className="mt-1 text-base text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-small text-text-muted">El pago de la cuota no implica la admisión: la decide la Comisión Directiva.</p>
          <Checkbox id="cuota" label="Tomo conocimiento del valor de la cuota social y su forma de pago." checked={data.cuota} onChange={(e) => set("cuota", e.target.checked)} error={errors.cuota} />
        </Card>
      )}

      {view === "G" && (
        <Card className="space-y-5">
          <Checkbox id="veracidad" label="Declaro bajo juramento que los datos de esta solicitud son verdaderos." checked={data.veracidad} onChange={(e) => set("veracidad", e.target.checked)} error={errors.veracidad} />
          <Checkbox id="cambios" label="Me comprometo a informar cualquier cambio relevante en mis datos." checked={data.cambios} onChange={(e) => set("cambios", e.target.checked)} error={errors.cambios} />
        </Card>
      )}

      {view === "H" && (
        <Card className="space-y-5">
          <p className="text-small text-text-muted">
            {privacySummary} <DevTag>Aviso pendiente</DevTag>
          </p>
          <Checkbox
            id="datos"
            label="Acepto el tratamiento de mis datos para gestionar mi admisión y mi vínculo con la asociación."
            checked={data.datos}
            onChange={(e) => set("datos", e.target.checked)}
            error={errors.datos}
          />
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-label text-foreground">Autorizaciones opcionales</p>
            <Checkbox id="novedades" label="Quiero recibir novedades de actividades y proyectos de la asociación." description="Podés cambiarlo cuando quieras." checked={data.novedades} onChange={(e) => set("novedades", e.target.checked)} />
          </div>
        </Card>
      )}

      {view === "I" && (
        <div className="space-y-6">
          <Card className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-eyebrow text-text-muted">Solicitud</dt>
                <dd className="mt-1 text-base">ADM-2026-0003</dd>
              </div>
              <div>
                <dt className="text-eyebrow text-text-muted">Fecha</dt>
                <dd className="mt-1 text-base">{new Date().toLocaleDateString("es-AR")}</dd>
              </div>
            </dl>
          </Card>
          <Card variant="outline" className="space-y-4 border-dashed border-accent/60">
            <div className="flex flex-wrap items-center gap-2">
              <Stamp aria-hidden className="size-5 text-accent" strokeWidth={1.5} />
              <h3 className="text-h3 text-foreground">Aceptación</h3>
              <DevTag>Modalidad pendiente de validación</DevTag>
            </div>
            <p className="text-small text-text-muted">Ejemplo visual: el mecanismo formal de aceptación o firma todavía no está definido.</p>
            <Checkbox
              id="confirmacion"
              label="Confirmo que revisé mis datos y presento esta solicitud formal de admisión."
              checked={data.confirmacion}
              onChange={(e) => set("confirmacion", e.target.checked)}
              error={errors.confirmacion}
            />
          </Card>
        </div>
      )}

      {view === "resumen" && (
        <div className="space-y-4">
          <Alert tone="info">Revisá cada sección. La solicitud se envía recién cuando confirmes abajo.</Alert>
          <Summary
            data={data}
            onEdit={(id) => {
              setEditingFromSummary(true);
              go(id);
            }}
          />
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        {view !== "A" ? (
          <Button variant="ghost" onClick={back}>
            <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} /> Anterior
          </Button>
        ) : (
          <span />
        )}
        {view === "resumen" ? (
          <Button
            variant="join"
            size="lg"
            editorial
            loading={saving}
            loadingLabel="Enviando…"
            onClick={() => {
              setSaving(true);
              window.setTimeout(() => go("enviada"), 800);
            }}
          >
            Enviar solicitud <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
          </Button>
        ) : (
          <Button size="lg" onClick={saveAndContinue} loading={saving} loadingLabel="Guardando…">
            {editingFromSummary ? "Guardar y volver al resumen" : "Guardar y continuar"} <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <Dialog open={docOpen !== null} onClose={() => setDocOpen(null)} title={docOpen ?? ""} description="Documento pendiente de carga" shape="pill">
        <p className="text-body text-text-muted">El documento aprobado se va a mostrar acá.</p>
        <DevTag>Documento pendiente</DevTag>
      </Dialog>
    </div>
  );
}

function Summary({ data, onEdit }: { data: Data; onEdit: (id: StepId) => void }) {
  const category = categoryOptions.find((c) => c.value === data.categoria)?.label ?? "—";
  const yes = (b: boolean) => (b ? "Aceptado" : "Pendiente");
  const rows: [StepId, ReactNode][] = [
    ["A", `${data.nombres} ${data.apellidos} · DNI ${data.dni.replace(/\D/g, "").replace(/(\d+)(\d{3})(\d{3})$/, "$1.$2.$3")} · ${data.localidad}, ${data.provincia}`],
    ["B", `${data.email} · ${data.telefono}`],
    ["C", `Categoría ${category} · obligaciones: ${yes(data.obligaciones)}`],
    ["D", "Pendiente de definición institucional"],
    ["E", yes(data.estatuto)],
    ["F", data.cuota ? "Informada" : "Pendiente"],
    ["G", data.veracidad && data.cambios ? "Declaradas" : "Pendiente"],
    ["H", `${yes(data.datos)}${data.novedades ? " · acepta novedades" : ""}`],
    ["I", data.confirmacion ? "Confirmada" : "Pendiente"],
  ];
  return (
    <ul className="space-y-3">
      {rows.map(([id, value]) => (
        <li key={id}>
          <Card className="flex items-start justify-between gap-4" padded={false}>
            <div className="min-w-0 flex-1 space-y-1 px-5 py-4">
              <p className="text-eyebrow text-accent">
                {id}. {STEP_LABELS[id]}
              </p>
              <p className="text-base break-words text-foreground">{value}</p>
            </div>
            <button
              type="button"
              onClick={() => onEdit(id)}
              className="m-2 inline-flex min-h-10 shrink-0 items-center gap-1.5 !rounded-control px-3 text-small !text-forest hover:bg-forest-soft"
            >
              <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
              Editar<span className="sr-only"> {STEP_LABELS[id]}</span>
            </button>
          </Card>
        </li>
      ))}
    </ul>
  );
}
