import { requireAdmin } from "@/server/auth/session";
import { uploadMode } from "@/server/storage";
import { AdminPageHeader } from "../../../ui";
import { ImportTool } from "./import-tool";

export default async function ImportarCredencialesPage() {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        back={{ href: "/admin/reprocann", label: "Credenciales REPROCANN" }}
        title="Importar credenciales recibidas"
        description="Para cargar de una vez credenciales que la asociación ya tiene. Primero se revisa sin cargar nada: qué archivo corresponde a qué socio según el DNI del padrón, qué ya existe y qué hay que revisar. Lo importado queda pendiente de revisión."
      />
      <ImportTool mode={uploadMode()} />
    </>
  );
}
