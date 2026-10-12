import type { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { CircleLogo } from "@/components/brand/circle-logo";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { Button, LinkButton, TextLink } from "@/components/ui/button";
import { Alert, Card, DevTag, EmptyState, LoadingBlock, SectionHeader, StatusBadge, type Tone } from "@/components/ui/display";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { CheckList, Chip, FolderTabs, KeyFact, RatioBar, RuleList, SectionTab, StepCards, TechBand, VarietyBadge } from "@/components/ui/technical";
import { FolderSwitcher } from "@/components/ui/folder-tabs";
import { InteractiveSamples } from "./interactive";

const SCALES: { name: string; token: string; role: string; steps: [number, string][] }[] = [
  { name: "Hoja", token: "hoja", role: "Identidad y comunidad: asociación, admisión, acceso. 700 es el verde del logo.", steps: [[50, "#f3f9f2"], [100, "#e6f3e6"], [200, "#cfe5ce"], [300, "#b0d2b0"], [400, "#8cb88d"], [500, "#6a9a6b"], [600, "#517f53"], [700, "#3f6640"], [800, "#2c4b2d"], [900, "#1d341e"]] },
  { name: "Lila", token: "lila", role: "Trazabilidad: producto, lote, composición y laboratorio.", steps: [[50, "#f8f5fc"], [100, "#f1ebf9"], [200, "#e3d8f2"], [300, "#cfbfe4"], [400, "#b5a0cf"], [500, "#9780b3"], [600, "#7c6695"], [700, "#64517a"], [800, "#493b5a"], [900, "#332840"]] },
  { name: "Ámbar", token: "ambar", role: "Trámites y salud: documentación, dispensas, avisos.", steps: [[50, "#fef5ee"], [100, "#fcebdd"], [200, "#f7d7bd"], [300, "#ecbd95"], [400, "#d89d68"], [500, "#bb7c40"], [600, "#9d6226"], [700, "#804d18"], [800, "#5f370d"], [900, "#442606"]] },
  { name: "Arena", token: "arena", role: "Neutros cálidos: bordes, superficies técnicas, texto secundario.", steps: [[50, "#f8f7f4"], [100, "#f0eeea"], [200, "#e1ded5"], [300, "#cdc7bb"], [400, "#b1aa9b"], [500, "#938b7b"], [600, "#787161"], [700, "#615a4d"], [800, "#474238"], [900, "#312d26"]] },
];

const ROLES: [string, string][] = [
  ["Texto y títulos", "700–900"],
  ["Rellenos y fondos suaves", "50–300"],
  ["Degradés de bandas y botones", "900 → 800 → 700"],
  ["Mismo paso en distintas escalas", "misma luminosidad: combinan entre sí"],
];

const TONES: Tone[] = ["neutral", "brand", "success", "warning", "error", "info"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-border pt-10">
      <h2 className="text-h2 text-forest">{title}</h2>
      {children}
    </section>
  );
}

