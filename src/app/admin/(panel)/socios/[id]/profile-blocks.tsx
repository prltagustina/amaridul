"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MailPlus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DetailList } from "@/components/ui/data-list";
import { Alert, Card, StatusBadge, type Tone } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { invite, saveContact, saveDni, saveFee, saveMemberNumber, saveMembership, saveNote, savePersonal, type BlockResult } from "./actions";

type Option = { value: string; label: string };
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const SENSITIVE = "Este cambio quedará registrado.";

/** Runs a block action, shows the result, and refreshes the page data on success. */
function useBlockAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const run = (action: () => Promise<BlockResult>, onDone: () => void) =>
    start(async () => {
      setError("");
      const r = await action();
      if (!r.ok) return setError(r.error);
      setNotice(r.message ?? "Cambios guardados.");
      onDone();
      router.refresh();
    });
  return { pending, error, notice, setError, setNotice, run };
}

// Another block can ask this one to open its editor (e.g. «Cuenta digital» asking for the DNI).
const EDIT_EVENT = "member-profile:edit";
type EditorRequest = "dni" | "contact";
const requestEditor = (which: EditorRequest) => window.dispatchEvent(new CustomEvent<EditorRequest>(EDIT_EVENT, { detail: which }));
function useEditorRequest(which: EditorRequest, open: () => void) {
  const latest = useRef(open);
  useEffect(() => {
    latest.current = open;
  });
  useEffect(() => {
    const handle = (e: Event) => {
      if ((e as CustomEvent<EditorRequest>).detail === which) latest.current();
    };
    window.addEventListener(EDIT_EVENT, handle);
    return () => window.removeEventListener(EDIT_EVENT, handle);
  }, [which]);
}

/** A read-only block with its own "Editar". */
function Block({ title, onEdit, editLabel = "Editar", children, notice }: { title: string; onEdit?: () => void; editLabel?: string; children: ReactNode; notice?: string }) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h3">{title}</h2>
        {onEdit && (
          <Button variant="ghost" shape="admin" className="min-h-9 shrink-0" onClick={onEdit}>
            <Pencil aria-hidden className="size-4" strokeWidth={1.5} /> {editLabel}
          </Button>
        )}
      </div>
      {notice && (
        <Alert tone="success" live>
          {notice}
        </Alert>
      )}
      {children}
    </Card>
  );
}

const shown = (v: string | null | undefined, empty = "Sin cargar") => v || <span className="text-text-muted">{empty}</span>;

// ---------- A. Datos personales ----------

