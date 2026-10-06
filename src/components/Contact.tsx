import { CONTACT } from "@/lib/constants";

const ITEMS = [
  ["Instagram", CONTACT.instagram],
  ["WhatsApp", CONTACT.whatsapp],
  ["Email", CONTACT.email],
] as const;

export default function Contact() {
  return (
    <section id="contacto" className="border-t border-border pt-6 sm:pt-8">
      <h3 className="font-medium mb-3 sm:mb-4 text-[#3f6043]" style={{fontSize: "clamp(1.125rem, 3.5vw, 1.5rem)"}}>Contacto</h3>
      <div className="space-y-2 text-base sm:text-lg">
        {ITEMS.map(([label, value]) => (
          <p key={label}>
            <span className="text-text-muted">{label}:</span>{" "}
            <span className="text-brand-hover">{value}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
