import { CONTACT } from "@/lib/constants";
import { EditorialSection } from "@/components/brand/editorial-section";
import { DevTag } from "@/components/ui/display";

const ITEMS = [
  ["Instagram", CONTACT.instagram],
  ["WhatsApp", CONTACT.whatsapp],
  ["Email", CONTACT.email],
] as const;

/** Confirmed channels only; pending ones are shown locally (`demo`) as a guide. */
export default function Contact({ demo = false }: { demo?: boolean }) {
  const items = ITEMS.filter(([, value]) => value || demo);
  return (
    <EditorialSection id="contacto" eyebrow="Escribinos" title="Contacto" className="bg-arena-100 sm:py-24">
      <dl className="divide-y divide-arena-300 border-y border-arena-300">
        {items.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5">
            <dt className="text-eyebrow text-arena-700">{label}</dt>
            <dd className="font-display text-[1.375rem] leading-tight break-words text-foreground">
              {value || (
                <>
                  <span className="text-text-muted">Por confirmar</span> <DevTag>Dato pendiente</DevTag>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </EditorialSection>
  );
}