export default function EstiloPage() {
  return (
    <main className="page-gutter pt-10 pb-24">
      <div className="admin-column space-y-10">
        <SectionHeader eyebrow="Sistema visual" title="Guía de estilo" description="Tokens, tipografía y componentes de la fase UI. Cormorant Garamond 500 para títulos y CTAs editoriales; Jost para la interfaz." />

        <Section title="Sistema de color">
          <p className="max-w-2xl text-body text-text-muted">
            Cuatro escalas construidas en OKLCH con la misma luminosidad en cada paso. La estructura viene de Dambar (bandas en degradé, fichas, bloques de datos); los colores son propios de Amarí Dul.
          </p>
          <div className="space-y-6">
            {SCALES.map((sc) => (
              <div key={sc.token} className="space-y-2">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="text-lg font-medium text-foreground">{sc.name}</h3>
                  <p className="text-small text-text-muted">{sc.role}</p>
                </div>
                <ul className="grid grid-cols-5 overflow-hidden !rounded-card border border-mist-line sm:grid-cols-10">
                  {sc.steps.map(([step, hex]) => (
                    <li key={step} className="flex min-h-20 flex-col justify-end p-2 text-[10px] leading-tight" style={{ background: hex, color: step >= 600 ? "#fff" : "#1a1a18" }}>
                      <span className="font-medium">{step}</span>
                      <span className="font-mono opacity-80">{hex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {ROLES.map(([k, v]) => (
              <div key={k} className="!rounded-control border border-mist-line bg-white px-4 py-3">
                <dt className="text-small text-text-muted">{k}</dt>
                <dd className="font-medium text-forest">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Tipografía">
          <div className="space-y-4">
            <p className="text-display text-forest">Display · Cormorant 500</p>
            <p className="text-h1 text-forest">H1 · Construyendo comunidad</p>
            <p className="text-h2 text-forest">H2 · Preguntas frecuentes</p>
            <p className="text-h3">H3 · Jost 500 para títulos funcionales</p>
            <p className="text-lead">Lead · Jost 300 para introducciones.</p>
            <p className="text-body">Body · Jost 300. El texto corrido usa una medida cómoda y buen interlineado.</p>
            <p className="text-small text-text-muted">Small · ayudas y metadatos.</p>
            <p className="text-label">Label · etiquetas de formulario</p>
            <p className="text-eyebrow text-accent">Eyebrow · violeta</p>
            <p className="text-cta text-forest">CTA editorial · Sumate a la comunidad</p>
          </div>
        </Section>

        <Section title="Botones">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primario</Button>
              <Button variant="accent">Acento</Button>
              <Button variant="secondary">Secundario</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Peligro</Button>
              <Button disabled>Deshabilitado</Button>
              <Button loading loadingLabel="Cargando…">Cargando</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LinkButton href="/sumate" editorial size="lg" variant="accent">
                Sumate a la comunidad
              </LinkButton>
              <LinkButton href="/" editorial size="lg">
                Conocé más
              </LinkButton>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button shape="admin">Admin primario</Button>
              <Button shape="admin" variant="secondary">
                Admin secundario
              </Button>
              <Button shape="admin" variant="danger">
                Admin peligro
              </Button>
              <TextLink href="/dev/recorrido">Link de texto</TextLink>
            </div>
          </div>
        </Section>

        <Section title="Formularios">
          <div className="grid gap-5 md:grid-cols-2">
            <TextField id="s-text" label="Campo de texto" hint="Texto de ayuda." />
            <TextField id="s-error" label="Campo con error" defaultValue="dato inválido" error="Revisá este dato." />
            <TextField id="s-optional" label="Campo opcional" optional />
            <TextField id="s-disabled" label="Deshabilitado" disabled defaultValue="No editable" />
            <Select id="s-select" label="Select" placeholder="Elegí una opción" options={["Opción 1", "Opción 2"]} />
            <Textarea id="s-textarea" label="Textarea" rows={3} />
          </div>
          <InteractiveSamples />
        </Section>

        <Section title="Estados y feedback">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <StatusBadge key={t} tone={t}>
                {t}
              </StatusBadge>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Alert tone="info" title="Información">Mensaje informativo.</Alert>
            <Alert tone="success" title="Listo">Acción completada.</Alert>
            <Alert tone="warning" title="Atención">Algo para revisar.</Alert>
            <Alert tone="error" title="Error">No pudimos completar la acción.</Alert>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <EmptyState icon={<Leaf aria-hidden className="size-10" strokeWidth={1.25} />} title="Estado vacío" description="Descripción breve de qué falta y qué hacer." />
            </Card>
            <Card>
              <LoadingBlock lines={4} />
            </Card>
          </div>
        </Section>

        <Section title="Componentes de información · a la manera de Dambar">
          <p className="max-w-2xl text-body text-text-muted">
            Pestañas de carpeta, bandas, bloques de dato clave, reglas, pasos numerados y barras de proporción, con la paleta propia de Amarí Dul: los verdes de la planta, con lila y ámbar como toques. Se usan en toda la web.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <FolderTabs />
              <div className="overflow-hidden !rounded-card border border-mist-line bg-white">
                <TechBand className="px-5 pt-5">
                  <p className="text-xl font-medium tracking-tight">Banda técnica</p>
                  <div className="mt-4 flex">
                    <SectionTab>1. Pestaña de sección</SectionTab>
                  </div>
                </TechBand>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <VarietyBadge>CBD dominante</VarietyBadge>
                    <RatioBar thc={6.5} cbd={13.5} label="Proporción" className="w-full max-w-[13rem]" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Chip>THC ~6,5 mg/ml</Chip>
                    <Chip>CBD ~13,5 mg/ml</Chip>
                  </div>
                  <CheckList items={["Ítem verificado", "Otro ítem"]} />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <KeyFact value="1 gota = 1 mg" caption="de cannabinoides totales" rows={[["Concentración", "20 mg/ml"], ["Gotero estándar", "20 gotas/ml"]]} />
              <RuleList items={[<><strong>Regla práctica:</strong> bloque oscuro para indicaciones clave.</>, "Una idea por fila."]} />
            </div>
          </div>
          <FolderSwitcher
            label="Fichas de ejemplo"
            tabs={[
              { id: "comunidad", label: "Comunidad", tone: "green", content: <p className="text-body">Verde: asociación, admisión, acceso y socios.</p> },
              { id: "trazabilidad", label: "Trazabilidad", tone: "lilac", content: <p className="text-body">Lila: producto, lote, composición y laboratorio.</p> },
              { id: "tramites", label: "Trámites", tone: "amber", content: <p className="text-body">Ámbar: trámites, documentación, salud y dispensas.</p> },
            ]}
          />
          <StepCards
            steps={[
              { title: "Fase de inicio", meta: "Duración 2 semanas", value: "Paso 1", detail: "Texto de ejemplo." },
              { title: "Evaluación", meta: "Día 14", value: "Paso 2", detail: "Texto de ejemplo." },
              { title: "Mantenimiento", meta: "Cuando se requiere", value: "Paso 3", detail: "Texto de ejemplo." },
            ]}
          />
        </Section>

        <Section title="Superficies">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>Card surface · radio 16px</Card>
            <Card variant="sunken">Card sunken</Card>
            <Card variant="outline">Card outline</Card>
          </div>
        </Section>

        <Section title="Marca y placeholders">
          <div className="grid items-center gap-6 md:grid-cols-2">
            <div className="flex justify-center !rounded-card bg-forest p-8">
              <CircleLogo className="w-56" />
            </div>
            <PhotoPlaceholder className="aspect-[4/3] !rounded-card" />
          </div>
          <p className="flex flex-wrap items-center gap-2 text-small text-text-muted">
            Las marcas de desarrollo se ven solo en local: <DevTag>Pendiente</DevTag>
          </p>
        </Section>
      </div>
    </main>
  );
}
