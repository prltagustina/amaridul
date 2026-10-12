import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { assertDemo, readState } from "@/lib/demo";
import { DataList } from "@/components/ui/data-list";
import { DevStateBar } from "@/components/ui/dev-state-bar";
import { StatusBadge } from "@/components/ui/display";
import { cn } from "@/lib/cn";
import { preAdmissions, type PreAdmissionStatus } from "@/demo/fixtures";
import { Filters, LIST_STATES, ListStateView } from "../../list-state";
import { preStatus } from "../../status";
import { AdminPageHeader } from "../../ui";

type Search = Promise<Record<string, string | string[] | undefined>>;
const FILTERS = ["todas", "recibida", "en-revision", "invitada", "cerrada"] as const;

export default async function PreadmisionesPage({ searchParams }: { searchParams: Search }) {
  assertDemo();
  await requireAdmin();
  const state = await readState(searchParams, LIST_STATES);
  const filter = await readState(searchParams, FILTERS, "filtro");
  const rows = filter === "todas" ? preAdmissions : preAdmissions.filter((p) => p.status === filter);

  return (
    <>
      <AdminPageHeader title="Preadmisiones" description="Solicitudes recibidas desde el formulario público. Revisalas e invitá al alta formal a quien corresponda." />
      <Filters>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "todas" ? "/admin/preadmisiones" : `/admin/preadmisiones?filtro=${f}`}
            aria-current={f === filter ? "true" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center !rounded-full border px-3.5 text-small",
              f === filter ? "border-forest bg-forest !text-white" : "border-border-strong/50 !text-foreground hover:border-forest",
            )}
          >
            {f === "todas" ? "Todas" : preStatus[f as PreAdmissionStatus].label}
          </Link>
        ))}
      </Filters>
      <ListStateView state={rows.length ? state : "empty"} emptyTitle="No hay preadmisiones" emptyDescription="Cuando alguien complete el formulario de Sumate, aparece acá.">
        <DataList
          caption="Preadmisiones"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/preadmisiones/${r.id}`}
          columns={[
            { key: "name", header: "Nombre", primary: true, render: (r) => r.name },
            { key: "ref", header: "Referencia", render: (r) => <span className="font-mono text-[13px]">{r.reference}</span> },
            { key: "loc", header: "Provincia", render: (r) => r.province },
            { key: "date", header: "Fecha", render: (r) => r.date },
            { key: "status", header: "Estado", render: (r) => <StatusBadge tone={preStatus[r.status].tone}>{preStatus[r.status].label}</StatusBadge> },
          ]}
        />
      </ListStateView>
      <DevStateBar path="/admin/preadmisiones" states={LIST_STATES} current={state} keep={{ filtro: filter === "todas" ? undefined : filter }} label="Lista" />
    </>
  );
}
