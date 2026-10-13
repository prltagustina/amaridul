// HTML version of the emails, with the site's look: bone ground, a coloured band with the cream
// lockup and the title, a folder tab resting on its edge, and a white card with label/value rows
// and a pill button. Email clients ignore most CSS, so this is table-based with inline styles;
// web fonts and gradients are enhancements over solid fallbacks.

/** Colour per flow, as on the site: lila while joining, green once a member. */
export type EmailTone = "join" | "member";

const TONES: Record<EmailTone, { band: string; bandTo: string; ink: string; soft: string }> = {
  join: { band: "#493b5a", bandTo: "#64517a", ink: "#493b5a", soft: "#f1ebf9" },
  member: { band: "#2c4b2d", bandTo: "#3f6640", ink: "#2c4b2d", soft: "#e6f0e3" },
};

const C = { bone: "#f6f3ec", card: "#ffffff", line: "#e1ded5", text: "#1a1a18", muted: "#5f5d58", label: "#615a4d" };
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const SANS = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

/**
 * The lockup travels inside the email as an inline image (cid), so it shows even where remote
 * images are blocked (new senders in Gmail). The sender attaches it from the hosted PNG.
 */
export const LOCKUP_CID = "amaridul-lockup";
export const LOCKUP_URL = "https://amaridul.com/email/lockup-cream.png";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type EmailBlock =
  | { kind: "p"; text: string }
  | { kind: "fact"; label: string; value: string; mono?: boolean }
  | { kind: "button"; label: string; url: string }
  | { kind: "note"; text: string };

export type EmailLayout = {
  tone: EmailTone;
  /** Inbox preview line. */
  preheader: string;
  eyebrow: string;
  title: string;
  tab: string;
  blocks: EmailBlock[];
  /** Why this person got the email, at the bottom. */
  reason: string;
};

function block(b: EmailBlock, tone: (typeof TONES)[EmailTone]): string {
  switch (b.kind) {
    case "p":
      return `<p style="margin:0 0 16px;font:400 16px/1.6 ${SANS};color:${C.text}">${esc(b.text)}</p>`;
    case "fact":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;border-collapse:separate;background:${tone.soft};border-radius:12px"><tr><td style="padding:14px 18px">
<p style="margin:0 0 4px;font:500 11px/1.4 ${SANS};letter-spacing:.16em;text-transform:uppercase;color:${C.label}">${esc(b.label)}</p>
<p style="margin:0;font:600 ${b.mono ? `19px/1.3 ${MONO}` : `17px/1.4 ${SANS}`};color:${tone.ink}">${esc(b.value)}</p>
</td></tr></table>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px"><tr><td bgcolor="${tone.band}" style="border-radius:999px;background:${tone.band};background-image:linear-gradient(135deg,${tone.band},${tone.bandTo})">
<a href="${esc(b.url)}" style="display:inline-block;padding:14px 30px;font:700 16px/1.2 ${SANS};color:#ffffff;text-decoration:none;border-radius:999px">${esc(b.label)} &rarr;</a>
</td></tr></table>
<p style="margin:0 0 20px;font:400 13px/1.5 ${SANS};color:${C.muted}">Si el botón no funciona, copiá este link en el navegador:<br><a href="${esc(b.url)}" style="color:${tone.ink};word-break:break-all">${esc(b.url)}</a></p>`;
    case "note":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 4px;border-top:1px solid ${C.line}"><tr><td style="padding:16px 0 0;font:400 14px/1.55 ${SANS};color:${C.muted}">${esc(b.text)}</td></tr></table>`;
  }
}

export function renderEmail(l: EmailLayout): string {
  const tone = TONES[l.tone];
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">
<title>${esc(l.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.bone}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(l.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${C.bone}" style="background:${C.bone}"><tr><td align="center" style="padding:28px 12px 40px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td bgcolor="${tone.band}" style="background:${tone.band};background-image:linear-gradient(118deg,${tone.band} 0%,${tone.bandTo} 100%);border-radius:18px 18px 0 0;padding:26px 28px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<img src="cid:${LOCKUP_CID}" width="210" height="47" alt="Amarí Dul · Asociación civil" style="display:block;margin:0 auto;border:0;width:210px;height:auto;color:#ffffff;font:500 18px ${SERIF}">
</td></tr></table>
<p style="margin:26px 0 6px;font:500 11px/1.4 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.82)">${esc(l.eyebrow)}</p>
<h1 style="margin:0 0 22px;font:500 32px/1.12 ${SERIF};color:#ffffff">${esc(l.title)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.card}" style="background:${C.card};border-radius:10px 10px 0 0;padding:9px 16px 7px;font:600 13px/1.2 ${SANS};color:${tone.ink}">${esc(l.tab)}</td></tr></table>
</td></tr>
<tr><td bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-top:0;border-radius:0 0 18px 18px;padding:28px 28px 26px">
${l.blocks.map((b) => block(b, tone)).join("\n")}
</td></tr>
<tr><td style="padding:22px 8px 0;font:400 12px/1.6 ${SANS};color:${C.muted}" align="center">
<p style="margin:0 0 4px;font:500 15px/1.3 ${SERIF};color:${tone.ink}">Amarí Dul · Asociación civil</p>
<p style="margin:0">${esc(l.reason)}</p>
<p style="margin:6px 0 0"><a href="https://amaridul.com" style="color:${C.muted}">amaridul.com</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}
