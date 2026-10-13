import type { Metadata } from "next";
import { LOCKUP_CID } from "@/server/email/layout";
import { emailTemplates } from "@/server/email/templates";

export const metadata: Metadata = { title: "Emails | Amarí Dul" };

// Fictitious data, to review the designed emails as the person receives them. The lockup is
// served from this site: the CSP only allows same-origin images (the real email embeds it).
const expires = new Date("2026-10-20T13:54:00Z");
const SAMPLES = [
  { flow: "Asociarse", email: emailTemplates.pre_admission_received({ name: "Persona Ficticia", reference: "PRE-2026-0007" }) },
  { flow: "Asociarse", email: emailTemplates.admission_invitation({ name: "Persona Ficticia", url: "https://amaridul.com/admision#t=EJEMPLO", expiresAt: expires }) },
  { flow: "Asociarse", email: emailTemplates.admission_received({ name: "Persona", reference: "ADM-2026-0003" }) },
  { flow: "Socio", email: emailTemplates.admission_approved({ name: "Persona", memberNumber: "AD-0004", url: "https://amaridul.com/qr/activar#t=EJEMPLO", expiresAt: expires }) },
  { flow: "Asociarse", email: emailTemplates.admission_rejected({ name: "Persona" }) },
  { flow: "Socio", email: emailTemplates.password_reset({ url: "https://amaridul.com/qr/recuperar#t=EJEMPLO" }) },
];

export default function EmailsPage() {
  return (
    <main className="page-gutter py-10">
      <div className="admin-column space-y-3">
        <h1 className="text-h1 text-forest">Emails</h1>
        <p className="max-w-2xl text-body text-text-muted">Así llegan los mails del recorrido, con datos ficticios. Violeta mientras la persona se asocia; verde cuando ya es socia.</p>
      </div>
      <div className="admin-column mt-8 grid gap-10 lg:grid-cols-2">
        {SAMPLES.map(({ flow, email }) => (
          <section key={email.subject} className="space-y-2" aria-label={email.subject}>
            <p className="text-eyebrow text-accent">{flow}</p>
            <p className="font-title text-lg text-forest">{email.subject}</p>
            <iframe title={email.subject} srcDoc={email.html?.replaceAll(`cid:${LOCKUP_CID}`, "/email/lockup-cream.png")} className="h-[760px] w-full !rounded-card border border-mist-line bg-white" />
          </section>
        ))}
      </div>
    </main>
  );
}
