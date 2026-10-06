import { CONTACT, BRAND } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="py-10 sm:py-12 lg:py-16 px-4 sm:px-8 border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-5 sm:space-y-6">
          {/* Contacto */}
          <div className="space-y-2 text-sm sm:text-base">
            <h3 className="font-medium text-[#3f6043]">Contacto</h3>
            <div className="space-y-1 text-text-muted">
              <p>Instagram: {CONTACT.instagram}</p>
              <p>WhatsApp: {CONTACT.whatsapp}</p>
              <p>Email: {CONTACT.email}</p>
            </div>
          </div>

          {/* Créditos */}
          <div className="text-xs sm:text-sm text-text-muted pt-5 sm:pt-6 border-t border-border">
            <p>© {new Date().getFullYear()} {BRAND.name}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
