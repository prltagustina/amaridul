import type { ReactNode } from "react";
import { Leaf } from "lucide-react";
import { CircleLogo } from "@/components/brand/circle-logo";
import { CannabisLeaf, CannabisSprig, CornerLeaves, LeafMark } from "@/components/brand/botanicals";
import { PhotoPlaceholder } from "@/components/brand/placeholders";
import { Button, LinkButton, TextLink } from "@/components/ui/button";
import { Alert, Card, DevTag, EmptyState, LoadingBlock, SectionHeader, StatusBadge, type Tone } from "@/components/ui/display";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { InteractiveSamples } from "./interactive";

const COLORS: { name: string; token: string; value: string; note?: string }[] = [
  { name: "background", token: "bg-background", value: "#F2EBDD", note: "Crema base" },
  { name: "surface", token: "bg-surface", value: "#FBF7EF", note: "Cards" },
  { name: "surface-sunken", token: "bg-surface-sunken", value: "#EAE2D2" },
  { name: "foreground", token: "bg-foreground", value: "#1A1A18", note: "Texto" },
  { name: "text-muted", token: "bg-text-muted", value: "#6B6A68" },
  { name: "brand", token: "bg-brand", value: "#3F6043", note: "Verde principal" },
  { name: "brand-soft", token: "bg-brand-soft", value: "#DCE5D6" },
  { name: "accent", token: "bg-accent", value: "#7B5E8E", note: "Violeta, nunca dominante" },
  { name: "accent-soft", token: "bg-accent-soft", value: "#C9B8D3", note: "Solo decorativo" },
  { name: "border", token: "bg-border", value: "#D5CFBF" },
  { name: "border-strong", token: "bg-border-strong", value: "#958F7D", note: "Bordes de controles (3:1)" },
];

const TONES: Tone[] = ["neutral", "brand", "success", "warning", "error", "info"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-border pt-10">
      <h2 className="text-h2 text-brand">{title}</h2>
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
            <p className="text-display text-brand">Display · Cormorant 500</p>
            <p className="text-h1 text-brand">H1 · Construyendo comunidad</p>
            <p className="text-h2 text-brand">H2 · Preguntas frecuentes</p>
            <p className="text-h3">H3 · Jost 500 para títulos funcionales</p>
            <p className="text-lead">Lead · Jost 300 para introducciones.</p>
            <p className="text-body">Body · Jost 300. El texto corrido usa una medida cómoda y buen interlineado.</p>
            <p className="text-small text-text-muted">Small · ayudas y metadatos.</p>
            <p className="text-label">Label · etiquetas de formulario</p>
            <p className="text-eyebrow text-accent">Eyebrow · violeta</p>
            <p className="text-cta text-brand">CTA editorial · Sumate a la comunidad</p>
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

        <Section title="Superficies">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>Card surface · radio 16px</Card>
            <Card variant="sunken">Card sunken</Card>
            <Card variant="outline">Card outline</Card>
          </div>
        </Section>

        <Section title="Marca y placeholders">
          <div className="grid items-center gap-6 md:grid-cols-3">
            <div className="flex justify-center !rounded-card bg-brand p-8">
              <CircleLogo className="w-56" />
            </div>
            <PhotoPlaceholder className="aspect-[4/3] !rounded-card" />
            <div className="flex items-end justify-center gap-4 text-brand">
              <CannabisSprig className="h-64 w-auto" />
            </div>
          </div>
          <div className="grid items-end gap-6 sm:grid-cols-3">
            <CannabisLeaf className="mx-auto w-48 text-brand" />
            <CornerLeaves className="mx-auto w-48 text-brand/80" />
            <div className="flex items-center justify-center gap-4 text-brand">
              <LeafMark className="w-10" />
              <LeafMark className="w-6 text-accent" />
            </div>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-small text-text-muted">
            Las marcas de desarrollo se ven solo en local: <DevTag>Pendiente</DevTag>
          </p>
        </Section>
      </div>
    </main>
  );
}
