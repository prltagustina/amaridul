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
