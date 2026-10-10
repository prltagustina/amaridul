import { requireAdmin } from "@/server/auth/session";
import { assertDemo, readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { auditEntries } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { AdminPageHeader } from "../../ui";

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader title="Auditoría" description="Registro de acciones de la administración. Solo lectura: no se puede editar ni borrar." />
      <ListStateView state={state} emptyTitle="Sin registros" emptyDescription="Las acciones de la administración aparecen acá.">
        <DataList
          caption="Registro de auditoría"
          rows={auditEntries}
          rowKey={(r) => r.at + r.action}
          columns={[
            { key: "action", header: "Acción", primary: true, render: (r) => r.action },
            { key: "entity", header: "Referencia", render: (r) => <span className="font-mono text-[13px]">{r.entity}</span> },
            { key: "actor", header: "Usuario", render: (r) => r.actor },
            { key: "at", header: "Fecha", render: (r) => <span className="tabular-nums">{r.at}</span> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/auditoria" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
