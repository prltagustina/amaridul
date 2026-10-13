import { requireAdmin } from "@/server/auth/session";
import { readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { admissions } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { admissionStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

export default async function AdmisionesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader title="Admisiones" description="Solicitudes formales de admisión. La decisión final la toma la Comisión Directiva y se registra acá." />
      <ListStateView state={state} emptyTitle="No hay solicitudes formales" emptyDescription="Aparecen cuando una persona invitada empieza su solicitud.">
        <DataList
          caption="Solicitudes formales de admisión"
          rows={admissions}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/admisiones/${r.id}`}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (r) => r.name },
            { key: "ref", header: "Referencia", render: (r) => <span className="font-mono text-[13px]">{r.reference}</span> },
            { key: "cat", header: "Categoría", render: (r) => r.category },
            {
              key: "progress",
              header: "Avance",
              render: (r) => (
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-1.5 w-16 overflow-hidden !rounded-full bg-surface-sunken">
                    <span className="block h-full bg-accent" style={{ width: `${(r.progress / 9) * 100}%` }} />
                  </span>
                  <span className="tabular-nums">{r.progress}/9</span>
                </span>
              ),
            },
            { key: "date", header: "Fecha", render: (r) => r.date },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={admissionStatus[r.status].tone}>{admissionStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/admisiones" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
