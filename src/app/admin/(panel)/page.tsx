import Link from "next/link";
import { ArrowRight, Boxes, ClipboardCheck, Inbox, Users } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { isDemoEnabled } from "@/lib/demo";
import { Card, DevTag } from "@/components/ui/display";
import { admissions, auditEntries, lots, members, preAdmissions } from "@/demo/fixtures";
import { AdminPageHeader } from "../ui";

export default async function AdminHomePage() {
  const { user } = await requireAdmin();

  if (!isDemoEnabled()) {
    return (
      <>
        <AdminPageHeader title="Panel" />
        <p className="text-body text-text-muted">Las secciones de preadmisiones, admisiones y padrón se incorporan en la Fase 1.</p>
      </>
    );
  }

  const pending = [
    {
      href: "/admin/preadmisiones",
      icon: Inbox,
      count: preAdmissions.filter((p) => p.status === "recibida").length,
      label: "preadmisiones nuevas para revisar",
    },
    {
      href: "/admin/admisiones",
      icon: ClipboardCheck,
      count: admissions.filter((a) => a.status === "recibida").length,
      label: "solicitudes formales para elevar a Comisión",
    },
    {
      href: "/admin/admisiones/adm-2026-0001",
      icon: ClipboardCheck,
      count: admissions.filter((a) => a.status === "comision").length,
      label: "decisiones de Comisión para registrar",
    },
    {
      href: "/admin/socios",
      icon: Users,
      count: members.filter((m) => m.web === "Activación pendiente").length,
      label: "socios con activación pendiente",
    },
    {
      href: "/admin/lotes",
      icon: Boxes,
      count: lots.filter((l) => !l.hasCertificate && l.status === "publicado").length,
      label: "lotes publicados sin certificado",
    },
  ];

  return (
    <>
      <AdminPageHeader eyebrow="Inicio" title={`Hola, ${user.name?.split(" ")[0] || "equipo"}`} description="Lo que necesita tu atención hoy." />
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
          <ul className="divide-y divide-border">
            {auditEntries.slice(0, 5).map((e) => (
              <li key={e.at + e.action} className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-base">
                  {e.action} <span className="text-text-muted">· {e.entity}</span>
                </span>
                <span className="text-small text-text-muted tabular-nums">{e.at}</span>
              </li>
            ))}
          </ul>
        </Card>
        <DevTag>Datos ficticios</DevTag>
      </section>
    </>
  );
}
