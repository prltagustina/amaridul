import type { Tone } from "@/components/ui/display";
import type { AdmissionStatus, Lot, MemberStatus, PreAdmissionStatus } from "@/demo/fixtures";

export const preStatus: Record<PreAdmissionStatus, { label: string; tone: Tone }> = {
  recibida: { label: "Recibida", tone: "info" },
  "en-revision": { label: "En revisión", tone: "warning" },
  invitada: { label: "Invitada al alta", tone: "brand" },
  cerrada: { label: "Cerrada", tone: "neutral" },
};

export const admissionStatus: Record<AdmissionStatus, { label: string; tone: Tone }> = {
  borrador: { label: "En curso", tone: "neutral" },
  recibida: { label: "Recibida", tone: "info" },
  comision: { label: "En Comisión", tone: "warning" },
  aprobada: { label: "Aprobada", tone: "success" },
  rechazada: { label: "Rechazada", tone: "error" },
};

export const memberStatus: Record<MemberStatus, { label: string; tone: Tone }> = {
  activo: { label: "Activo", tone: "success" },
  suspendido: { label: "Suspendido", tone: "warning" },
  baja: { label: "Baja", tone: "neutral" },
};

export const lotStatus: Record<Lot["status"], { label: string; tone: Tone }> = {
  publicado: { label: "Publicado", tone: "success" },
  borrador: { label: "Borrador", tone: "neutral" },
  retirado: { label: "Retirado", tone: "error" },
};
