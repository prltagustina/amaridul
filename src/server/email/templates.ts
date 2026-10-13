// Every email has a designed HTML version (see layout.ts) and a plain-text one for clients that
// do not show HTML. Copy is provisional, consistent with the site: replace it with the approved
// text. Lila while joining (Sumate, invitation, formal request), green once a member.
import { renderEmail, type EmailBlock, type EmailLayout } from "./layout";

const PENDING = "[TEXTO PENDIENTE DE APROBACIÓN]";

type Rendered = { subject: string; text: string; html?: string };

const longDate = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

const SIGNATURE = "Amarí Dul · Asociación civil";

/** Plain-text twin of the HTML blocks, so both versions always say the same. */
function plain(greeting: string, blocks: EmailBlock[]): string {
  const lines = [greeting, ""];
  for (const b of blocks) {
    if (b.kind === "p" || b.kind === "note") lines.push(b.text, "");
    if (b.kind === "fact") lines.push(`${b.label}: ${b.value}`, "");
    if (b.kind === "button") lines.push(`${b.label}:`, b.url, "");
  }
  return [...lines, SIGNATURE].join("\n");
}

function email(subject: string, greeting: string, l: Omit<EmailLayout, "blocks">, blocks: EmailBlock[]): Rendered {
  return { subject, text: plain(greeting, blocks), html: renderEmail({ ...l, blocks: [{ kind: "p", text: greeting }, ...blocks] }) };
}

export const emailTemplates = {
  pre_admission_received: (p: { reference: string; name: string }): Rendered =>
    email(
      `Recibimos tu solicitud ${p.reference}`,
      `Hola, ${p.name}:`,
      {
        tone: "join",
        preheader: `Tu solicitud de preadmisión quedó registrada con la referencia ${p.reference}.`,
        eyebrow: "Sumate a la comunidad",
        title: "Recibimos tu solicitud",
        tab: "Preadmisión",
        reason: "Recibís este email porque completaste la solicitud de preadmisión en amaridul.com.",
      },
      [
        { kind: "p", text: "Recibimos tu solicitud de preadmisión a Amarí Dul. El equipo de la asociación la va a revisar y se va a poner en contacto con vos." },
        { kind: "fact", label: "Referencia", value: p.reference, mono: true },
        { kind: "note", text: "Enviar la solicitud no implica la admisión como socio: la decide la Comisión Directiva." },
      ],
    ),

  admission_invitation: (p: { name: string; url: string; expiresAt: Date }): Rendered =>
    email(
      "Invitación a la solicitud formal de admisión",
      `Hola, ${p.name}:`,
      {
        tone: "join",
        preheader: "Revisamos tu preadmisión: ya podés completar la solicitud formal.",
        eyebrow: "Invitación personal",
        title: "Te invitamos a la solicitud formal",
        tab: "Invitación",
        reason: "Recibís este email porque el equipo de Amarí Dul revisó tu preadmisión.",
      },
      [
        { kind: "p", text: "Revisamos tu solicitud de preadmisión y te invitamos a completar la solicitud formal para asociarte a Amarí Dul. Completarla lleva unos 10 minutos." },
        { kind: "button", label: "Completar mi solicitud", url: p.url },
        { kind: "fact", label: "El link vence el", value: longDate.format(p.expiresAt) },
        { kind: "note", text: "El link es personal: no lo compartas. La admisión la decide la Comisión Directiva y te avisamos el resultado por email." },
      ],
    ),

  admission_received: (p: { reference: string; name: string }): Rendered =>
    email(
      `Recibimos tu solicitud formal ${p.reference}`,
      `Hola, ${p.name}:`,
      {
        tone: "join",
        preheader: `Tu solicitud formal quedó registrada con la referencia ${p.reference}.`,
        eyebrow: "Solicitud formal de admisión",
        title: "Recibimos tu solicitud formal",
        tab: "Solicitud formal",
        reason: "Recibís este email porque enviaste la solicitud formal de admisión en amaridul.com.",
      },
      [
        { kind: "p", text: "Recibimos tu solicitud formal de admisión a Amarí Dul. La Comisión Directiva la va a evaluar y te vamos a avisar por email cuando haya una decisión." },
        { kind: "fact", label: "Referencia", value: p.reference, mono: true },
      ],
    ),

  admission_approved: (p: { name: string; memberNumber: string; url: string; expiresAt: Date }): Rendered =>
    email(
      "Tu admisión fue aprobada",
      `Hola, ${p.name}:`,
      {
        tone: "member",
        preheader: `Te damos la bienvenida a Amarí Dul. Tu número de socio es ${p.memberNumber}.`,
        eyebrow: "Te damos la bienvenida",
        title: "Tu admisión fue aprobada",
        tab: "Socios",
        reason: "Recibís este email porque la Comisión Directiva aprobó tu solicitud de admisión.",
      },
      [
        { kind: "p", text: "La Comisión Directiva aprobó tu admisión. ¡Te damos la bienvenida a Amarí Dul!" },
        { kind: "fact", label: "Tu número de socio", value: p.memberNumber, mono: true },
        { kind: "p", text: "Para entrar a tu espacio, activá tu cuenta creando una contraseña:" },
        { kind: "button", label: "Activar mi cuenta", url: p.url },
        { kind: "fact", label: "El link vence el", value: longDate.format(p.expiresAt) },
        { kind: "note", text: "El link sirve una sola vez. Después ingresás en amaridul.com con tu DNI y esa contraseña." },
      ],
    ),

  admission_rejected: (p: { name: string }): Rendered =>
    email(
      "Sobre tu solicitud de admisión",
      `Hola, ${p.name}:`,
      {
        tone: "join",
        preheader: "La Comisión Directiva evaluó tu solicitud formal de admisión.",
        eyebrow: "Solicitud formal de admisión",
        title: "Sobre tu solicitud",
        tab: "Solicitud formal",
        reason: "Recibís este email porque enviaste una solicitud formal de admisión a Amarí Dul.",
      },
      [
        { kind: "p", text: "La Comisión Directiva evaluó tu solicitud formal de admisión y en esta oportunidad no fue aprobada." },
        { kind: "p", text: "Si querés conocer más detalles, respondé este email y el equipo de la asociación se va a comunicar con vos." },
      ],
    ),

  // Not used yet (activation goes in the approval email); kept with its pending marker.
  account_activation: (p: { url: string; expiresAt: Date }): Rendered => ({
    subject: "Activá tu cuenta",
    text: `${PENDING}\n\n${p.url}\n\nVence: ${p.expiresAt.toISOString()}`,
  }),

  password_reset: (p: { url: string }): Rendered =>
    email(
      "Restablecer tu contraseña",
      "Hola:",
      {
        tone: "member",
        preheader: "Pediste crear una contraseña nueva para tu espacio de socio.",
        eyebrow: "Socios",
        title: "Creá una contraseña nueva",
        tab: "Recuperación",
        reason: "Recibís este email porque se pidió recuperar la contraseña de tu cuenta en amaridul.com.",
      },
      [
        { kind: "p", text: "Recibimos un pedido para crear una contraseña nueva para tu espacio de socio en Amarí Dul." },
        { kind: "button", label: "Crear contraseña nueva", url: p.url },
        { kind: "note", text: "El link vence en 30 minutos y sirve una sola vez. Al guardarla, cerramos las sesiones abiertas en otros dispositivos. Si no lo pediste, ignorá este email: tu contraseña sigue igual." },
      ],
    ),
} as const;

export type EmailTemplate = keyof typeof emailTemplates;
