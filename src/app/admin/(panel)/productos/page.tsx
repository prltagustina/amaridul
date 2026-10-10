import { Plus } from "lucide-react";
import { requireAdmin } from "@/server/auth/session";
import { assertDemo, readState } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { DevTag, StatusBadge } from "@/components/ui/display";
import { products } from "@/demo/fixtures";
import { LIST_STATES, ListStateView } from "../../list-state";
import { AdminPageHeader } from "../../ui";

export default async function ProductosPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  assertDemo();
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  return (
    <>
      <AdminPageHeader
        title="Productos"
        description="Catálogo de productos con trazabilidad. Cada producto agrupa sus lotes."
        actions={
          <Button shape="admin" disabled title="Demo">
            <Plus aria-hidden className="size-4" strokeWidth={1.5} /> Nuevo producto
          </Button>
        }
      />
      <ListStateView state={state} emptyTitle="Todavía no hay productos">
        <DataList
          caption="Productos"
          rows={products}
          rowKey={(r) => r.id}
          columns={[
            { key: "name", header: "Producto", primary: true, render: (r) => r.name },
            { key: "type", header: "Tipo", render: (r) => r.type },
            { key: "lots", header: "Lotes", render: (r) => <span className="tabular-nums">{r.lots}</span> },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={r.status === "activo" ? "success" : "neutral"}>{r.status === "activo" ? "Activo" : "Inactivo"}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <p className="mt-4">
        <DevTag>Alta y edición de productos pendientes</DevTag>
      </p>
      <DevStateBar path="/admin/productos" states={LIST_STATES} current={state} label="Lista" />
    </>
  );
}
