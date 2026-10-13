// Structure only. Every institutional text is pending approval and must be replaced
// by the approved copy before production; placeholders are deliberately visible.
const PENDING = "[TEXTO PENDIENTE DE APROBACIÓN]";

type Rendered = { subject: string; text: string };

const longDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

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
  // Provisional copy, consistent with the site; replace with the approved text.
  admission_invitation: (p: { name: string; url: string; expiresAt: Date }): Rendered => ({
    subject: "Invitación a la solicitud formal de admisión",
    text: [
      `Hola, ${p.name}:`,
      "",
      "Revisamos tu solicitud de preadmisión y te invitamos a completar la solicitud formal para asociarte a Amarí Dul.",
      "",
      "Abrí este link personal para empezar. Completarla lleva unos 10 minutos:",
      p.url,
      "",
      `El link vence el ${longDate.format(p.expiresAt)}. Es personal: no lo compartas.`,
      "",
      "La admisión la decide la Comisión Directiva y te avisamos el resultado por email.",
      "",
      "Amarí Dul · Asociación civil",
    ].join("\n"),
  }),
  // Provisional copy, consistent with the site; replace with the approved text.
  admission_received: (p: { reference: string; name: string }): Rendered => ({
    subject: `Recibimos tu solicitud formal ${p.reference}`,
    text: [
      `Hola, ${p.name}:`,
      "",
      "Recibimos tu solicitud formal de admisión a Amarí Dul. La Comisión Directiva la va a evaluar y te vamos a avisar por email cuando haya una decisión.",
      "",
      `Referencia: ${p.reference}`,
      "",
      "Amarí Dul · Asociación civil",
    ].join("\n"),
  }),
  // Provisional copy, consistent with the site; replace with the approved text.
  admission_approved: (p: { name: string; memberNumber: string; url: string; expiresAt: Date }): Rendered => ({
    subject: "Tu admisión fue aprobada",
    text: [
      `Hola, ${p.name}:`,
      "",
      "La Comisión Directiva aprobó tu admisión. ¡Te damos la bienvenida a Amarí Dul!",
      "",
      `Tu número de socio es ${p.memberNumber}.`,
      "",
      "Para entrar a tu espacio, activá tu cuenta creando una contraseña en este link personal:",
      p.url,
      "",
      `El link vence el ${longDate.format(p.expiresAt)} y sirve una sola vez. Después ingresás con tu DNI y esa contraseña.`,
      "",
      "Amarí Dul · Asociación civil",
    ].join("\n"),
  }),
  // Provisional copy; replace with the approved text.
  admission_rejected: (p: { name: string }): Rendered => ({
    subject: "Sobre tu solicitud de admisión",
    text: [
      `Hola, ${p.name}:`,
      "",
      "La Comisión Directiva evaluó tu solicitud formal de admisión y en esta oportunidad no fue aprobada.",
      "",
      "Si querés conocer más detalles, respondé este email y el equipo de la asociación se va a comunicar con vos.",
      "",
      "Amarí Dul · Asociación civil",
    ].join("\n"),
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
