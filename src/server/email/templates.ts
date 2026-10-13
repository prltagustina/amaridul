// Structure only. Every institutional text is pending approval and must be replaced
// by the approved copy before production; placeholders are deliberately visible.
const PENDING = "[TEXTO PENDIENTE DE APROBACIÓN]";

type Rendered = { subject: string; text: string };

export const emailTemplates = {
  // Provisional copy, consistent with the site; replace with the approved text.
  pre_admission_received: (p: { reference: string; name: string }): Rendered => ({
    subject: `Recibimos tu solicitud ${p.reference}`,
    text: [
      `Hola, ${p.name}:`,
      "",
      "Recibimos tu solicitud de preadmisión a Amarí Dul. El equipo de la asociación la va a revisar y se va a poner en contacto con vos.",
      "",
      `Referencia: ${p.reference}`,
      "",
      "Enviar la solicitud no implica la admisión como socio: la decide la Comisión Directiva.",
      "",
      "Amarí Dul · Asociación civil",
    ].join("\n"),
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
