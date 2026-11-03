import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { listAuditRows } from "@/server/audit/view";
import { DataList } from "@/components/ui/data-list";
import { ListStateView } from "../../list-state";
import { AdminPageHeader } from "../../ui";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const SHOWN = 100;

export default async function AuditoriaPage() {
  await requireAdmin();
  const rows = await listAuditRows(await getDb(), SHOWN);
  return (
    <>
      <AdminPageHeader
        title="Auditoría"
        description={`Lo que pasa en el sistema: solicitudes, cambios en el padrón, accesos y catálogo. Solo lectura. Para cuidar los datos se muestra qué cambió, no los valores. Últimos ${SHOWN} registros.`}
      />
      <ListStateView state={rows.length ? "default" : "empty"} emptyTitle="Todavía no hay registros" emptyDescription="Las acciones de la administración y de los formularios aparecen acá.">
        <DataList
          caption="Registro de auditoría"
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "action", header: "Acción", primary: true, render: (r) => r.action },
            {
              key: "subject",
              header: "Sobre",
              render: (r) =>
                r.subject?.href ? (
                  <Link href={r.subject.href} className="!text-forest underline underline-offset-2">
                    {r.subject.label}
                  </Link>
                ) : (
                  (r.subject?.label ?? <span className="text-text-muted">—</span>)
                ),
            },
            { key: "actor", header: "Quién", render: (r) => r.actor },
            { key: "detail", header: "Detalle", render: (r) => r.detail ?? <span className="text-text-muted">—</span> },
            { key: "at", header: "Fecha", render: (r) => <span className="tabular-nums whitespace-nowrap">{stamp.format(r.at)}</span> },
          ]}
        />
      </ListStateView>
    </>
  );
}
