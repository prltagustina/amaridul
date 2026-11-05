import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { AdminPageHeader } from "../../ui";
import { AdminSearch } from "./admin-search";

export const metadata: Metadata = { title: "Buscar | Administración | Amarí Dul" };

export default async function BuscarPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader title="Buscar en el panel" description="Socios, trámites REPROCANN, preadmisiones, admisiones, solicitudes de socios existentes y productos, en un solo lugar. Cada sección conserva sus propios filtros." />
      <AdminSearch />
    </>
  );
}