export function PersonalBlock({ id, data }: { id: string; data: { firstNames: string | null; lastNames: string | null; fullName: string; dniMasked: string | null; birthDate: string | null } }) {
  const a = useBlockAction();
  const [open, setOpen] = useState<"edit" | "dni" | null>(null);
  const [form, setForm] = useState({ firstNames: data.firstNames ?? "", lastNames: data.lastNames ?? "", birthDate: data.birthDate ?? "" });
  const [dni, setDni] = useState("");
  useEditorRequest("dni", () => (setDni(""), a.setError(""), setOpen("dni")));
  return (
    <Block title="Datos personales" onEdit={() => (setForm({ firstNames: data.firstNames ?? data.fullName.split(" ")[0], lastNames: data.lastNames ?? data.fullName.split(" ").slice(1).join(" "), birthDate: data.birthDate ?? "" }), a.setError(""), setOpen("edit"))} notice={a.notice}>
      <DetailList
        items={[
          { label: "Nombre", value: shown(data.firstNames ?? (data.lastNames ? null : data.fullName)) },
          { label: "Apellido", value: shown(data.lastNames) },
          {
            label: "DNI",
            value: (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {shown(data.dniMasked, "Sin DNI")}
                <button type="button" className="text-small !text-forest underline underline-offset-2" onClick={() => (setDni(""), a.setError(""), setOpen("dni"))}>
                  {data.dniMasked ? "Cambiar DNI" : "Cargar DNI"}
                </button>
              </span>
            ),
          },
          { label: "Fecha de nacimiento", value: shown(day(data.birthDate)) },
        ]}
      />
      <Dialog open={open === "edit"} onClose={() => setOpen(null)} title="Datos personales" confirmLabel={a.pending ? "Guardando…" : "Guardar"} confirmDisabled={a.pending} onConfirm={() => a.run(() => savePersonal(id, form), () => setOpen(null))}>
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="p-first" label="Nombre/s" value={form.firstNames} onChange={(e) => setForm((f) => ({ ...f, firstNames: e.target.value }))} maxLength={80} />
          <TextField id="p-last" label="Apellido/s" value={form.lastNames} onChange={(e) => setForm((f) => ({ ...f, lastNames: e.target.value }))} maxLength={80} />
          <TextField id="p-birth" type="date" label="Fecha de nacimiento" optional max={today()} value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
        </div>
      </Dialog>
      <Dialog
        open={open === "dni"}
        onClose={() => setOpen(null)}
        title={data.dniMasked ? "Cambiar DNI" : "Cargar DNI"}
        description={`${SENSITIVE} El DNI es con lo que el socio ingresa: si tiene la cuenta abierta, cerramos sus sesiones.`}
        confirmLabel={a.pending ? "Guardando…" : "Confirmar DNI"}
        confirmDisabled={a.pending || dni.replace(/\D/g, "").length < 7}
        onConfirm={() => a.run(() => saveDni(id, dni), () => setOpen(null))}
      >
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <TextField id="p-dni" label="DNI" inputMode="numeric" autoComplete="off" hint="Sin puntos. No se muestra completo después de guardarlo." value={dni} onChange={(e) => setDni(e.target.value)} />
      </Dialog>
    </Block>
  );
}

// ---------- B. Contacto ----------

