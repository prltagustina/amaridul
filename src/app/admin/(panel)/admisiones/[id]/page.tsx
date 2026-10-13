import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { getKeyrings } from "@/server/crypto";
import { getAdmission } from "@/server/admissions";
import { latestDecision, memberOfAdmission } from "@/server/members";
import { DetailList } from "@/components/ui/data-list";
import { Card } from "@/components/ui/display";
import { AdminPageHeader } from "../../../ui";
import AdmissionReview from "./review";

const dateTime = new Intl.DateTimeFormat("es-AR", { dateStyle: "long", timeStyle: "short", hourCycle: "h23", timeZone: "America/Argentina/Buenos_Aires" });
const yes = (b: boolean) => (b ? "Sí" : "No");

export default async function AdmisionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const adm = await getAdmission(db, getKeyrings(), id);
  if (!adm) notFound();
  const [lastDecision, member] = await Promise.all([latestDecision(db, adm.id), memberOfAdmission(db, adm.id)]);

  const sections: { id: string; title: string; items: { label: string; value: string }[] }[] = [
    {
      id: "A",
      title: "Datos personales",
      items: [
        { label: "Nombre", value: adm.fullName },
        { label: "DNI", value: adm.dniMasked },
        { label: "Fecha de nacimiento", value: adm.birthDate ? adm.birthDate.split("-").reverse().join("/") : "—" },
        { label: "Nacionalidad", value: adm.nationality ?? "—" },
        { label: "Domicilio", value: adm.address },
      ],
    },
    {
      id: "B",
      title: "Contacto",
      items: [
        { label: "Email", value: adm.email ?? "—" },
        { label: "Teléfono", value: adm.phone ?? "—" },
        { label: "Email para notificaciones", value: adm.notificationEmail ?? "El mismo" },
      ],
    },
    {
      id: "C",
      title: "Solicitud asociativa",
      items: [
        { label: "Categoría solicitada", value: adm.category },
        { label: "Por qué quiere asociarse", value: adm.interest || "—" },
        ...(adm.patient
          ? [
              { label: "Acompañamiento", value: yes(adm.patient.acompanamiento) },
              { label: "REPROCANN", value: adm.patient.reprocann },
              { label: "Toma de conocimiento", value: yes(adm.patient.informado) },
            ]
          : []),
      ],
    },
    { id: "D", title: "Acreditación de identidad", items: [{ label: "Método", value: "Pendiente de definición institucional" }] },
    { id: "E", title: "Estatuto y reglamentos", items: [{ label: "Aceptación", value: `Aceptado (versión ${adm.statuteVersion})` }] },
    { id: "F", title: "Cuota social", items: [{ label: "Toma de conocimiento", value: "Informada" }] },
    { id: "G", title: "Declaraciones", items: [{ label: "Veracidad y cambios", value: "Declaradas" }] },
    { id: "H", title: "Protección de datos", items: [{ label: "Tratamiento", value: "Aceptado" }, { label: "Novedades", value: yes(adm.newsOptIn) }] },
  ];

  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/admisiones", label: "Admisiones" }}
        eyebrow={`${adm.reference} · preadmisión ${adm.preReference}`}
        title={adm.fullName}
        description={`Enviada el ${dateTime.format(adm.submittedAt)}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {sections.map((sec) => (
            <Card key={sec.id} className="space-y-4">
              <h2 className="flex items-center gap-2.5 text-h3">
                <span className="flex size-7 items-center justify-center !rounded-full bg-forest text-xs font-medium text-white">{sec.id}</span>
                {sec.title}
              </h2>
              <DetailList items={sec.items} />
            </Card>
          ))}
        </div>
        <AdmissionReview
          id={adm.id}
          reference={adm.reference}
          fullName={adm.fullName}
          status={adm.status}
          requestedCategory={adm.categoryValue}
          lastDecision={lastDecision}
          member={member}
        />
      </div>
    </>
  );
}
