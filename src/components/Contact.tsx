import { CONTACT } from "@/lib/constants";
import { EditorialSection } from "@/components/brand/editorial-section";

const ITEMS = [
  ["Instagram", CONTACT.instagram],
  ["WhatsApp", CONTACT.whatsapp],
  ["Email", CONTACT.email],
] as const;

export default function Contact() {
  return (
    <EditorialSection id="contacto" eyebrow="Escribinos" title="Contacto" className="bg-arena-100 sm:py-24">
      <dl className="divide-y divide-arena-300 border-y border-arena-300">
        {ITEMS.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-5">
            <dt className="text-eyebrow text-arena-700">{label}</dt>
            <dd className="font-display text-[1.375rem] leading-tight break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </EditorialSection>
  );
}
