import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { traceabilityPrototype } from "@/lib/features";
import { InDevelopment } from "../../../in-development";
import { lots } from "@/demo/fixtures";
import { AdminPageHeader } from "../../../ui";
import LotEditor from "./lot-editor";

export default async function LotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  if (!traceabilityPrototype())
    return <InDevelopment title="Lotes" purpose="Los lotes de producción, con su análisis y certificado, y a qué socio se entregó cada uno." planned={["Cargar cada lote con su producto, variedad, fechas de cultivo y elaboración", "Adjuntar el análisis de laboratorio y el certificado en forma privada", "Registrar las entregas a cada socio, para que vea solo los lotes que recibió"]} />;
  const { id } = await params;
  const lot = id === "nuevo" ? null : lots.find((l) => l.code.toLowerCase() === id);
  if (lot === undefined) notFound();
  return (
    <>
      <AdminPageHeader back={{ href: "/admin/lotes", label: "Lotes" }} eyebrow={lot ? "Editar lote" : "Nuevo lote"} title={lot ? lot.code : "Nuevo lote"} />
      <LotEditor initial={lot} />
    </>
  );
}
