import { requireAdmin } from "@/server/auth/session";
import { assertDemo, readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { members } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { memberStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

export default async function SociosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader title="Socios" description="Padrón de socios admitidos por la Comisión Directiva." />
      <ListStateView state={state} emptyTitle="Todavía no hay socios" emptyDescription="Aparecen cuando se registra una admisión aprobada.">
        <DataList
          caption="Padrón de socios"
          rows={members}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/socios/${r.id}`}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (r) => r.name },
            { key: "number", header: "N.º de socio", render: (r) => <span className="font-mono text-[13px]">{r.number}</span> },
            { key: "cat", header: "Categoría", render: (r) => r.category },
            { key: "since", header: "Desde", render: (r) => r.since },
            { key: "web", header: "Cuenta web", render: (r) => r.web },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={memberStatus[r.status].tone}>{memberStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/socios" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
