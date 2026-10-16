"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, MailPlus, SearchCheck, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, RadioGroup } from "@/components/ui/choice";
import { Alert, Card } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import type { ExistingMemberRequestStatus } from "@/server/existing-members";
import { linkAction, needsReviewAction, registerAction, rejectAction, resendLinkAction, type ActionResult } from "../actions";

type Option = { value: string; label: string };
type Found = { number: string | null; category: string; since: string; minutesReference: string; status: string; accountStatus: "none" | "pending_activation" | "active" | "disabled"; email: string | null };

const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "suspendido", label: "Suspendido" },
  { value: "baja", label: "Baja" },
];
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export default function ExistingMemberActions({
  id,
  status,
  declaredNumber,
  sentEmail,
  member,
  blocked,
  writesEnabled,
  categories,
}: {
  id: string;
  status: ExistingMemberRequestStatus;
  declaredNumber: string | null;
  sentEmail: string;
  member: Found | null;
  blocked: boolean;
  writesEnabled: boolean;
  categories: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [dialog, setDialog] = useState<"confirm" | "review" | "reject" | null>(null);
  const [notes, setNotes] = useState("");

  const [numberMode, setNumberMode] = useState<"historic" | "next">(declaredNumber ? "historic" : "next");
  const [form, setForm] = useState({
    memberNumber: declaredNumber ?? "",
    category: member?.category ?? "",
    since: member?.since ?? "",
    sinceUnknown: member ? !member.since : false,
    minutesReference: member?.minutesReference ?? "",
    status: member?.status ?? "activo",
  });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const emailDiffers = !!member?.email && member.email.toLowerCase() !== sentEmail.toLowerCase();
  const [updateContact, setUpdateContact] = useState(false);
  const open = status === "pending_verification" || status === "needs_review";

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await action();
      setDialog(null);
      setNotice(r.ok ? { tone: "success", text: r.message } : { tone: "error", text: r.error });
      if (r.ok) router.refresh();
    });

  const institutional = { category: form.category, since: form.sinceUnknown ? "" : form.since, minutesReference: form.minutesReference, status: form.status };
  const missingDate = !form.sinceUnknown && !form.since;
  const canSubmit = !!form.category && !missingDate && (member || numberMode === "next" || form.memberNumber.trim());

  const confirm = () => run(() => (member ? linkAction(id, { ...institutional, updateContact: emailDiffers ? updateContact : true }) : registerAction(id, { ...institutional, numberMode, memberNumber: form.memberNumber })));

  return (
    <aside className="order-first space-y-6 lg:order-none" aria-label="Acciones">
      {notice && (
        <Alert tone={notice.tone} live>
          {notice.text}
        </Alert>
      )}

      {status === "awaiting_data" && (
        <Card className="space-y-4">
          <h2 className="text-h3">Esperando datos</h2>
          <p className="text-small text-text-muted">Le enviamos un link personal para completar su legajo (DNI, domicilio y fecha de nacimiento). Cuando lo complete, vas a poder verificarlo.</p>
          <Button variant="secondary" shape="admin" full onClick={() => run(() => resendLinkAction(id))} disabled={pending}>
            <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> Reenviar link
          </Button>
          <Button variant="danger" shape="admin" full onClick={() => setDialog("reject")}>
            <XCircle aria-hidden className="size-4" strokeWidth={1.5} /> No corresponde
          </Button>
        </Card>
      )}

      {open && (
        <Card className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-h3">{member ? "Vincular con el socio" : "Registrar socio existente"}</h2>
            <p className="text-small text-text-muted">
              {member
                ? `Se reutilizan el socio ${member.number ?? "ya registrado"}, su persona y su cuenta: no se crea nada nuevo.${member.accountStatus === "none" ? " Todavía no tiene cuenta digital: se crea al vincular y le enviamos la activación." : ""}`
                : "Cargá los datos del registro de la asociación. Si un dato histórico no está disponible, dejalo pendiente: nunca lo inventes."}
            </p>
          </div>
          {!writesEnabled ? (
            <Alert tone="info">Registrar y vincular se habilita en producción cuando termine la verificación del deploy. La solicitud queda guardada.</Alert>
          ) : blocked && !member ? (
            <Alert tone="warning">Hay un conflicto que resolver antes de registrar (mirá «En el sistema»).</Alert>
          ) : (
            <div className="space-y-4">
              {!member && (
                <>
                  <RadioGroup
                    name="numberMode"
                    legend="Número de socio"
                    options={[
                      { value: "historic", label: "Tiene número histórico" },
                      { value: "next", label: "Asignar el próximo número (AD-…)" },
                    ]}
                    value={numberMode}
                    onChange={(v) => setNumberMode(v as "historic" | "next")}
                  />
                  {numberMode === "historic" && <TextField id="memberNumber" label="Número histórico" value={form.memberNumber} onChange={(e) => set("memberNumber", e.target.value)} maxLength={30} autoComplete="off" />}
                </>
              )}
              {emailDiffers && (
                <div className="space-y-2 !rounded-control bg-warning-bg px-3 py-3 text-small text-warning-fg">
                  <p>
                    El email enviado ({sentEmail}) es distinto del registrado ({member!.email}). Si no lo actualizás, la activación va al email registrado.
                  </p>
                  <Checkbox id="updateContact" label="Actualizar el email y el domicilio con los datos enviados" checked={updateContact} onChange={(e) => setUpdateContact(e.target.checked)} />
                </div>
              )}
              <Select id="category" label="Categoría actual" placeholder="Elegí la categoría" options={categories} value={form.category} onChange={(e) => set("category", e.target.value)} />
              <TextField
                id="since"
                type="date"
                label="Fecha histórica de ingreso"
                max={today()}
                value={form.sinceUnknown ? "" : form.since}
                disabled={form.sinceUnknown}
                onChange={(e) => set("since", e.target.value)}
              />
              <Checkbox id="sinceUnknown" label="Pendiente / no disponible" checked={form.sinceUnknown} onChange={(e) => set("sinceUnknown", e.target.checked)} />
              <TextField id="minutesReference" label="Referencia del acta" optional hint="Si existe." value={form.minutesReference} onChange={(e) => set("minutesReference", e.target.value)} maxLength={200} />
              <Select id="memberStatus" label="Estado de la membresía" options={STATUS_OPTIONS} value={form.status} onChange={(e) => set("status", e.target.value)} />
              <Button shape="admin" full disabled={!canSubmit || pending} onClick={() => setDialog("confirm")}>
                {member ? <Link2 aria-hidden className="size-4" strokeWidth={1.5} /> : <UserPlus aria-hidden className="size-4" strokeWidth={1.5} />}
                {member ? "Vincular con socio existente" : "Registrar socio existente"}
              </Button>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            {status === "pending_verification" && (
              <Button variant="secondary" shape="admin" full onClick={() => setDialog("review")}>
                <SearchCheck aria-hidden className="size-4" strokeWidth={1.5} /> Requiere revisión
              </Button>
            )}
            <Button variant="danger" shape="admin" full onClick={() => setDialog("reject")}>
              <XCircle aria-hidden className="size-4" strokeWidth={1.5} /> No corresponde
            </Button>
          </div>
        </Card>
      )}

      {(status === "matched" || status === "completed" || status === "rejected") && (
        <Card className="space-y-2">
          <h2 className="text-h3">Resuelta</h2>
          <p className="text-small text-text-muted">
            {status === "matched"
              ? "El socio quedó vinculado. Falta que active su cuenta con el link que le enviamos; se puede reenviar desde su ficha."
              : status === "completed"
                ? "Legajo actualizado y cuenta activa."
                : "Marcada como «No corresponde». No se creó ningún socio ni cuenta."}
          </p>
        </Card>
      )}

      <Dialog
        open={dialog === "confirm"}
        onClose={() => setDialog(null)}
        title={member ? "Vincular con socio existente" : "Registrar socio existente"}
        description={
          member
            ? member.accountStatus === "active"
              ? "La cuenta ya está activa: no se crea otra ni se envía ningún email."
              : "Le vamos a enviar un email para activar su cuenta."
            : "Se crea el registro del socio con estos datos y le enviamos un email para activar su cuenta."
        }
        confirmLabel={pending ? "Guardando…" : "Confirmar"}
        confirmDisabled={pending}
        onConfirm={confirm}
      >
        <p className="text-body">No pasa por Comisión Directiva: es un socio que ya fue admitido.</p>
      </Dialog>

      <Dialog
        open={dialog === "review" || dialog === "reject"}
        onClose={() => setDialog(null)}
        title={dialog === "reject" ? "No corresponde" : "Requiere revisión"}
        description={dialog === "reject" ? "La persona no figura como socia. No se crea nada; queda registrado." : "Queda marcada para revisar antes de resolverla."}
        confirmLabel={pending ? "Guardando…" : dialog === "reject" ? "Marcar «No corresponde»" : "Marcar para revisar"}
        confirmVariant={dialog === "reject" ? "danger" : "primary"}
        confirmDisabled={pending}
        onConfirm={() => run(() => (dialog === "reject" ? rejectAction(id, notes) : needsReviewAction(id, notes)))}
      >
        <Textarea id="notes" label="Nota interna" optional value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
      </Dialog>
    </aside>
  );
}
