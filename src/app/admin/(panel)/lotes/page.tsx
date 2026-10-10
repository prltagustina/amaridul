import { FileBadge, Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { assertDemo, readState } from "@/lib/demo";
import { LinkButton } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { lots } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { lotStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

export default async function LotesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader
        title="Lotes"
        description="Lotes publicados en la trazabilidad del portal de socios, con su análisis y certificado."
        actions={
          <LinkButton href="/admin/lotes/nuevo" shape="admin">
            <Plus aria-hidden className="size-4" strokeWidth={1.5} /> Nuevo lote
          </LinkButton>
        }
      />
      <ListStateView state={state} emptyTitle="Todavía no hay lotes" emptyDescription="Creá el primero con “Nuevo lote”.">
        <DataList
          caption="Lotes"
          rows={lots}
          rowKey={(r) => r.code}
          rowHref={(r) => `/admin/lotes/${r.code.toLowerCase()}`}
          columns={[
            { key: "code", header: "Lote", primary: true, render: (r) => <span className="font-mono text-[13px]">{r.code}</span> },
            { key: "product", header: "Producto", render: (r) => r.product },
            { key: "harvested", header: "Cosecha", render: (r) => r.harvested },
            {
              key: "cert",
              header: "Certificado",
              render: (r) =>
                r.hasCertificate ? (
                  <span className="inline-flex items-center gap-1.5 text-success-fg">
                    <FileBadge aria-hidden className="size-4" strokeWidth={1.5} /> Cargado
                  </span>
                ) : (
                  <span className="text-warning-fg">Pendiente</span>
                ),
            },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={lotStatus[r.status].tone}>{lotStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/lotes" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
