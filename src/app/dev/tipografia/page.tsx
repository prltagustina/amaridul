import type { CSSProperties } from "react";
import { Cormorant_Garamond, Fraunces, Instrument_Serif, Inter, Inter_Tight, Jost, Manrope, Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import { ArrowRight, UserRound } from "lucide-react";

// Type exploration only (dev). Each option is loaded here and nowhere else.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["500"], display: "swap" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "500"], display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["600", "700"], display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], weight: ["400", "600"], display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: ["400"], display: "swap" });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

type Option = {
  id: string;
  name: string;
  note: string;
  display: string; // brand phrases and page titles
  heading: string; // functional headings (cards, data)
  body: string;
  displayStyle?: CSSProperties;
  headingStyle?: CSSProperties;
  bodyWeight: number;
};

const OPTIONS: Option[] = [
  { id: "actual", name: "1 · Actual", note: "Cormorant Garamond + Jost. Muy editorial y liviana; en datos y textos chicos pierde firmeza.", display: cormorant.style.fontFamily, heading: jost.style.fontFamily, body: jost.style.fontFamily, headingStyle: { fontWeight: 500 }, bodyWeight: 300 },
  { id: "profesional", name: "2 · Profesional", note: "Inter Tight + Inter, el lenguaje de Dambar. La serif queda solo para frases de marca. La más clara para datos y formularios.", display: cormorant.style.fontFamily, heading: interTight.style.fontFamily, body: inter.style.fontFamily, headingStyle: { fontWeight: 700, letterSpacing: "-0.02em" }, bodyWeight: 400 },
  { id: "editorial", name: "3 · Editorial cálida", note: "Fraunces + Inter. Serif suave y contemporánea con cuerpo; sans neutra y precisa.", display: fraunces.style.fontFamily, heading: fraunces.style.fontFamily, body: inter.style.fontFamily, displayStyle: { fontWeight: 400, letterSpacing: "-0.01em" }, headingStyle: { fontWeight: 600, letterSpacing: "-0.01em" }, bodyWeight: 400 },
  { id: "clasica", name: "4 · Clásica legible", note: "Newsreader + Manrope. Serif de lectura sobria con una sans geométrica amable.", display: newsreader.style.fontFamily, heading: manrope.style.fontFamily, body: manrope.style.fontFamily, displayStyle: { fontWeight: 500 }, headingStyle: { fontWeight: 700, letterSpacing: "-0.01em" }, bodyWeight: 400 },
  { id: "contemporanea", name: "5 · Contemporánea", note: "Instrument Serif + Plus Jakarta Sans. Titulares finos y elegantes con una sans moderna y redonda.", display: instrument.style.fontFamily, heading: jakarta.style.fontFamily, body: jakarta.style.fontFamily, displayStyle: { fontWeight: 400 }, headingStyle: { fontWeight: 700, letterSpacing: "-0.015em" }, bodyWeight: 400 },
];

function Sample({ o }: { o: Option }) {
  const body: CSSProperties = { fontFamily: o.body, fontWeight: o.bodyWeight };
  const head: CSSProperties = { fontFamily: o.heading, ...o.headingStyle };
  const disp: CSSProperties = { fontFamily: o.display, ...o.displayStyle };
  return (
    <section id={o.id} aria-labelledby={`${o.id}-t`} className="scroll-mt-6 space-y-4" style={body}>
      <div className="space-y-1">
        <h2 id={`${o.id}-t`} className="text-lg font-medium text-foreground" style={head}>
          {o.name}
        </h2>
        <p className="max-w-2xl text-sm text-text-muted">{o.note}</p>
      </div>
      <div className="overflow-hidden !rounded-card border border-mist-line bg-white">
        <div className="bg-[linear-gradient(118deg,var(--hoja-900),var(--hoja-800)_50%,var(--hoja-700))] px-5 pt-6 pb-0 text-white sm:px-8">
          <p className="text-[11px] tracking-[0.2em] uppercase opacity-80" style={{ ...body, fontWeight: 500 }}>
            Mi espacio
          </p>
          <p className="mt-1 text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-[1.08]" style={disp}>
            Hola, Persona
          </p>
          <p className="mt-1 text-white/85">Socio AD-0004 · categoría Paciente</p>
          <span className="mt-5 inline-flex !rounded-t-[10px] border-t-4 border-hoja-700 bg-background px-3.5 pt-1.5 pb-1 text-sm text-forest" style={{ ...head, fontSize: "0.875rem" }}>
            Resumen
          </span>
        </div>
        <div className="grid gap-6 bg-background p-5 sm:p-8 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4 !rounded-card border border-mist-line bg-white p-5">
            <p className="text-xl text-forest" style={head}>
              Tu membresía
            </p>
            <dl className="grid grid-cols-2 gap-4">
              {[
                ["Número", "AD-0004"],
                ["Categoría", "Paciente"],
                ["Socio desde", "12/09/2026"],
                ["Lote", "AD-2025-08-01"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs tracking-[0.12em] text-text-muted uppercase" style={{ ...body, fontWeight: 500 }}>
                    {k}
                  </dt>
                  <dd className="mt-0.5 text-foreground tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[0.9375rem] leading-relaxed text-text-muted">Con el código del envase ves el lote, su composición y el análisis de laboratorio.</p>
          </div>
          <div className="flex flex-col justify-between gap-5">
            <p className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight text-forest" style={disp}>
              Construyendo comunidad para el acceso seguro
            </p>
            <div className="flex items-center gap-3 !rounded-card bg-[linear-gradient(118deg,var(--lila-900),var(--lila-700))] px-5 py-4 text-white">
              <span className="text-3xl tabular-nums" style={head}>
                1 gota = 1 mg
              </span>
              <span className="text-xs opacity-80">de cannabinoides totales</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <span className="inline-flex min-h-12 items-center justify-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--hoja-800),var(--hoja-700))] px-5 text-white" style={{ ...head, fontSize: "1.0625rem" }}>
                <UserRound aria-hidden className="size-5" strokeWidth={1.5} /> Acceso socios
              </span>
              <span className="inline-flex min-h-12 items-center justify-center gap-2 !rounded-full bg-[linear-gradient(135deg,var(--lila-800),var(--lila-700))] px-5 text-white" style={{ ...head, fontSize: "1.0625rem" }}>
                Sumate <ArrowRight aria-hidden className="size-5" strokeWidth={1.5} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function TipografiaPage() {
  return (
    <main className="page-gutter pt-10 pb-24">
      <div className="admin-column space-y-12">
        <header className="space-y-3">
          <p className="text-eyebrow text-accent">Exploración</p>
          <h1 className="text-h1 text-forest">Tipografías</h1>
          <p className="max-w-2xl text-body text-text-muted">La misma muestra con cinco combinaciones. El logotipo no cambia: es una imagen.</p>
          <nav aria-label="Opciones" className="flex flex-wrap gap-2 pt-1">
            {OPTIONS.map((o) => (
              <a key={o.id} href={`#${o.id}`} className="!rounded-full border border-mist-line bg-white px-3.5 py-1.5 text-small !text-forest hover:bg-hoja-50">
                {o.name}
              </a>
            ))}
          </nav>
        </header>
        {OPTIONS.map((o) => (
          <Sample key={o.id} o={o} />
        ))}
      </div>
    </main>
  );
}
