import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { assertDemo } from "@/lib/demo";
import { DetailList } from "@/components/ui/data-list";
import { Card } from "@/components/ui/display";
import { preAdmissions } from "@/demo/fixtures";
import { AdminPageHeader } from "../../../ui";
import PreAdmissionActions from "./actions-panel";

export default async function PreadmisionPage({ params }: { params: Promise<{ id: string }> }) {
  assertDemo();
  await requireAdmin();
  const { id } = await params;
  const pre = preAdmissions.find((p) => p.id === id);
  if (!pre) notFound();

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/preadmisiones", label: "Preadmisiones" }} eyebrow={pre.reference} title={pre.name} description={`Recibida el ${pre.date}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <h2 className="text-h3">Contacto</h2>
            <DetailList
              items={[
                { label: "Email", value: pre.email },
                { label: "Teléfono", value: pre.phone },
                { label: "Provincia", value: pre.province },
                { label: "Localidad", value: pre.locality },
              ]}
            />
          </Card>
          <Card className="space-y-5">
            <h2 className="text-h3">Intereses</h2>
            <ul className="list-disc space-y-1 pl-5 text-base">
              {pre.interests.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <DetailList
              items={[
                { label: "REPROCANN", value: pre.reprocann },
                { label: "Participación", value: pre.participation },
              ]}
            />
          </Card>
        </div>
        <PreAdmissionActions reference={pre.reference} email={pre.email} initialStatus={pre.status} />
      </div>
    </>
  );
}
