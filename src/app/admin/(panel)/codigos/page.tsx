import { requireAdmin } from "@/server/auth/session";
import { readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { Alert, StatusBadge } from "@/components/ui/display";
import { packageCodes } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { AdminPageHeader } from "../../ui";

export default async function CodigosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader title="Códigos de envase" description="Códigos impresos en los envases para consultar la trazabilidad." />
      <Alert tone="info" className="mb-6">
        Cada código es general para todo el lote: no identifica a ningún socio ni registra quién lo consulta.
      </Alert>
      <ListStateView state={state} emptyTitle="Todavía no hay códigos" emptyDescription="Se generan al crear un lote.">
        <DataList
          caption="Códigos de envase"
          rows={packageCodes}
          rowKey={(r) => r.code}
          columns={[
            { key: "code", header: "Código", primary: true, render: (r) => <span className="font-mono text-[13px]">{r.code}</span> },
            { key: "lot", header: "Lote", render: (r) => <span className="font-mono text-[13px]">{r.lot}</span> },
            { key: "created", header: "Creado", render: (r) => r.created },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={r.status === "activo" ? "success" : "neutral"}>{r.status === "activo" ? "Activo" : "Inactivo"}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/codigos" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
