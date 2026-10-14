"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { Alert, EmptyState, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { AdminPageHeader } from "../../ui";
import { createProductAction, updateProductAction, type ProductFormValues } from "./actions";

export type ProductRow = { id: string; name: string; type: string; typeLabel: string; description: string | null; status: "activo" | "inactivo"; updatedAt: string };

const EMPTY: ProductFormValues = { name: "", type: "", description: "", status: "activo" };
const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export default function ProductsManager({ rows, types }: { rows: ProductRow[]; types: { value: string; label: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();

  const open = (row: ProductRow | "new") => {
    setEditing(row);
    setValues(row === "new" ? EMPTY : { name: row.name, type: row.type, description: row.description ?? "", status: row.status });
    setErrors({});
    setFormError("");
  };
  const set = (k: keyof ProductFormValues) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: e.target.value }));

  const save = () =>
    startTransition(async () => {
      const isNew = editing === "new";
      const r = isNew ? await createProductAction(values) : await updateProductAction((editing as ProductRow).id, values);
      if (!r.ok) {
        setErrors(r.fieldErrors ?? {});
        setFormError(r.error);
        return;
      }
      setEditing(null);
      setNotice(isNew ? `Producto «${values.name.trim()}» creado.` : `Cambios en «${values.name.trim()}» guardados.`);
      router.refresh();
    });

  return (
    <>
      <AdminPageHeader
        title="Productos"
        description="Catálogo de productos de la asociación. Más adelante cada producto va a agrupar sus lotes."
        actions={
          <Button shape="admin" onClick={() => open("new")}>
            <Plus aria-hidden className="size-4" strokeWidth={1.5} /> Nuevo producto
          </Button>
        }
      />
      {notice && (
        <Alert tone="success" live className="mb-4">
          {notice}
        </Alert>
      )}
      {rows.length ? (
        <DataList
          caption="Productos"
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "name", header: "Producto", primary: true, render: (r) => r.name },
            { key: "type", header: "Tipo", render: (r) => r.typeLabel },
            { key: "description", header: "Descripción", render: (r) => <span className="line-clamp-2 text-text-muted">{r.description ?? "—"}</span> },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={r.status === "activo" ? "success" : "neutral"}>{r.status === "activo" ? "Activo" : "Inactivo"}</StatusBadge> },
            {
              key: "edit",
              header: "Acciones",
              render: (r) => (
                <Button variant="secondary" shape="admin" className="min-h-10 px-4" onClick={() => open(r)} aria-label={`Editar ${r.name}`}>
                  <Pencil aria-hidden className="size-4" strokeWidth={1.5} /> Editar
                </Button>
              ),
            },
          ]}
        />
      ) : (
        <EmptyState
          icon={<Package aria-hidden className="size-8" strokeWidth={1.25} />}
          title="Todavía no hay productos"
          description="Cargá el primero con «Nuevo producto». Después vas a poder editarlo cuando quieras."
        />
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo producto" : "Editar producto"}
        description="Cada cambio queda registrado con fecha y responsable."
        confirmLabel={pending ? "Guardando…" : editing === "new" ? "Crear producto" : "Guardar cambios"}
        confirmDisabled={pending}
        onConfirm={save}
      >
        {formError && <Alert tone="error" live>{formError}</Alert>}
        <TextField id="product-name" label="Nombre" value={values.name} onChange={set("name")} error={errors.name} maxLength={80} autoComplete="off" />
        <Select id="product-type" label="Tipo" placeholder="Elegí un tipo" options={types} value={values.type} onChange={set("type")} error={errors.type} />
        <Textarea id="product-description" label="Descripción" optional value={values.description} onChange={set("description")} error={errors.description} maxLength={500} rows={3} />
        <Select id="product-status" label="Estado" options={STATUS_OPTIONS} value={values.status} onChange={set("status")} error={errors.status} hint="Un producto inactivo deja de ofrecerse, pero conserva su historial." />
      </Dialog>
    </>
  );
}
