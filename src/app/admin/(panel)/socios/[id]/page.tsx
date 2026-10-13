import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getMember } from "@/server/members";
import { DetailList } from "@/components/ui/data-list";
import { Card, StatusBadge } from "@/components/ui/display";
import { memberStatus } from "../../../status";
import { AdminPageHeader } from "../../../ui";
import ResendActivation from "./resend-activation";

export default async function SocioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const m = await getMember(await getDb(), getKeyrings(), id);
  if (!m) notFound();
  const pending = m.accountStatus === "pending_activation";

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/socios", label: "Socios" }} eyebrow={`Socio ${m.memberNumber}`} title={m.name} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="space-y-5">
          <h2 className="text-h3">Datos asociativos</h2>
          <DetailList
            items={[
              { label: "Número de socio", value: m.memberNumber },
              { label: "Categoría", value: m.categoryLabel },
              { label: "Socio desde", value: m.since.split("-").reverse().join("/") },
              { label: "DNI", value: m.dniMasked },
              { label: "Email", value: m.email ?? "—" },
              { label: "Teléfono", value: m.phone ?? "—" },
              {
                label: "Admisión",
                value: (
                  <Link href={`/admin/admisiones/${m.admissionId}`} className="!text-forest underline underline-offset-2">
                    {m.admissionReference}
                  </Link>
                ),
              },
            ]}
          />
        </Card>
        <aside className="order-first space-y-6 lg:order-none" aria-label="Cuenta">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3">Estado</h2>
              <StatusBadge tone={memberStatus[m.status].tone}>{memberStatus[m.status].label}</StatusBadge>
            </div>
            <p className="text-small text-text-muted">
              Cuenta web: {pending ? "activación pendiente. La persona todavía no creó su contraseña." : m.accountStatus === "active" ? "activa. Ingresa con su DNI." : "deshabilitada."}
            </p>
            {pending && <ResendActivation memberId={m.id} />}
          </Card>
        </aside>
      </div>
    </>
  );
}
