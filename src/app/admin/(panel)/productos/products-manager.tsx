"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataList } from "@/components/ui/data-list";
import { Alert, Card, EmptyState, StatusBadge } from "@/components/ui/display";
import { Dialog } from "@/components/ui/dialog";
import { Select, TextField, Textarea } from "@/components/ui/field";
import { AdminPageHeader } from "../../ui";
import { createProductAction, deleteProductAction, renameVarietyAction, updateProductAction, type ProductFormValues } from "./actions";

type Option = { value: string; label: string };
export type ProductRow = {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  varietyId: string;
  varietyLabel: string | null;
  cultivation: string;
  cultivationLabel: string | null;
  chemotype: string;
  chemotypeLabel: string | null;
  cultivatedOn: string;
  description: string | null;
  status: "activo" | "inactivo";
};
export type VarietyRow = { id: string; code: string; name: string | null; label: string };

const EMPTY: ProductFormValues = { name: "", type: "", varietyId: "", cultivation: "", chemotype: "", cultivatedOn: "", description: "", status: "activo" };
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const todayInArgentina = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const STATUS_OPTIONS = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];
const missing = <span className="text-text-muted">Sin cargar</span>;

export default function ProductsManager({ rows, varieties, options }: { rows: ProductRow[]; varieties: VarietyRow[]; options: { types: Option[]; cultivation: Option[]; chemotypes: Option[] } }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProductRow | "new" | null>(null);
  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [formError, setFormError] = useState("");
  const [variety, setVariety] = useState<VarietyRow | null>(null);
  const [varietyName, setVarietyName] = useState("");
  const [varietyError, setVarietyError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<ProductRow | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [pending, startTransition] = useTransition();

  const open = (row: ProductRow | "new") => {
    setEditing(row);
    setValues(
      row === "new"
        ? EMPTY
        : { name: row.name, type: row.type, varietyId: row.varietyId, cultivation: row.cultivation, chemotype: row.chemotype, cultivatedOn: row.cultivatedOn, description: row.description ?? "", status: row.status },
    );
    setErrors({});
    setFormError("");
  };
  const set = (k: keyof ProductFormValues) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    // A corrected field stops showing its error right away.
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

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

  const remove = () =>
    startTransition(async () => {
      const row = deleting!;
      const r = await deleteProductAction(row.id);
      if (!r.ok) {
        setDeleteError(r.error);
        return;
      }
      setDeleting(null);
      setNotice(`Producto «${row.name}» eliminado.`);
      router.refresh();
    });

  const openVariety = (v: VarietyRow) => {
    setVariety(v);
    setVarietyName(v.name ?? "");
    setVarietyError("");
  };
  const saveVariety = () =>
    startTransition(async () => {
      const v = variety!;
      const r = await renameVarietyAction(v.id, varietyName);
      if (!r.ok) {
        setVarietyError(r.error);
        return;
      }
      setVariety(null);
      setNotice(varietyName.trim() ? `${v.code} ahora se llama «${varietyName.trim()}».` : `${v.code} quedó sin nombre definitivo.`);
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
            { key: "variety", header: "Variedad", render: (r) => r.varietyLabel ?? missing },
            {
              key: "cultivation",
              header: "Cultivo",
              render: (r) => (
                <span className="block">
                  {r.cultivationLabel ?? missing}
                  <span className="block text-xs tabular-nums text-text-muted">{r.cultivatedOn ? formatDate(r.cultivatedOn) : "Fecha sin cargar"}</span>
                </span>
              ),
            },
            { key: "chemotype", header: "Quimiotipo", render: (r) => (r.chemotype ? <span className="tabular-nums">{r.chemotype}</span> : missing) },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={r.status === "activo" ? "success" : "neutral"}>{r.status === "activo" ? "Activo" : "Inactivo"}</StatusBadge> },
            {
              key: "edit",
              header: "Acciones",
              render: (r) => (
                // Icon buttons keep the row narrow enough for every column on a laptop screen.
                <div className="flex gap-1.5 whitespace-nowrap">
                  <Button variant="secondary" shape="admin" className="min-h-9 min-w-9 px-0" onClick={() => open(r)} aria-label={`Editar ${r.name}`} title="Editar">
                    <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="danger"
                    shape="admin"
                    className="min-h-9 min-w-9 px-0"
                    title="Eliminar"
                    onClick={() => {
                      setDeleting(r);
                      setDeleteError("");
                    }}
                    aria-label={`Eliminar ${r.name}`}
                  >
                    <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                  </Button>
                </div>
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

      <section aria-labelledby="variedades" className="mt-10 space-y-3">
        <div className="space-y-1">
          <h2 id="variedades" className="text-h3 text-forest">
            Variedades
          </h2>
          <p className="text-small text-text-muted">G1 a G4 se usan desde ya. El nombre definitivo de cada una se puede cargar cuando esté decidido; los productos se actualizan solos.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {varieties.map((v) => (
            <Card key={v.id} className="flex flex-col items-start gap-1 !p-4">
              <p className="font-medium tabular-nums text-forest">{v.code}</p>
              <p className="text-small text-text-muted [overflow-wrap:anywhere]">{v.name ?? "Nombre a definir"}</p>
              <Button variant="ghost" shape="admin" className="-ml-1 min-h-9" onClick={() => openVariety(v)} aria-label={`Definir el nombre de ${v.code}`}>
                <Pencil aria-hidden className="size-4" strokeWidth={1.5} /> {v.name ? "Cambiar" : "Definir"}
              </Button>
            </Card>
          ))}
        </div>
      </section>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo producto" : "Editar producto"}
        description="Cada cambio queda registrado con fecha y responsable."
        confirmLabel={pending ? "Guardando…" : editing === "new" ? "Crear producto" : "Guardar cambios"}
        confirmDisabled={pending}
        onConfirm={save}
        wide
      >
        {formError && <Alert tone="error" live>{formError}</Alert>}
        <TextField id="product-name" label="Nombre" value={values.name} onChange={set("name")} error={errors.name} maxLength={80} autoComplete="off" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Select id="product-type" label="Tipo" placeholder="Elegí un tipo" options={options.types} value={values.type} onChange={set("type")} error={errors.type} />
          <Select id="product-variety" label="Variedad" placeholder="Elegí una variedad" options={varieties.map((v) => ({ value: v.id, label: v.label }))} value={values.varietyId} onChange={set("varietyId")} error={errors.varietyId} />
          <Select id="product-cultivation" label="Modalidad de cultivo" placeholder="Elegí la modalidad" options={options.cultivation} value={values.cultivation} onChange={set("cultivation")} error={errors.cultivation} />
          <Select id="product-chemotype" label="Quimiotipo" placeholder="Elegí el quimiotipo" options={options.chemotypes} value={values.chemotype} onChange={set("chemotype")} error={errors.chemotype} />
          <TextField id="product-cultivated-on" type="date" label="Fecha de cultivo" value={values.cultivatedOn} onChange={set("cultivatedOn")} error={errors.cultivatedOn} max={todayInArgentina()} />
        </div>
        <Textarea id="product-description" label="Descripción" optional value={values.description} onChange={set("description")} error={errors.description} maxLength={500} rows={3} />
        <Select id="product-status" label="Estado" options={STATUS_OPTIONS} value={values.status} onChange={set("status")} error={errors.status} hint="Un producto inactivo deja de ofrecerse, pero conserva su historial." />
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Eliminar producto"
        description={deleting ? `«${deleting.name}» se borra del catálogo. Queda registrado quién lo eliminó y con qué datos.` : ""}
        confirmLabel={pending ? "Eliminando…" : "Eliminar producto"}
        confirmVariant="danger"
        confirmDisabled={pending}
        onConfirm={remove}
      >
        {deleteError ? <Alert tone="error" live>{deleteError}</Alert> : <p className="text-body">Si solo dejó de ofrecerse, conviene marcarlo «Inactivo»: así conserva su historial.</p>}
      </Dialog>

      <Dialog
        open={variety !== null}
        onClose={() => setVariety(null)}
        title={variety ? `Nombre de ${variety.code}` : ""}
        description="El código se mantiene. Si dejás el nombre vacío, vuelve a «Nombre a definir»."
        confirmLabel={pending ? "Guardando…" : "Guardar nombre"}
        confirmDisabled={pending}
        onConfirm={saveVariety}
      >
        <TextField id="variety-name" label="Nombre definitivo" optional value={varietyName} onChange={(e) => setVarietyName(e.target.value)} error={varietyError} maxLength={60} autoComplete="off" />
      </Dialog>
    </>
  );
}
