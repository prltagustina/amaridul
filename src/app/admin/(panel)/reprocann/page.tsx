import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { FileUp } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { documentKindLabel, documentsToReview } from "@/server/reprocann-files";
import { pendingLinkages } from "@/server/reprocann-link";
import { DataList } from "@/components/ui/data-list";
import { ListStateView } from "../../list-state";
import { AdminPageHeader } from "../../ui";

const stamp = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const day = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");

export default async function CredencialesPage() {
  await requireAdmin();
  const db = await getDb();
  const [rows, linkages] = await Promise.all([documentsToReview(db), pendingLinkages(db)]);
  return (
    <>
      <AdminPageHeader
        title="Credenciales REPROCANN"
        description="Documentación con archivo que nadie revisó todavía, la más antigua primero: la que enviaron los socios desde su cuenta y la que cargó la asociación. La revisión se hace en la ficha de cada socio; verificarla no habilita la dispensa."
        actions={
          <LinkButton href="/admin/reprocann/importar" shape="admin" variant="secondary">
            <FileUp aria-hidden className="size-4" strokeWidth={1.5} /> Importar credenciales recibidas
          </LinkButton>
        }
      />
      <ListStateView state={rows.length ? "default" : "empty"} emptyTitle="No hay documentación para revisar" emptyDescription="Cuando un socio cargue su credencial desde su cuenta, o la asociación cargue una que recibió, aparece acá.">
        <DataList
          caption="Documentación para revisar"
          rows={rows}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/socios/${r.memberId}#reprocann`}
          columns={[
            { key: "name", header: "Socio", primary: true, render: (r) => r.name },
            { key: "number", header: "N.º", render: (r) => (r.memberNumber ? <span className="font-mono text-[13px]">{r.memberNumber}</span> : <span className="text-text-muted">A confirmar</span>) },
            { key: "kind", header: "Documento", render: (r) => documentKindLabel(r.kind) },
            { key: "origin", header: "Origen", render: (r) => (r.source === "aportado_por_socio" ? "El socio, desde su cuenta" : "La asociación") },
            { key: "expires", header: "Vencimiento sin verificar", render: (r) => day(r.expiresOn) },
            { key: "sent", header: "Recibido", render: (r) => stamp.format(r.createdAt) },
          ]}
        />
      </ListStateView>

      <section aria-labelledby="vinculaciones" className="mt-10 space-y-3">
        <div className="space-y-1">
          <h2 id="vinculaciones" className="text-h3 text-forest">
            Vinculaciones para hacer en REPROCANN
          </h2>
          <p className="text-small text-text-muted">Socios que ya pasaron su código de vinculación. Hacé la vinculación en REPROCANN y marcala «verificada» en su ficha: ellos lo ven en su espacio.</p>
        </div>
        <ListStateView state={linkages.length ? "default" : "empty"} emptyTitle="No hay vinculaciones pendientes" emptyDescription="Cuando un socio envíe su código de vinculación desde su espacio, o lo cargues en su ficha, aparece acá.">
          <DataList
            caption="Vinculaciones para hacer en REPROCANN"
            rows={linkages}
            rowKey={(r) => r.memberId}
            rowHref={(r) => `/admin/socios/${r.memberId}#reprocann`}
            columns={[
              { key: "name", header: "Socio", primary: true, render: (r) => (r.lastNames && r.firstNames ? `${r.lastNames}, ${r.firstNames}` : r.name) },
              { key: "number", header: "N.º", render: (r) => (r.number ? <span className="font-mono text-[13px]">{r.number}</span> : <span className="text-text-muted">A confirmar</span>) },
              { key: "sent", header: "Código recibido", render: (r) => (r.sentAt ? stamp.format(r.sentAt) : "—") },
            ]}
          />
        </ListStateView>
      </section>
    </>
  );
}
