// The validity of a REPROCANN credential, computed from its expiry date and today. The single
// place for it: the member list, the member page and any future portal view or reminder use this.
// Validity is time only; whether the document was reviewed is a separate dimension.

export const EXPIRING_WINDOW_DAYS = 45;

export type ValidityState = "none" | "no_date" | "valid" | "expiring" | "expired";
export type CredentialValidity = { state: ValidityState; days: number | null; label: string; tone: "success" | "warning" | "error" | "neutral" };

/** Today in Argentina, as YYYY-MM-DD. */
export const todayInArgentina = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(now);

const dayNumber = (iso: string) => Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000);

/**
 * `credential` is null when there is no credential at all; `expiresOn` null when there is one
 * without a date. Expires today = "vence hoy" (still valid today); up to 45 days inclusive = soon.
 */
export function credentialValidity(credential: { expiresOn: string | null } | null, today: string = todayInArgentina()): CredentialValidity {
  if (!credential) return { state: "none", days: null, label: "Sin credencial", tone: "neutral" };
  if (!credential.expiresOn) return { state: "no_date", days: null, label: "Sin fecha de vencimiento", tone: "neutral" };
  const days = dayNumber(credential.expiresOn) - dayNumber(today);
  if (days < 0) return { state: "expired", days, label: `Vencida hace ${-days} ${-days === 1 ? "día" : "días"}`, tone: "error" };
  if (days === 0) return { state: "expiring", days, label: "Vence hoy", tone: "warning" };
  if (days <= EXPIRING_WINDOW_DAYS) return { state: "expiring", days, label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, tone: "warning" };
  return { state: "valid", days, label: "Vigente", tone: "success" };
}

/** The credential that counts: the most recent credential or certificate recorded. */
export function currentCredential<T extends { kind: string; createdAt: Date }>(documents: T[]): T | null {
  const candidates = documents.filter((d) => d.kind === "credencial" || d.kind === "certificado");
  return candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
}

export type CredentialStatusKey = "none" | "pending" | "observed" | "verified" | "expiring" | "expired";

/**
 * The one status of the current credential, shown the same way to the member and to the admin.
 * Review comes first: an expiry date is only "valid" once the document was verified. Before that
 * it is what the member (or the association's record) declared, so it is labelled as unverified.
 * An expired date is shown as such even unverified: it already needs a new credential.
 */
export type CredentialStatus = {
  key: CredentialStatusKey;
  label: string;
  tone: "success" | "warning" | "error" | "neutral";
  expiry: { date: string; verified: boolean; validity: CredentialValidity } | null;
};

export function credentialStatus(credential: { reviewStatus: "pendiente" | "observada" | "verificada"; expiresOn: string | null } | null, today: string = todayInArgentina()): CredentialStatus {
  if (!credential) return { key: "none", label: "Sin credencial cargada", tone: "neutral", expiry: null };
  const validity = credentialValidity(credential, today);
  const verified = credential.reviewStatus === "verificada";
  const expiry = credential.expiresOn ? { date: credential.expiresOn, verified, validity } : null;
  if (credential.reviewStatus === "observada") return { key: "observed", label: "Observada", tone: "error", expiry };
  if (validity.state === "expired") return { key: "expired", label: "Vencida", tone: "error", expiry };
  if (!verified) return { key: "pending", label: "En revisión", tone: "warning", expiry };
  if (validity.state === "expiring") return { key: "expiring", label: "Vence pronto", tone: "warning", expiry };
  return { key: "verified", label: "Verificada", tone: "success", expiry };
}

const ddmmyyyy = (iso: string) => iso.split("-").reverse().join("/");

/** The expiry as a sentence: verified dates read plainly, declared ones say they are not checked yet. */
export function expiryLine(expiry: CredentialStatus["expiry"]): string {
  if (!expiry) return "Sin fecha de vencimiento registrada";
  if (!expiry.verified) return expiry.validity.state === "expired" ? `Venció el ${ddmmyyyy(expiry.date)} (fecha sin verificar)` : `Vencimiento sin verificar: ${ddmmyyyy(expiry.date)}`;
  const v = expiry.validity;
  if (v.state === "expired") return `Venció el ${ddmmyyyy(expiry.date)}`;
  if (v.state === "expiring") return v.days === 0 ? `Vence hoy (${ddmmyyyy(expiry.date)})` : `Vence el ${ddmmyyyy(expiry.date)}, en ${v.days} ${v.days === 1 ? "día" : "días"}`;
  return `Vence el ${ddmmyyyy(expiry.date)}`;
}