type Contact = { email: string | null; phone: string | null; address: string | null; locality: string | null; province: string | null; postalCode: string | null; notificationEmail: string | null };
export function ContactBlock({ id, data, provinces }: { id: string; data: Contact; provinces: readonly string[] }) {
  const a = useBlockAction();
  const [open, setOpen] = useState(false);
  const blank = (d: Contact) => ({ email: d.email ?? "", phone: d.phone ?? "", address: d.address ?? "", locality: d.locality ?? "", province: d.province ?? "", postalCode: d.postalCode ?? "" });
  const [form, setForm] = useState(blank(data));
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  useEditorRequest("contact", () => (setForm(blank(data)), a.setError(""), setOpen(true)));
  return (
    <Block title="Contacto" onEdit={() => (setForm(blank(data)), a.setError(""), setOpen(true))} notice={a.notice}>
      <DetailList
        items={[
          { label: "Email", value: shown(data.email) },
          { label: "Celular", value: shown(data.phone) },
          { label: "Domicilio", value: shown(data.address) },
          { label: "Localidad", value: shown(data.locality) },
          { label: "Provincia", value: shown(data.province) },
          { label: "Código postal", value: shown(data.postalCode) },
        ]}
      />
      {data.notificationEmail && (
        <p className="mt-4 !rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg [overflow-wrap:anywhere]">
          En la admisión declaró otro email para notificaciones: <strong>{data.notificationEmail}</strong>. Los avisos del sistema van a ese. Revisá con la persona cuál corresponde.
        </p>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title="Contacto" description="Es el email de contacto del socio." confirmLabel={a.pending ? "Guardando…" : "Guardar"} confirmDisabled={a.pending} onConfirm={() => a.run(() => saveContact(id, form), () => setOpen(false))} wide>
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="c-email" type="email" label="Email" optional value={form.email} onChange={set("email")} />
          <TextField id="c-phone" type="tel" label="Celular" optional value={form.phone} onChange={set("phone")} />
          <TextField id="c-address" label="Domicilio" optional value={form.address} onChange={set("address")} shellClassName="sm:col-span-2" />
          <TextField id="c-locality" label="Localidad" optional value={form.locality} onChange={set("locality")} />
          <Select id="c-province" label="Provincia" optional placeholder="Sin cargar" options={provinces} value={form.province} onChange={set("province")} />
          <TextField id="c-cp" label="Código postal" optional value={form.postalCode} onChange={set("postalCode")} />
        </div>
      </Dialog>
    </Block>
  );
}

// ---------- C. Membresía ----------

type Membership = {
  memberNumber: string | null;
  category: string | null;
  categoryLabel: string | null;
  since: string | null;
  status: string;
  statusLabel: string;
  minutesReference: string | null;
  originLabel: string;
  room: string | null;
  onboardedAt: string | null;
  legajoLabel: string;
  previousNumbers: string[];
  declaredNumber: string | null;
  admission: ReactNode;
};
export function MembershipBlock({ id, data, categories, statuses }: { id: string; data: Membership; categories: Option[]; statuses: Option[] }) {
  const a = useBlockAction();
  const [open, setOpen] = useState<"edit" | "number" | null>(null);
  const blank = () => ({ category: data.category ?? "", since: data.since ?? "", status: data.status, minutesReference: data.minutesReference ?? "", room: data.room ?? "" });
  const [form, setForm] = useState(blank());
  const [number, setNumber] = useState("");
  const set = (k: keyof ReturnType<typeof blank>) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const differs = data.declaredNumber && data.memberNumber && data.declaredNumber.toLowerCase() !== data.memberNumber.toLowerCase();
  return (
    <Block title="Membresía" onEdit={() => (setForm(blank()), a.setError(""), setOpen("edit"))} notice={a.notice}>
      <DetailList
        items={[
          {
            label: "Número de socio",
            value: (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {shown(data.memberNumber, "A confirmar")}
                <button type="button" className="text-small !text-forest underline underline-offset-2" onClick={() => (setNumber(data.memberNumber ?? ""), a.setError(""), setOpen("number"))}>
                  {data.memberNumber ? "Corregir número" : "Asignar número"}
                </button>
              </span>
            ),
          },
          { label: "Categoría", value: shown(data.categoryLabel, "A confirmar") },
          { label: "Fecha de ingreso", value: shown(day(data.since), "No disponible") },
          { label: "Estado", value: data.statusLabel },
          { label: "Acta", value: shown(data.minutesReference) },
          { label: "Sala", value: shown(data.room) },
          { label: "Origen", value: data.originLabel },
          { label: "Legajo digital", value: data.legajoLabel },
          { label: "Admisión", value: data.admission },
          ...(data.previousNumbers.length ? [{ label: "Números anteriores", value: `${data.previousNumbers.join(", ")} (reservados)` }] : []),
        ]}
      />
      {differs && (
        <p className="!rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">
          Declarado por la persona: <b>{data.declaredNumber}</b> · Registro institucional: <b>{data.memberNumber}</b>. Queda el institucional salvo que lo corrijas.
        </p>
      )}
      <Dialog open={open === "edit"} onClose={() => setOpen(null)} title="Membresía" description={SENSITIVE} confirmLabel={a.pending ? "Guardando…" : "Guardar"} confirmDisabled={a.pending} onConfirm={() => a.run(() => saveMembership(id, form), () => setOpen(null))} wide>
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Select id="m-category" label="Categoría" optional placeholder="A confirmar" options={categories} value={form.category} onChange={set("category")} />
          <Select id="m-status" label="Estado" options={statuses} value={form.status} onChange={set("status")} />
          <TextField id="m-since" type="date" label="Fecha de ingreso original" optional max={today()} hint="Vacío si no está disponible." value={form.since} onChange={set("since")} />
          <TextField id="m-minutes" label="Referencia del acta" optional value={form.minutesReference} onChange={set("minutesReference")} maxLength={200} />
          <TextField id="m-room" label="Sala" optional value={form.room} onChange={set("room")} maxLength={60} />
        </div>
      </Dialog>
      <Dialog
        open={open === "number"}
        onClose={() => setOpen(null)}
        title={data.memberNumber ? "Corregir número de socio" : "Asignar número de socio"}
        description={`${SENSITIVE} La cuenta del socio no cambia. El número anterior queda reservado: no se le asigna a otra persona.`}
        confirmLabel={a.pending ? "Guardando…" : "Confirmar número"}
        confirmDisabled={a.pending || !number.trim()}
        onConfirm={() => a.run(() => saveMemberNumber(id, number), () => setOpen(null))}
      >
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <TextField id="m-number" label="Número de socio" autoComplete="off" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={30} />
      </Dialog>
    </Block>
  );
}

// ---------- Cuenta digital ----------

export type Access = {
  state: "none" | "pending_activation" | "active" | "disabled";
  missing: "dni" | "email" | null;
  destination: string | null;
  emailShared: boolean;
  lastSentAt: string | null;
  link: "live" | "expired" | "used" | "revoked" | null;
  linkExpiresAt: string | null;
  activatedAt: string | null;
};

const ACCESS_STATE: Record<Access["state"], { label: string; tone: Tone }> = {
  none: { label: "Sin cuenta digital", tone: "neutral" },
  pending_activation: { label: "Activación pendiente", tone: "warning" },
  active: { label: "Cuenta activa", tone: "success" },
  disabled: { label: "Cuenta bloqueada", tone: "error" },
};

/**
 * Sin cuenta → Enviar invitación → Activación pendiente → Cuenta activa. The person creates their
 * own password from the email; the administration never sees or sets it.
 */
export function AccountBlock({ id, access }: { id: string; access: Access }) {
  const a = useBlockAction();
  const [confirming, setConfirming] = useState(false);
  const open = access.state === "none" || access.state === "pending_activation";
  const resend = access.state === "pending_activation";
  const canSend = open && !access.missing && !!access.destination;
  const link = {
    live: `Vigente hasta el ${access.linkExpiresAt}`,
    expired: `Venció el ${access.linkExpiresAt}`,
    revoked: "Sin link vigente",
    used: "Ya se usó",
  };
  return (
    <Block title="Cuenta digital" notice={a.notice}>
      <StatusBadge tone={ACCESS_STATE[access.state].tone}>{ACCESS_STATE[access.state].label}</StatusBadge>
      {access.state === "none" && <p className="text-small text-text-muted">El socio está en el padrón, pero todavía no tiene acceso a su espacio en la web.</p>}
      {access.state === "pending_activation" && (
        <DetailList
          items={[
            { label: "Último envío", value: shown(access.lastSentAt, "Sin envíos registrados") },
            { label: "Enviada a", value: shown(access.destination) },
            { label: "Link de activación", value: access.link ? link[access.link] : shown(null, "Sin link") },
          ]}
        />
      )}
      {access.state === "active" && (
        <>
          {access.activatedAt && <DetailList items={[{ label: "Activada", value: access.activatedAt }]} />}
          <p className="text-small text-text-muted">Ingresa con su DNI y su contraseña. Si la olvida, la recupera desde «Olvidé mi contraseña» en el ingreso: la administración no ve ni define contraseñas.</p>
        </>
      )}
      {access.state === "disabled" && <p className="text-small text-text-muted">No puede ingresar a su espacio.</p>}

      {a.error && !confirming && <Alert tone="error" live>{a.error}</Alert>}
      {open && access.missing === "dni" && (
        <div className="space-y-2 !rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">
          <p>Para habilitar el acceso, primero completá y verificá el DNI: es con lo que va a ingresar.</p>
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => requestEditor("dni")}>
            Editar datos personales
          </button>
        </div>
      )}
      {open && access.missing === "email" && (
        <div className="space-y-2 !rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">
          <p>Para habilitar el acceso, primero completá un email de contacto: ahí le llega el link.</p>
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => requestEditor("contact")}>
            Editar contacto
          </button>
        </div>
      )}
      {canSend && access.emailShared && (
        <p className="!rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">Ese email también figura en otro registro del padrón. Confirmá con la persona que es el suyo antes de enviar.</p>
      )}
      {canSend && (
        <Button shape="admin" variant="secondary" full onClick={() => (a.setError(""), setConfirming(true))}>
          <MailPlus aria-hidden className="size-4" strokeWidth={1.5} /> {resend ? "Reenviar activación" : "Enviar invitación de activación"}
        </Button>
      )}
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={resend ? "Reenviar activación" : "Enviar invitación de activación"}
        confirmLabel={a.pending ? "Enviando…" : resend ? "Reenviar activación" : "Enviar activación"}
        confirmDisabled={a.pending}
        onConfirm={() => a.run(() => invite(id, access.emailShared), () => setConfirming(false))}
      >
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <p className="text-body [overflow-wrap:anywhere]">
          Vas a enviar una invitación a <strong>{access.destination}</strong> para que esta persona cree su contraseña y active su acceso.
        </p>
        {resend && <p className="text-small text-text-muted">El link anterior deja de funcionar.</p>}
        {access.emailShared && <p className="!rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">Ese email también figura en otro registro del padrón. Enviá solo si confirmaste con la persona que es el suyo.</p>}
      </Dialog>
    </Block>
  );
}

