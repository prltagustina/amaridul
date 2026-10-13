import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { admissions } from "@/demo/fixtures";
import { AdminPageHeader } from "../../../ui";
import AdmissionReview from "./review";

export default async function AdmisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { id } = await params;
  const adm = admissions.find((a) => a.id === id);
  if (!adm) notFound();
  const openDecision = (await searchParams).dialogo === "decision";

  return (
    <>
      <AdminPageHeader back={{ href: "/admin/admisiones", label: "Admisiones" }} eyebrow={`${adm.reference} · preadmisión ${adm.preReference}`} title={adm.name} description={`Iniciada el ${adm.date}`} />
      <AdmissionReview key={String(openDecision)} admission={adm} openDecision={openDecision} />
    </>
  );
}
