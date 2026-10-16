import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getExistingMemberRequest } from "@/server/existing-members";
import { getMember } from "@/server/members";
import { existingMemberWritesEnabled } from "@/server/env";
import { DetailList } from "@/components/ui/data-list";
import { Card, StatusBadge } from "@/components/ui/display";
import { categoryOptions } from "@/demo/content";
import { existingRequestStatus } from "../../../status";
import { AdminPageHeader } from "../../../ui";
import ExistingMemberActions from "./actions-panel";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const account = { none: "sin cuenta digital todavía", pending_activation: "activación pendiente", active: "cuenta activa", disabled: "cuenta deshabilitada" } as const;

export default async function SocioExistentePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const rings = getKeyrings();
  const detail = await getExistingMemberRequest(db, rings, id);
  if (!detail) notFound();
  const { request: r, match, linkedMember, preAdmissionReference } = detail;
  const found = match.member ? await getMember(db, rings, match.member.id) : null;
  const s = existingRequestStatus[r.status];

  const warnings: React.ReactNode[] = [];
  if (match.openAdmission) warnings.push(<>Tiene una solicitud de admisión en curso ({match.openAdmission}). Resolvela antes de registrar.</>);
  if (match.otherAccount) warnings.push(<>La persona ya tiene una cuenta que no es de socio.</>);
  if (match.declaredNumberOwner)
    warnings.push(
      <>
        El número declarado ({r.declaredMemberNumber}) pertenece a{" "}
        <Link className="!text-forest underline" href={`/admin/socios/${match.declaredNumberOwner.id}`}>
          {match.declaredNumberOwner.name}
        </Link>
        .
      </>,
    );
  for (const d of match.duplicates)
    warnings.push(
      <>
        Otra solicitud con el mismo DNI:{" "}
        <Link className="!text-forest underline" href={`/admin/socios-existentes/${d.id}`}>
          {d.reference}
        </Link>{" "}
        ({existingRequestStatus[d.status].label.toLowerCase()}).
      </>,
    );
  if (match.emailConflicts.length)
    warnings.push(<>El email también figura en: {match.emailConflicts.map((c) => (c.memberNumber ? `${c.name} (${c.memberNumber})` : c.name)).join(", ")}. Confirmá con la persona cuál es su email.</>);

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/socios-existentes", label: "Socios existentes" }}
        eyebrow={r.reference}
        title={r.fullName}
        description={r.submittedAt ? `Datos recibidos el ${dateFormat.format(r.submittedAt)}` : "Todavía no completó sus datos"}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Datos enviados</h2>
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            </div>
            <DetailList
              items={[
                { label: "Persona", value: r.fullName },
                { label: "DNI", value: r.dniMasked ?? "—" },
                { label: "Email", value: r.email },
                { label: "Fecha de nacimiento", value: day(r.birthDate) },
                { label: "Domicilio", value: r.address ?? "—" },
                { label: "Localidad", value: r.locality ?? "—" },
                { label: "Provincia", value: r.province ?? "—" },
                { label: "Código postal", value: r.postalCode ?? "—" },
                { label: "Número declarado", value: r.declaredMemberNumber ?? "No lo indicó" },
                { label: "Origen", value: preAdmissionReference ? `Desde la preadmisión ${preAdmissionReference}` : "Formulario «Ya soy socio/a»" },
              ]}
            />
            {r.adminNotes && <p className="text-small text-text-muted">Notas internas: {r.adminNotes}</p>}
          </Card>

          <Card className="space-y-4">
            <h2 className="text-h3">En el sistema</h2>
            {linkedMember ? (
              <p className="flex items-start gap-2 text-base">
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} />
                <span>
                  Vinculado con el socio{" "}
                  <Link className="!text-forest underline" href={`/admin/socios/${linkedMember.id}`}>
                    {linkedMember.memberNumber ?? "ver ficha"}
                  </Link>{" "}
                  ({account[linkedMember.accountStatus ?? "none"]}).
                </span>
              </p>
            ) : r.status === "rejected" ? (
              <p className="text-base text-text-muted">Solicitud cerrada. El DNI, la fecha de nacimiento y el domicilio ya no se conservan.</p>
            ) : !r.dniMasked ? (
              <p className="text-base text-text-muted">Sin DNI todavía: la coincidencia se busca cuando la persona complete sus datos.</p>
            ) : match.member ? (
              <p className="flex items-start gap-2 text-base">
                <CheckCircle2 aria-hidden className="mt-0.5 size-5 shrink-0 text-forest" strokeWidth={1.5} />
                <span>
                  Ya hay un socio con este DNI:{" "}
                  <Link className="!text-forest underline" href={`/admin/socios/${match.member.id}`}>
                    {match.member.name} · {match.member.memberNumber ?? "número a confirmar"}
                  </Link>{" "}
                  ({account[match.member.accountStatus]}). Vinculá la solicitud con ese socio: no se crea otro.
                </span>
              </p>
            ) : (
              <p className="text-base text-text-muted">No hay un socio con este DNI en el sistema. Si figura en el registro de la asociación, registralo como socio existente.</p>
            )}
            {warnings.length > 0 && (
              <ul className="space-y-2">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2 !rounded-control bg-warning-bg px-3 py-2.5 text-small text-warning-fg">
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <ExistingMemberActions
          id={r.id}
          status={r.status}
          declaredNumber={r.declaredMemberNumber}
          sentEmail={r.email}
          member={
            found
              ? { number: found.memberNumber, category: found.category ?? "", since: found.since ?? "", minutesReference: found.minutesReference ?? "", status: found.status, accountStatus: found.accountStatus ?? "none", email: found.email }
              : null
          }
          blocked={!!(match.openAdmission || match.otherAccount)}
          writesEnabled={existingMemberWritesEnabled()}
          categories={categoryOptions.map((c) => ({ value: c.value, label: c.label }))}
        />
      </div>
    </>
  );
}
