import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileCheck2, Inbox, UserCheck, Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { countPreAdmissions } from "@/server/pre-admissions";
import { countAdmissions } from "@/server/admissions";
import { listMembers } from "@/server/members";
import { countExistingMemberRequests } from "@/server/existing-members";
import { listAuditRows } from "@/server/audit/view";
import { countDocumentsToReview } from "@/server/reprocann-files";
import { Card } from "@/components/ui/display";
import { adminGreeting } from "@/lib/admin-greeting";
import { AdminPageHeader } from "../ui";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export default async function AdminHomePage() {
  const { user } = await requireAdmin();
  const db = await getDb();
  const [newPreAdmissions, existingToVerify, toElevate, inCommission, memberRows, activity, credentialsToReview] = await Promise.all([
    countPreAdmissions(db, ["recibida"]),
    countExistingMemberRequests(db, ["pending_verification", "needs_review"]),
    countAdmissions(db, ["recibida"]),
    countAdmissions(db, ["comision"]),
    listMembers(db),
    listAuditRows(db, 5),
    countDocumentsToReview(db),
  ]);

  const pending = [
    {
      href: "/admin/preadmisiones",
      icon: Inbox,
      count: newPreAdmissions,
      label: "preadmisiones nuevas para revisar",
    },
    {
      href: "/admin/socios-existentes",
      icon: UserCheck,
      count: existingToVerify,
      label: "solicitudes de socios existentes por verificar",
    },
    {
      href: "/admin/reprocann",
      icon: FileCheck2,
      count: credentialsToReview,
      label: "credenciales REPROCANN para revisar",
    },
    {
      href: "/admin/admisiones",
      icon: ClipboardCheck,
      count: toElevate,
      label: "solicitudes formales para elevar a Comisión",
    },
    {
      href: "/admin/admisiones",
      icon: ClipboardCheck,
      count: inCommission,
      label: "decisiones de Comisión para registrar",
    },
    {
      href: "/admin/socios",
      icon: Users,
      count: memberRows.filter((m) => m.accountStatus === "pending_activation").length,
      label: "socios con activación pendiente",
    },
  ];

  return (
    <>
      <AdminPageHeader eyebrow="Inicio" title={`Hola, ${adminGreeting(user.name)}`} description="Lo que necesita tu atención hoy." />
      <section aria-labelledby="pendientes" className="space-y-4">
        <h2 id="pendientes" className="text-h2 text-forest">
          Pendientes
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pending.map(({ href, icon: Icon, count, label }) => (
            <li key={label}>
              <Link href={href} className="group flex h-full items-center gap-4 !rounded-card border border-border/80 bg-surface p-5 hover:border-forest/50">
                <span className="flex size-11 shrink-0 items-center justify-center !rounded-full bg-forest-soft text-forest">
                  <Icon aria-hidden className="size-5" strokeWidth={1.5} />
                </span>
                <span className="flex-1">
                  <span className="block text-3xl font-medium leading-none text-forest tabular-nums">{count}</span>
                  <span className="mt-1 block text-small text-text-muted">{label}</span>
                </span>
                <ArrowRight aria-hidden className="size-4 text-forest opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="actividad" className="mt-10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 id="actividad" className="text-h2 text-forest">
            Actividad reciente
          </h2>
          <Link href="/admin/auditoria" className="text-small !text-forest underline underline-offset-4">
            Ver auditoría
          </Link>
        </div>
        <Card padded={false}>
          {activity.length ? (
            <ul className="divide-y divide-border">
              {activity.map((e) => (
                <li key={e.id} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <span className="min-w-0 text-base [overflow-wrap:anywhere]">
                    {e.action}
                    {e.subject && <span className="text-text-muted"> · {e.subject.label}</span>}
                  </span>
                  <span className="shrink-0 text-small text-text-muted tabular-nums">{stamp.format(e.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-small text-text-muted">Todavía no hay actividad registrada.</p>
          )}
        </Card>
      </section>
    </>
  );
}
