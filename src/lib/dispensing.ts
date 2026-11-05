// Whether a member is enabled for dispensing, derived (never stored) from the three conditions the
// member's space already shows: their membership is active, their REPROCANN credential is verified
// and in force, and the association verified their linkage in REPROCANN. Uploading a file or
// sending the link code meets none of them by itself: each one needs the association's check.
// The single place for this rule: the admin's member page and the member's summary both use it.
import type { CredentialStatus } from "@/lib/credential-validity";

export const DISPENSING_LABEL = "Habilitado a dispensa";

export type Audience = "member" | "admin";
export type MembershipState = "activo" | "suspendido" | "baja";

/**
 * The REPROCANN «código de vinculación» and the linkage it is for, in the system's own states:
 * no code yet, code received (the linkage is still to do) and linkage verified by the association.
 * A received code is never a linkage.
 */
export type LinkageState = "missing" | "received" | "verified";
export const linkageState = (l: { verified: boolean; codeReceived: boolean } | null): LinkageState => (l?.verified ? "verified" : l?.codeReceived ? "received" : "missing");

/**
 * A short state for the badge (the same words everywhere) and one line of help under it. For the
 * member, a received code shows green with its tick: their part is done. The linkage itself is
 * still pending (the condition is not met until the association verifies it), and the words say
 * so: «Código recibido», never «Verificada».
 */
export const LINKAGE_TEXT: Record<LinkageState, Record<Audience, { status: string; help: string; tone: "success" | "info" | "warning" }>> = {
  missing: {
    member: { status: "Pendiente", help: "Agregá tu código de vinculación de REPROCANN.", tone: "warning" },
    admin: { status: "Pendiente", help: "Falta el código de vinculación del socio.", tone: "warning" },
  },
  received: {
    member: { status: "Código recibido", help: "La asociación ya tiene tu código y está haciendo la vinculación en REPROCANN.", tone: "success" },
    admin: { status: "Código recibido", help: "Hay que hacer la vinculación en REPROCANN y marcarla verificada.", tone: "info" },
  },
  verified: {
    member: { status: "Verificada", help: "La asociación ya te vinculó en REPROCANN.", tone: "success" },
    admin: { status: "Verificada", help: "La vinculación está hecha y verificada.", tone: "success" },
  },
};

export type ConditionKey = "membership" | "credential" | "linkage";
export type DispensingCondition = {
  key: ConditionKey;
  label: string;
  met: boolean;
  /** Its current state, in words: the same the badges say. */
  state: string;
  /** What is still missing, while it is not met. */
  pending: string | null;
};
export type DispensingEligibility = { eligible: boolean; conditions: DispensingCondition[]; pending: DispensingCondition[] };

const MEMBERSHIP_STATE: Record<MembershipState, string> = { activo: "Completa", suspendido: "Membresía suspendida", baja: "Membresía dada de baja" };

// What is missing for each credential status that does not meet the condition.
const CREDENTIAL_PENDING: Record<Exclude<CredentialStatus["key"], "verified" | "expiring">, Record<Audience, string>> = {
  none: { member: "Falta cargar tu credencial REPROCANN.", admin: "Falta la credencial REPROCANN." },
  pending: { member: "Tu credencial está en revisión: la asociación tiene que verificarla.", admin: "La credencial está pendiente de revisión: hay que verificarla." },
  observed: { member: "Tu credencial fue observada: hay que corregirla.", admin: "La credencial está observada: el socio tiene que corregirla." },
  expired: { member: "Tu credencial venció: cargá la nueva.", admin: "La credencial venció: hace falta la nueva." },
};

const LINKAGE_PENDING: Record<Exclude<LinkageState, "verified">, Record<Audience, string>> = {
  missing: { member: "Falta tu código de vinculación REPROCANN.", admin: "Falta el código de vinculación REPROCANN del socio." },
  received: { member: "La asociación recibió tu código y tiene que hacer la vinculación en REPROCANN.", admin: "Hay que hacer la vinculación en REPROCANN y marcarla verificada." },
};

/**
 * The three conditions, each one met or not with what is missing, and the result. A credential
 * counts while it is verified and has not expired («Vence pronto» is still in force); observed,
 * pending review or expired, it does not. Suspended or withdrawn members are never enabled.
 */
export function dispensingEligibility(
  input: { membership: MembershipState; credential: CredentialStatus; linkage: { verified: boolean; codeReceived: boolean } | null },
  audience: Audience = "admin",
): DispensingEligibility {
  const linkage = linkageState(input.linkage);
  const credentialMet = input.credential.key === "verified" || input.credential.key === "expiring";
  const conditions: DispensingCondition[] = [
    {
      key: "membership",
      label: "Alta como socio/a",
      met: input.membership === "activo",
      state: MEMBERSHIP_STATE[input.membership],
      pending: input.membership === "activo" ? null : audience === "member" ? "Tu membresía tiene que estar activa." : "La membresía tiene que estar activa.",
    },
    {
      key: "credential",
      label: "Credencial REPROCANN",
      met: credentialMet,
      state: input.credential.label,
      pending: credentialMet ? null : CREDENTIAL_PENDING[input.credential.key as keyof typeof CREDENTIAL_PENDING][audience],
    },
    {
      key: "linkage",
      label: "Vinculación con Amarí Dul",
      met: linkage === "verified",
      state: LINKAGE_TEXT[linkage][audience].status,
      pending: linkage === "verified" ? null : LINKAGE_PENDING[linkage][audience],
    },
  ];
  const pending = conditions.filter((c) => !c.met);
  return { eligible: pending.length === 0, conditions, pending };
}
