import ReadMore from "@/components/ReadMore";
import { EditorialSection } from "@/components/brand/editorial-section";

const BLOCKS = [
  {
    id: "acompanamiento",
    number: "01",
    title: "Acompañamiento",
    intro:
      "Amarí Dul es una asociación civil que trabaja para garantizar a sus asociados un vínculo legal, seguro y responsable con el cannabis medicinal.",
    more: [
      "Su propósito es acompañar cada proceso desde una mirada profesional, integrando seguimiento médico, trazabilidad y criterios de calidad, dentro de una comunidad basada en la confianza, el cuidado y el compromiso colectivo.",
    ],
  },
  {
    id: "comunidad",
    number: "02",
    title: "Comunidad",
    intro:
      "La asociación brinda a sus miembros acceso a la dispensa de material vegetal y derivados elaborados bajo criterios de calidad, control y trazabilidad, junto con asesoramiento y acompañamiento de profesionales de la salud.",
    more: [
      "Además, promueve la participación activa en jornadas, espacios de formación, proyectos de investigación y actividades comunitarias orientadas al intercambio de conocimientos y experiencias.",
      "También impulsa instancias de educación sobre uso responsable, seguimiento de tratamientos y construcción colectiva de saberes en torno al cannabis medicinal. Desde este enfoque, Amarí Dul busca consolidar una comunidad informada, participativa y comprometida, fortaleciendo prácticas responsables y promoviendo una relación con el cannabis basada en la evidencia, la transparencia y el acompañamiento profesional.",
    ],
  },
];

export default function About() {
  return (
    <EditorialSection id="sobre" eyebrow="Quiénes somos" title="Sobre Amarí Dul">
      {BLOCKS.map((block) => (
        <article key={block.id} aria-labelledby={`${block.id}-title`} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 border-t border-mist-line py-8 first:border-t-0 first:pt-0 sm:gap-x-8 sm:py-10">
          <p aria-hidden className="font-display text-[clamp(2.75rem,2.2rem+2.4vw,4rem)] leading-[0.9] font-medium text-arena-500">
            {block.number}
          </p>
          <div>
            <h3 id={`${block.id}-title`} className="font-title text-[clamp(1.25rem,1.1rem+0.6vw,1.5rem)] text-foreground">
              {block.title}
            </h3>
            <div className="mt-3 text-body text-text-muted">
              <p>{block.intro}</p>
              <ReadMore id={`${block.id}-more`}>
                {block.more.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                ))}
              </ReadMore>
            </div>
          </div>
        </article>
      ))}
    </EditorialSection>
  );
}
