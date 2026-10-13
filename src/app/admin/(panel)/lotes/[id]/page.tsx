import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth/session";
import { lots } from "@/demo/fixtures";
import { AdminPageHeader } from "../../../ui";
import LotEditor from "./lot-editor";

export default async function LotePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
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
