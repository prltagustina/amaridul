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

const COLORS: { name: string; token: string; value: string; note?: string }[] = [
  { name: "forest · bosque", token: "bg-forest", value: "#2B4A33", note: "Principal: títulos, botones, bandas" },
  { name: "sage · salvia", token: "bg-sage", value: "#3F6043", note: "Verde del logo" },
  { name: "accent · hoja", token: "bg-accent", value: "#4D7045", note: "Antetítulos y CTA Sumate" },
  { name: "forest-soft", token: "bg-forest-soft", value: "#E2EBDD", note: "Selección y hover" },
  { name: "mist · rocío", token: "bg-mist", value: "#F1F4EE", note: "Superficies técnicas" },
  { name: "lilac · lila", token: "bg-lilac", value: "#CDB6E3", note: "Toque Dambar: variedades violáceas" },
  { name: "amber · ámbar", token: "bg-amber", value: "#F0B678", note: "Toque Dambar: pistilos y resina" },
  { name: "background", token: "bg-background", value: "#F2EBDD", note: "Crema base" },
  { name: "foreground", token: "bg-foreground", value: "#1A1A18", note: "Texto" },
  { name: "text-muted", token: "bg-text-muted", value: "#6B6A68" },
  { name: "border-strong", token: "bg-border-strong", value: "#958F7D", note: "Bordes de controles (3:1)" },
  { name: "info", token: "bg-info-fg", value: "#6A4E7D", note: "Avisos informativos (lila)" },
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

        <Section title="Color">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {COLORS.map((c) => (
              <li key={c.name} className="overflow-hidden !rounded-control border border-border bg-surface">
                <span aria-hidden className={`block h-16 ${c.token}`} />
                <span className="block px-3 py-2">
                  <span className="block text-label">{c.name}</span>
                  <span className="block font-mono text-xs text-text-muted">{c.value}</span>
                  {c.note && <span className="block text-xs text-text-muted">{c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
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
