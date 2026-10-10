// Structure only. Every institutional text is pending approval and must be replaced
// by the approved copy before production; placeholders are deliberately visible.
const PENDING = "[TEXTO PENDIENTE DE APROBACIÓN]";

type Rendered = { subject: string; text: string };

export const emailTemplates = {
  pre_admission_received: (p: { reference: string }): Rendered => ({
    subject: `Recibimos tu solicitud ${p.reference}`,
    text: `${PENDING}\n\nReferencia: ${p.reference}`,
  }),
  admission_invitation: (p: { url: string; expiresAt: Date }): Rendered => ({
    subject: "Invitación a la solicitud formal de admisión",
    text: `${PENDING}\n\n${p.url}\n\nVence: ${p.expiresAt.toISOString()}`,
  }),
  admission_received: (p: { reference: string }): Rendered => ({
    subject: `Recibimos tu solicitud formal ${p.reference}`,
    text: `${PENDING}\n\nReferencia: ${p.reference}`,
  }),
  admission_approved: (p: { memberNumber: string }): Rendered => ({
    subject: "Tu admisión fue aprobada",
    text: `${PENDING}\n\nNúmero de socio: ${p.memberNumber}`,
  }),
  account_activation: (p: { url: string; expiresAt: Date }): Rendered => ({
    subject: "Activá tu cuenta",
    text: `${PENDING}\n\n${p.url}\n\nVence: ${p.expiresAt.toISOString()}`,
  }),
  password_reset: (p: { url: string }): Rendered => ({
    subject: "Restablecer tu contraseña",
    text: `${PENDING}\n\n${p.url}\n\nSi no lo pediste, ignorá este mensaje.`,
  }),
} as const;

export type EmailTemplate = keyof typeof emailTemplates;
