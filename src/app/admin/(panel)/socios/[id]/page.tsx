import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { assertDemo } from "@/lib/demo";
import { DetailList } from "@/components/ui/data-list";
import { Card } from "@/components/ui/display";
import { members } from "@/demo/fixtures";
import { AdminPageHeader } from "../../../ui";
import MemberActions from "./member-actions";

export default async function SocioPage({ params }: { params: Promise<{ id: string }> }) {
  assertDemo();
  await requireAdmin();
  const { id } = await params;
  const m = members.find((x) => x.id === id);
  if (!m) notFound();

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/socios", label: "Socios" }} eyebrow={`Socio ${m.number}`} title={m.name} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="text-h3">Datos asociativos</h2>
            <DetailList
              items={[
                { label: "Número de socio", value: m.number },
                { label: "Categoría", value: m.category },
                { label: "Socio desde", value: m.since },
                { label: "Email", value: m.email },
                { label: "DNI", value: "Protegido · se muestra solo al verificar identidad" },
                { label: "Admisión", value: "Aprobada por Comisión Directiva" },
              ]}
            />
          </Card>
          <Card className="space-y-5">
            <h2 className="text-h3">Estado de trámites</h2>
            <DetailList
              items={[
                { label: "Circuito sanitario", value: m.health },
                { label: "Dispensa", value: m.dispense },
              ]}
            />
            <p className="text-small text-text-muted">El panel muestra solo el estado del trámite. La información médica no se ve desde la administración general.</p>
          </Card>
        </div>
        <MemberActions initialStatus={m.status} web={m.web} />
      </div>
    </>
  );
}