// ---------- F. Cuota ----------

export function FeeBlock({ id, data }: { id: string; data: { feeEnrollmentDate: string | null; paymentMethod: string | null } }) {
  const a = useBlockAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ feeEnrollmentDate: data.feeEnrollmentDate ?? "", paymentMethod: data.paymentMethod ?? "" });
  return (
    <Block title="Administración de cuota" onEdit={() => (setForm({ feeEnrollmentDate: data.feeEnrollmentDate ?? "", paymentMethod: data.paymentMethod ?? "" }), a.setError(""), setOpen(true))} notice={a.notice}>
      <DetailList
        items={[
          { label: "Alta en la cuota", value: shown(day(data.feeEnrollmentDate)) },
          { label: "Medio de pago habitual", value: shown(data.paymentMethod) },
        ]}
      />
      <p className="text-small text-text-muted">Datos administrativos. Los pagos y saldos se van a registrar en la etapa de finanzas.</p>
      <Dialog open={open} onClose={() => setOpen(false)} title="Administración de cuota" confirmLabel={a.pending ? "Guardando…" : "Guardar"} confirmDisabled={a.pending} onConfirm={() => a.run(() => saveFee(id, form), () => setOpen(false))}>
        {a.error && <Alert tone="error" live>{a.error}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="f-date" type="date" label="Alta en la cuota" optional max={today()} value={form.feeEnrollmentDate} onChange={(e) => setForm((f) => ({ ...f, feeEnrollmentDate: e.target.value }))} />
          <TextField id="f-method" label="Medio de pago habitual" optional value={form.paymentMethod} onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))} maxLength={60} />
        </div>
      </Dialog>
    </Block>
  );
}

// ---------- G. Observaciones ----------

export function NotesBlock({ id, notes }: { id: string; notes: { id: string; body: string; at: string; author: string }[] }) {
  const a = useBlockAction();
  const [draft, setDraft] = useState("");
  return (
    <Block title="Observaciones internas" notice={a.notice}>
      <p className="text-small text-text-muted">Solo para la administración. No registres datos de salud.</p>
      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="!rounded-control bg-surface-sunken/60 px-3 py-2">
              <p className="text-small whitespace-pre-line [overflow-wrap:anywhere]">{n.body}</p>
              <p className="text-xs text-text-muted">
                {n.author} · {n.at}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-text-muted">Todavía no hay observaciones.</p>
      )}
      {a.error && <Alert tone="error" live>{a.error}</Alert>}
      <Textarea id="n-body" label="Nueva observación" rows={3} maxLength={2000} value={draft} onChange={(e) => setDraft(e.target.value)} />
      <Button shape="admin" variant="secondary" disabled={!draft.trim() || a.pending} loading={a.pending} loadingLabel="Guardando…" onClick={() => a.run(() => saveNote(id, draft), () => setDraft(""))}>
        Agregar observación
      </Button>
    </Block>
  );
}
