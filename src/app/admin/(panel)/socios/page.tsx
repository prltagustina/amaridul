import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { categoryLabel, listRegister } from "@/server/member-profile";
import { DataList } from "@/components/ui/data-list";
import { StatusBadge } from "@/components/ui/display";
import { ListStateView } from "../../list-state";
import { memberStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

const ACCOUNT = {
  none: { label: "Sin cuenta", tone: "neutral" },
  pending_activation: { label: "Pendiente de activación", tone: "warning" },
  active: { label: "Activa", tone: "success" },
  disabled: { label: "Bloqueada", tone: "error" },
} as const;
const LEGAJO = { imported: "Importado", pending_update: "Pendiente de actualizar", updated: "Actualizado" } as const;
const REVIEW = { pendiente: "Revisión pendiente", observada: "Observada", verificada: "Verificada" } as const;
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default async function SociosPage() {
  await requireAdmin();
  const rows = await listRegister(await getDb());
  return (
    <>
      <AdminPageHeader title="Socios" description="Padrón de Amarí Dul: socios admitidos en el sistema y socios históricos. La membresía, la cuenta digital y REPROCANN se muestran por separado." />
      <ListStateView state={rows.length ? "default" : "empty"} emptyTitle="Todavía no hay socios" emptyDescription="Aparecen al aprobar una admisión, al registrar un socio existente o al importar el padrón histórico.">
        <DataList
          caption="Socios"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/socios/${r.id}`}
          columns={[
            { key: "name", header: "Socio", primary: true, render: (r) => r.name },
            { key: "number", header: "N.º", render: (r) => (r.memberNumber ? <span className="font-mono text-[13px]">{r.memberNumber}</span> : <span className="text-text-muted">A confirmar</span>) },
            {
              key: "membership",
              header: "Membresía",
              render: (r) => (
                <span className="flex flex-col gap-1">
                  <span>{categoryLabel(r.category) ?? <span className="text-text-muted">Categoría a confirmar</span>}</span>
                  <StatusBadge tone={memberStatus[r.status].tone}>{memberStatus[r.status].label}</StatusBadge>
                </span>
              ),
            },
            { key: "room", header: "Sala", render: (r) => r.room ?? <span className="text-text-muted">—</span> },
            {
              key: "account",
              header: "Cuenta · legajo",
              render: (r) => (
                <span className="flex flex-col gap-1">
                  <StatusBadge tone={ACCOUNT[r.account].tone}>{ACCOUNT[r.account].label}</StatusBadge>
                  <span className="text-xs text-text-muted">{LEGAJO[r.legajo]}</span>
                </span>
              ),
            },
            {
              key: "reprocann",
              header: "Credencial REPROCANN",
              render: (r) => (
                <span className="flex flex-col gap-1">
                  <StatusBadge tone={r.validity.tone}>{r.validity.label}</StatusBadge>
                  <span className="text-xs text-text-muted">
                    {r.expiresOn ? `Vence ${day(r.expiresOn)}` : "Sin vencimiento"}
                    {r.review ? ` · ${REVIEW[r.review]}` : ""}
                  </span>
                </span>
              ),
            },
          ]}
        />
      </ListStateView>
    </>
  );
}
