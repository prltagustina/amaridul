import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { listExistingMemberRequests, type ExistingMemberRequestStatus } from "@/server/existing-members";
import { readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { StatusBadge } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { Filters, ListStateView } from "../../list-state";
import { existingRequestStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

type Search = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["todas", "pending_verification", "needs_review", "awaiting_data", "matched", "completed", "rejected"] as const;

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export default async function SociosExistentesPage({ searchParams }: { searchParams: Search }) {
  await requireAdmin();
  const filter = await readState(searchParams, FILTERS, "filtro");
  const rows = await listExistingMemberRequests(await getDb(), getKeyrings(), filter === "todas" ? undefined : (filter as ExistingMemberRequestStatus));

  return (
    <>
      <AdminPageHeader
        title="Socios existentes"
        description="Personas que ya eran socias antes del sistema y actualizan su legajo. No pasan por una nueva admisión: verificá cada una con el registro de la asociación."
      />
      <Filters>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "todas" ? "/admin/socios-existentes" : `/admin/socios-existentes?filtro=${f}`}
            aria-current={f === filter ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center !rounded-full border px-3.5 text-small",
              f === filter ? "border-forest bg-forest !text-white" : "border-border-strong/50 !text-foreground hover:border-forest",
            )}
          >
            {f === "todas" ? "Todas" : existingRequestStatus[f].label}
          </Link>
        ))}
      </Filters>
      <ListStateView state={rows.length ? "default" : "empty"} emptyTitle="No hay solicitudes" emptyDescription="Cuando un socio complete «Ya soy socio/a» en Sumate, aparece acá.">
        <DataList
          caption="Socios existentes"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/socios-existentes/${r.id}`}
          columns={[
            { key: "name", header: "Persona", primary: true, render: (r) => r.fullName },
            { key: "dni", header: "DNI", render: (r) => <span className="tabular-nums">{r.dniMasked ?? "—"}</span> },
            { key: "email", header: "Email", render: (r) => <span className="[overflow-wrap:anywhere]">{r.email}</span> },
            { key: "number", header: "N.º declarado", render: (r) => r.declaredMemberNumber ?? "—" },
            { key: "date", header: "Fecha", render: (r) => dateFormat.format(r.submittedAt ?? r.createdAt) },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={existingRequestStatus[r.status].tone}>{existingRequestStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
    </>
  );
}
