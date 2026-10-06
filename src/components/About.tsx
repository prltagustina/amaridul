import ReadMore from "@/components/ReadMore";

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
    <section aria-labelledby="sobre-amari-dul" className="border-t border-border pb-12 sm:pb-20 lg:pb-24">
      <header className="border-b border-border page-gutter">
        <div className="content-column pt-10 pb-9 sm:pt-14 sm:pb-13 lg:pt-16 lg:pb-15">
          <h2 id="sobre-amari-dul" className="font-medium text-[#3f6043]" style={{fontSize: "clamp(1.75rem, 1.25rem + 2vw, 2.5rem)", lineHeight: 1.2}}>
            Sobre Amarí Dul
          </h2>
        </div>
      </header>

      <div className="page-gutter">
        <div className="content-column pt-8 sm:pt-10 space-y-10 sm:space-y-14">
          {BLOCKS.map((block, i) => (
            <article key={block.id} aria-labelledby={`${block.id}-title`} className={i === 0 ? undefined : "border-t border-border/50 pt-8 sm:pt-10"}>
              <p className="text-sm tracking-[0.2em] text-text-muted">{block.number}</p>
              <h3 id={`${block.id}-title`} className="mt-2 font-medium text-[#3f6043]" style={{fontSize: "clamp(1.125rem, 3.5vw, 1.5rem)"}}>
                {block.title}
              </h3>
              <div className="mt-4 max-w-[36rem] text-body text-text-muted">
                <p>{block.intro}</p>
                <ReadMore id={`${block.id}-more`}>
                  {block.more.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </ReadMore>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
