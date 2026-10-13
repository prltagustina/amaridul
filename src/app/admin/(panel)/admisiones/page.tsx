import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { listAdmissions } from "@/server/admissions";
import { readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { categoryOptions } from "@/demo/content";
import { LIST_STATES, ListStateView } from "../../list-state";
import { admissionStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });

export default async function AdmisionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  const rows = await listAdmissions(await getDb());
  return (
    <>
      <AdminPageHeader title="Admisiones" description="Solicitudes formales de admisión. La decisión final la toma la Comisión Directiva y se registra acá." />
      <ListStateView state={rows.length ? state : "empty"} emptyTitle="No hay solicitudes formales" emptyDescription="Aparecen cuando una persona invitada envía su solicitud formal.">
        <DataList
          caption="Solicitudes formales de admisión"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/admisiones/${r.id}`}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (r) => `${r.firstNames} ${r.lastNames}` },
            { key: "ref", header: "Referencia", render: (r) => <span className="font-mono text-[13px]">{r.reference}</span> },
            { key: "cat", header: "Categoría", render: (r) => categoryOptions.find((c) => c.value === r.category)?.label ?? r.category },
            { key: "date", header: "Enviada", render: (r) => dateFormat.format(r.submittedAt) },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={admissionStatus[r.status].tone}>{admissionStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/admisiones" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
