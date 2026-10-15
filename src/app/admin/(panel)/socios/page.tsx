import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { listMembers } from "@/server/members";
import { readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { categoryOptions } from "@/demo/content";
import { LIST_STATES, ListStateView } from "../../list-state";
import { memberStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

export default async function SociosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  const rows = await listMembers(await getDb());
  return (
    <>
      <AdminPageHeader title="Socios" description="Padrón de socios admitidos por la Comisión Directiva." />
      <ListStateView state={rows.length ? state : "empty"} emptyTitle="Todavía no hay socios" emptyDescription="Aparecen cuando se registra una admisión aprobada.">
        <DataList
          caption="Padrón de socios"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/socios/${r.id}`}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (r) => r.name },
            { key: "number", header: "N.º de socio", render: (r) => <span className="font-mono text-[13px]">{r.memberNumber}</span> },
            { key: "cat", header: "Categoría", render: (r) => categoryOptions.find((c) => c.value === r.category)?.label ?? r.category },
            { key: "since", header: "Desde", render: (r) => (r.since ? r.since.split("-").reverse().join("/") : "—") },
            { key: "web", header: "Cuenta web", render: (r) => (r.accountStatus === "active" ? "Activa" : r.accountStatus === "pending_activation" ? "Activación pendiente" : "Deshabilitada") },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={memberStatus[r.status].tone}>{memberStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/socios" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
